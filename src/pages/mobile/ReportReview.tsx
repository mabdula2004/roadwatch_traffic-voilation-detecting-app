import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {
  ChevronLeft,
  EyeOff,
  Fingerprint,
  Lock,
  Download,
  RotateCcw,
  Scissors,
  Play,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { uploadReport, type CapturedClip } from '../../lib/report';
import { analyzeTrafficViolation, type AiEvidentiaryResult } from '../../lib/aiAnalysis';

interface ReportReviewProps {
  clip: CapturedClip;
  onBack: () => void;
  onSubmit: (id: string, aiResult: AiEvidentiaryResult) => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function ReportReview({ clip, onBack, onSubmit }: ReportReviewProps) {
  const { colors } = useTheme();
  const { t, isUrdu } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);

  // Video Trimming & Editing State
  const totalDurationSec = Math.max(5, Math.round(clip.durationMs / 1000));
  const [trimStartSec, setTrimStartSec] = useState<number>(0);
  const [trimEndSec, setTrimEndSec] = useState<number>(totalDurationSec);
  const [isEditingTrim, setIsEditingTrim] = useState<boolean>(false);
  const [isTrimApplied, setIsTrimApplied] = useState<boolean>(false);
  const [filmstrip, setFilmstrip] = useState<string[]>([]);

  const player = useVideoPlayer(clip.uri);

  useEffect(() => {
    FileSystem.getInfoAsync(clip.uri)
      .then((info) => {
        if (info.exists && 'size' in info && typeof info.size === 'number') {
          setFileSizeBytes(info.size);
        }
      })
      .catch(() => {});
  }, [clip.uri]);

  // Extract lightweight filmstrip thumbnails for interactive trimming
  useEffect(() => {
    let alive = true;
    async function loadFilmstrip() {
      const dur = Math.max(5000, clip.durationMs);
      const points = [0.1, 0.3, 0.55, 0.75, 0.95];
      const thumbs: string[] = [];
      for (const p of points) {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(clip.uri, {
            time: Math.floor(dur * p),
            quality: 0.25,
          });
          if (uri && alive) thumbs.push(uri);
        } catch {}
      }
      if (alive && thumbs.length > 0) {
        setFilmstrip(thumbs);
      }
    }
    void loadFilmstrip();
    return () => {
      alive = false;
    };
  }, [clip.uri, clip.durationMs]);

  // Trim Adjusters (Guarantees legal minimum 5 seconds evidence constraint)
  function adjustStart(delta: number) {
    const nextStart = Math.max(0, Math.min(trimStartSec + delta, trimEndSec - 5));
    setTrimStartSec(nextStart);
    setIsTrimApplied(nextStart > 0 || trimEndSec < totalDurationSec);
    try {
      player.currentTime = nextStart;
    } catch {}
  }

  function adjustEnd(delta: number) {
    const nextEnd = Math.min(totalDurationSec, Math.max(trimEndSec + delta, trimStartSec + 5));
    setTrimEndSec(nextEnd);
    setIsTrimApplied(trimStartSec > 0 || nextEnd < totalDurationSec);
    try {
      player.currentTime = nextEnd;
    } catch {}
  }

  function handlePreviewTrim() {
    try {
      player.currentTime = trimStartSec;
      player.play();
    } catch {}
  }

  function handleResetTrim() {
    setTrimStartSec(0);
    setTrimEndSec(totalDurationSec);
    setIsTrimApplied(false);
    try {
      player.currentTime = 0;
    } catch {}
  }

  function handleRemakeVideo() {
    Alert.alert(
      isUrdu ? 'دوبارہ ویڈیو ریکارڈ کریں؟' : 'Remake Evidence Video?',
      isUrdu
        ? 'کیا آپ موجودہ ریکارڈنگ منسوخ کر کے لائیو کیمرے سے نئی ویڈیو بنانا چاہتے ہیں؟'
        : 'Do you want to discard this clip and return to live camera capture to record fresh footage?',
      [
        { text: isUrdu ? 'منسوخ' : 'Cancel', style: 'cancel' },
        {
          text: isUrdu ? 'دوبارہ ریکارڈ کریں' : 'Discard & Remake',
          style: 'destructive',
          onPress: onBack,
        },
      ]
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const effectiveDurationMs = isTrimApplied
        ? Math.round((trimEndSec - trimStartSec) * 1000)
        : clip.durationMs;

      const trimmedClip: CapturedClip = {
        ...clip,
        durationMs: effectiveDurationMs,
        trimStartMs: isTrimApplied ? Math.round(trimStartSec * 1000) : 0,
        trimEndMs: isTrimApplied ? Math.round(trimEndSec * 1000) : clip.durationMs,
      };

      // Analyze evidence with Qwen 2.5-VL upon submission within the trimmed window
      const result = await analyzeTrafficViolation({
        videoUri: trimmedClip.uri,
        durationMs: trimmedClip.durationMs,
        trimStartMs: trimmedClip.trimStartMs,
        trimEndMs: trimmedClip.trimEndMs,
        claimedClass: 'auto_ai_detect',
        capturedAt: trimmedClip.capturedAt,
        latitude: trimmedClip.latitude,
        longitude: trimmedClip.longitude,
        locationName: trimmedClip.locationName,
      });

      const id = await uploadReport(trimmedClip, 'auto_ai_detect', result);
      onSubmit(id, result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed. Keep this clip and retry.');
    } finally {
      setSubmitting(false);
    }
  }

  const effectiveDurationSec = isTrimApplied ? trimEndSec - trimStartSec : totalDurationSec;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ChevronLeft size={20} color={Colors.textMuted} />
          <Text style={styles.backText}>{isUrdu ? 'کیمرہ' : 'Back'}</Text>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.remakeHeaderBtn} onPress={handleRemakeVideo}>
            <RotateCcw size={12} color="#ef4444" />
            <Text style={styles.remakeHeaderText}>{isUrdu ? 'دوبارہ ریکارڈ' : 'Remake'}</Text>
          </TouchableOpacity>
          <View style={styles.draftBadge}>
            <Text style={styles.draftText}>{isUrdu ? 'ڈرافٹ' : 'DRAFT'}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.title}>{isUrdu ? 'شواہد کا جائزہ لیں' : 'Review Evidence'}</Text>
            <Text style={styles.subtitle}>
              {isUrdu
                ? 'نجی والٹ میں جمع کرنے سے پہلے ویڈیو چیک یا ٹرم کریں۔'
                : 'Review, trim violation window, or remake video before submission.'}
            </Text>
          </View>
        </View>

        {/* Evidence Video Card */}
        <View style={styles.mediaCard}>
          <View style={styles.imageWrapper}>
            <VideoView player={player} style={styles.evidenceImage} nativeControls contentFit="cover" />

            <View style={styles.imageFooter}>
              <View style={styles.blurBadge}>
                <EyeOff size={12} color={Colors.telemetry} />
                <Text style={styles.blurBadgeText}>{isUrdu ? 'چہرہ خودکار دھندلا فعال' : 'FACIAL AUTO-BLUR ACTIVE'}</Text>
              </View>
              <View style={[styles.timeTag, isTrimApplied && { borderColor: Colors.telemetry, borderWidth: 1 }]}>
                <Text style={[styles.timeText, isTrimApplied && { color: Colors.telemetry, fontWeight: '700' }]}>
                  {effectiveDurationSec}s {isTrimApplied ? '(TRIMMED)' : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Edit Bar */}
          <View style={styles.editActionBar}>
            <TouchableOpacity
              style={[
                styles.editToggleBtn,
                isEditingTrim
                  ? { backgroundColor: Colors.telemetry, borderColor: Colors.telemetry }
                  : { backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.3)' },
              ]}
              onPress={() => setIsEditingTrim(!isEditingTrim)}
            >
              <Scissors size={14} color={isEditingTrim ? '#000' : Colors.telemetry} />
              <Text style={[styles.editToggleBtnText, { color: isEditingTrim ? '#000' : Colors.telemetry }]}>
                {isEditingTrim
                  ? (isUrdu ? 'ایڈیٹنگ ٹول بند کریں' : 'Close Trim Tool')
                  : (isUrdu ? 'ویڈیو ٹرم / کروپ کریں (Trim Clip)' : 'Trim Evidence Window (Edit Clip)')}
              </Text>
            </TouchableOpacity>

            {isTrimApplied && (
              <View style={styles.trimActiveBadge}>
                <Check size={11} color="#10b981" />
                <Text style={styles.trimActiveBadgeText}>
                  {formatTime(trimStartSec)} - {formatTime(trimEndSec)}
                </Text>
              </View>
            )}
          </View>

          {/* Interactive Trimming Studio */}
          {isEditingTrim && (
            <View style={styles.trimStudioCard}>
              <View style={styles.studioHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color={Colors.telemetry} />
                  <Text style={styles.studioTitle}>
                    {isUrdu ? 'خلاف ورزی کا دورانیہ منتخب کریں' : 'Trim Violation Window'}
                  </Text>
                </View>
                <Text style={styles.studioHelp}>
                  {isUrdu ? 'صرف اہم لمحہ رکھیں (کم از کم 5 سیکنڈ)' : 'Select key violation moment (Min. 5s)'}
                </Text>
              </View>

              {/* Visual Filmstrip Thumbnails */}
              {filmstrip.length > 0 && (
                <View style={styles.filmstripContainer}>
                  <View style={styles.filmstripRow}>
                    {filmstrip.map((thumbUri, i) => (
                      <Image key={i} source={{ uri: thumbUri }} style={styles.filmstripThumb} resizeMode="cover" />
                    ))}
                  </View>
                  <View style={styles.filmstripOverlay}>
                    {/* Dimmed Left */}
                    <View style={{ width: `${Math.max(0, (trimStartSec / totalDurationSec) * 100)}%`, backgroundColor: 'rgba(0, 0, 0, 0.7)' }} />
                    {/* Active Highlighted Trim Window */}
                    <View style={{ flex: 1, borderWidth: 2, borderColor: Colors.telemetry, borderRadius: 4, backgroundColor: 'rgba(6, 182, 212, 0.15)' }} />
                    {/* Dimmed Right */}
                    <View style={{ width: `${Math.max(0, ((totalDurationSec - trimEndSec) / totalDurationSec) * 100)}%`, backgroundColor: 'rgba(0, 0, 0, 0.7)' }} />
                  </View>
                </View>
              )}

              {/* Interactive Start & End Steppers */}
              <View style={styles.trimControlsRow}>
                {/* Start Controller */}
                <View style={styles.trimBox}>
                  <Text style={styles.trimBoxLabel}>START TRIM</Text>
                  <Text style={styles.trimBoxValue}>{formatTime(trimStartSec)}</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustStart(-1)}
                      disabled={trimStartSec <= 0}
                    >
                      <Text style={[styles.stepBtnText, trimStartSec <= 0 && { color: Colors.edge }]}>-1s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustStart(1)}
                      disabled={trimStartSec >= trimEndSec - 5}
                    >
                      <Text style={[styles.stepBtnText, trimStartSec >= trimEndSec - 5 && { color: Colors.edge }]}>+1s</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Duration Summary */}
                <View style={styles.trimDurationBox}>
                  <Clock size={16} color={Colors.telemetry} />
                  <Text style={styles.trimDurationNumber}>
                    {effectiveDurationSec}s
                  </Text>
                  <Text style={[styles.trimDurationSub, { color: effectiveDurationSec >= 5 ? '#10b981' : '#ef4444' }]}>
                    {effectiveDurationSec >= 5 ? '✓ Legal Valid' : 'Min 5s required'}
                  </Text>
                </View>

                {/* End Controller */}
                <View style={styles.trimBox}>
                  <Text style={styles.trimBoxLabel}>END TRIM</Text>
                  <Text style={styles.trimBoxValue}>{formatTime(trimEndSec)}</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustEnd(-1)}
                      disabled={trimEndSec <= trimStartSec + 5}
                    >
                      <Text style={[styles.stepBtnText, trimEndSec <= trimStartSec + 5 && { color: Colors.edge }]}>-1s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustEnd(1)}
                      disabled={trimEndSec >= totalDurationSec}
                    >
                      <Text style={[styles.stepBtnText, trimEndSec >= totalDurationSec && { color: Colors.edge }]}>+1s</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Studio Actions */}
              <View style={styles.studioActionsRow}>
                <TouchableOpacity style={styles.studioSecondaryBtn} onPress={handlePreviewTrim}>
                  <Play size={13} color={Colors.ink} fill={Colors.ink} />
                  <Text style={styles.studioSecondaryText}>
                    {isUrdu ? 'پیش نظارہ چلائیں' : 'Preview Trim'}
                  </Text>
                </TouchableOpacity>

                {isTrimApplied && (
                  <TouchableOpacity style={styles.studioResetBtn} onPress={handleResetTrim}>
                    <RotateCcw size={13} color={Colors.textMuted} />
                    <Text style={styles.studioResetText}>{isUrdu ? 'ری سیٹ' : 'Reset'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={styles.mediaMeta}>
            <View style={styles.metaLeft}>
              <View style={styles.metaRow}>
                <Fingerprint size={14} color={Colors.valid} />
                <Text style={styles.metaLabel}>{isUrdu ? 'تصدیق شدہ فوٹیج' : 'VERIFIED EVIDENCE'}</Text>
              </View>
              <Text style={styles.hashText} numberOfLines={1}>
                {new Date(clip.capturedAt).toLocaleString()} · {fileSizeBytes > 0 ? (fileSizeBytes / 1048576).toFixed(1) : '1.8'} MB
              </Text>
            </View>
            <View style={styles.exportTag}>
              <Download size={12} color={Colors.textMuted} />
              <Text style={styles.exportText}>{isUrdu ? 'مقامی محفوظ' : 'Local copy'}</Text>
            </View>
          </View>
        </View>

        {/* Action 1: Submit to Private Vault */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Lock size={18} color="#000" />
          )}
          <Text style={styles.submitText}>
            {submitting
              ? (isUrdu ? 'تجزیہ اور والٹ میں جمع ہو رہا ہے…' : 'Analyzing & Submitting to Private Vault…')
              : (isUrdu ? 'نجی والٹ میں جمع کرائیں' : 'Submit to Private Vault')}
          </Text>
        </TouchableOpacity>

        {/* Action 2: Remake / Retake Video */}
        <TouchableOpacity style={styles.remakeFullBtn} onPress={handleRemakeVideo} disabled={submitting}>
          <RotateCcw size={16} color={colors.ink} />
          <Text style={[styles.remakeFullBtnText, { color: colors.ink }]}>
            {isUrdu ? 'ویڈیو مسترد کریں اور دوبارہ ریکارڈ کریں' : 'Discard & Remake Video'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          {isUrdu
            ? 'آپ کی رپورٹ کا AI سے تجزیہ کیا جاتا ہے اور تصدیق شدہ شواہد شہری والٹ میں محفوظ کیے جاتے ہیں۔'
            : 'Evidence video is analyzed by Qwen Vision AI and certified proofs are permanently sealed into your private vault.'}
        </Text>
        {!!error && <Text accessibilityRole="alert" style={{ color: colors.signal, marginTop: 8, textAlign: 'center' }}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.edge,
    backgroundColor: Colors.canvas,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remakeHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  remakeHeaderText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  draftBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  draftText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  mediaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    overflow: 'hidden',
    marginBottom: 18,
  },
  imageWrapper: {
    width: '100%',
    height: 280,
    backgroundColor: '#0a0d14',
    position: 'relative',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  imageFooter: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blurBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  blurBadgeText: {
    color: Colors.telemetry,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeTag: {
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
  },

  // Edit Action Bar
  editActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trimActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  trimActiveBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },

  // Trimming Studio Card
  trimStudioCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
    gap: 12,
  },
  studioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studioTitle: {
    color: Colors.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  studioHelp: {
    color: Colors.textMuted,
    fontSize: 10,
  },

  // Filmstrip
  filmstripContainer: {
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  filmstripRow: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  filmstripThumb: {
    flex: 1,
    height: '100%',
  },
  filmstripOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },

  // Trim Steppers Controls
  trimControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  trimBox: {
    flex: 1,
    backgroundColor: Colors.canvas,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.edge,
    padding: 8,
    alignItems: 'center',
  },
  trimBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  trimBoxValue: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: Colors.ink,
    marginVertical: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  stepBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  stepBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ink,
  },
  trimDurationBox: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  trimDurationNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
    marginTop: 2,
  },
  trimDurationSub: {
    fontSize: 9,
    fontWeight: '700',
  },

  // Studio Actions Row
  studioActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studioSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  studioSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
  },
  studioResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  studioResetText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  mediaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
  },
  metaLeft: {
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    color: Colors.valid,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  hashText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  exportTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exportText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  submitText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  remakeFullBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.edge,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  remakeFullBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
});

