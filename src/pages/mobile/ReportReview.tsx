import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronLeft, EyeOff, Fingerprint, Lock, Download } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadReport, type CapturedClip } from '../../lib/report';
import { analyzeTrafficViolation, type AiEvidentiaryResult } from '../../lib/aiAnalysis';

interface ReportReviewProps {
  clip: CapturedClip;
  onBack: () => void;
  onSubmit: (id: string, aiResult: AiEvidentiaryResult) => void;
}

export function ReportReview({ clip, onBack, onSubmit }: ReportReviewProps) {
  const { colors } = useTheme();
  const { t, isUrdu } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);

  const player = useVideoPlayer(clip.uri);

  React.useEffect(() => {
    FileSystem.getInfoAsync(clip.uri).then(info => {
      if (info.exists && 'size' in info && typeof info.size === 'number') {
        setFileSizeBytes(info.size);
      }
    }).catch(() => {});
  }, [clip.uri]);

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      // Analyze evidence with Qwen 2.5-VL upon submission
      const result = await analyzeTrafficViolation({
        videoUri: clip.uri,
        durationMs: clip.durationMs,
        claimedClass: 'auto_ai_detect',
        capturedAt: clip.capturedAt,
        latitude: clip.latitude,
        longitude: clip.longitude,
        locationName: clip.locationName,
      });

      const id = await uploadReport(clip, 'auto_ai_detect', result);
      onSubmit(id, result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed. Keep this clip and retry.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ChevronLeft size={20} color={Colors.textMuted} />
          <Text style={styles.backText}>{isUrdu ? 'کیمرہ پر واپس جائیں' : 'Back to Live Camera'}</Text>
        </TouchableOpacity>
        <View style={styles.draftBadge}>
          <Text style={styles.draftText}>{isUrdu ? 'ڈرافٹ' : 'DRAFT'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{isUrdu ? 'شواہد کا جائزہ لیں' : 'Review evidence'}</Text>
        <Text style={styles.subtitle}>
          {isUrdu ? 'نجی والٹ میں محفوظ کرنے سے پہلے ریکارڈ شدہ ویڈیو چیک کریں۔' : 'Review your recorded video before uploading it to the private vault.'}
        </Text>

        {/* Evidence Video Card */}
        <View style={styles.mediaCard}>
          <View style={styles.imageWrapper}>
            <VideoView player={player} style={styles.evidenceImage} nativeControls contentFit="cover" />

            <View style={styles.imageFooter}>
              <View style={styles.blurBadge}>
                <EyeOff size={12} color={Colors.telemetry} />
                <Text style={styles.blurBadgeText}>{isUrdu ? 'چہرہ خودکار دھندلا فعال' : 'FACIAL AUTO-BLUR ACTIVE'}</Text>
              </View>
              <View style={styles.timeTag}>
                <Text style={styles.timeText}>{Math.round(clip.durationMs / 1000)}s</Text>
              </View>
            </View>
          </View>

          <View style={styles.mediaMeta}>
            <View style={styles.metaLeft}>
              <View style={styles.metaRow}>
                <Fingerprint size={14} color={Colors.valid} />
                <Text style={styles.metaLabel}>{isUrdu ? 'ریکارڈ شدہ ویڈیو' : 'RECORDED VIDEO'}</Text>
              </View>
              <Text style={styles.hashText} numberOfLines={1}>
                {new Date(clip.capturedAt).toLocaleString()} · {fileSizeBytes > 0 ? (fileSizeBytes / 1048576).toFixed(1) : '1.8'} MB
              </Text>
            </View>
            <View style={styles.exportTag}>
              <Download size={12} color={Colors.textMuted} />
              <Text style={styles.exportText}>{isUrdu ? 'مقامی ڈرافٹ' : 'Local draft'}</Text>
            </View>
          </View>
        </View>

        {/* Submit Action */}
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

        <Text style={styles.footerNote}>
          {isUrdu ? 'آپ کی رپورٹ کا خودکار مصنوعی ذہانت (AI) سے تجزیہ کیا جاتا ہے اور شواہد والٹ میں محفوظ کیا جاتا ہے۔' : 'Your report is analyzed by AI and securely registered in your civic Evidence Vault.'}
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
    marginBottom: 20,
  },
  mediaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    overflow: 'hidden',
    marginBottom: 24,
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
    marginBottom: 12,
  },
  submitText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
});
