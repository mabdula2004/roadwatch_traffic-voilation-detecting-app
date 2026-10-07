import { useTheme } from '../../contexts/ThemeContext';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronLeft, EyeOff, Fingerprint, Lock, Play, Download, Car, ScanLine, MapPin } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { VideoView, useVideoPlayer } from 'expo-video';
import { File } from 'expo-file-system';
import { uploadReport, type CapturedClip } from '../../lib/report';

interface ReportReviewProps {
  clip: CapturedClip;
  onBack: () => void;
  onSubmit: (id: string) => void;
}

const classes = [
  ['red_light_running', 'Red light'], ['wrong_way_driving', 'Wrong way'],
  ['no_plate', 'No plate'], ['phone_use_while_driving', 'Phone use'],
  ['footpath_driving', 'Footpath driving'], ['overloading', 'Overloading'],
  ['helmet_violation', 'No helmet'], ['blocking_crossing', 'Crossing blocked'],
] as const;

export function ReportReview({ clip, onBack, onSubmit }: ReportReviewProps) {
  const { colors, resolvedTheme } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [claimedClass, setClaimedClass] = useState<string>(classes[0][0]);
  const [error, setError] = useState('');
  const player = useVideoPlayer(clip.uri);
  const file = new File(clip.uri);
  const aiRows = [
    { label: 'Detected plate', value: 'Awaiting analysis', Icon: ScanLine, isTelemetry: true },
    { label: 'Vehicle match', value: 'Awaiting analysis', Icon: Car, isTelemetry: true },
    { label: 'Location', value: `${clip.latitude.toFixed(5)}, ${clip.longitude.toFixed(5)}`, Icon: MapPin, isTelemetry: false },
  ];

  async function handleSubmit() {
    setSubmitting(true); setError('');
    try { onSubmit(await uploadReport(clip, claimedClass)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Upload failed. Keep this clip and retry.'); }
    finally { setSubmitting(false); }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ChevronLeft size={20} color={Colors.textMuted} />
          <Text style={styles.backText}>Back to Live Camera</Text>
        </TouchableOpacity>
        <View style={styles.draftBadge}>
          <Text style={styles.draftText}>DRAFT</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Review evidence</Text>
        <Text style={styles.subtitle}>
          Review your recorded video before uploading it to the private vault.
        </Text>

        {/* Evidence Card */}
        <View style={styles.mediaCard}>
          <View style={styles.imageWrapper}>
            <VideoView player={player} style={styles.evidenceImage} nativeControls contentFit="cover" />

            <View style={styles.imageFooter}>
              <View style={styles.blurBadge}>
                <EyeOff size={12} color={Colors.telemetry} />
                <Text style={styles.blurBadgeText}>FACIAL AUTO-BLUR ACTIVE</Text>
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
                <Text style={styles.metaLabel}>RECORDED VIDEO</Text>
              </View>
              <Text style={styles.hashText} numberOfLines={1}>
                {new Date(clip.capturedAt).toLocaleString()} · {(file.size / 1048576).toFixed(1)} MB
              </Text>
            </View>
            <View style={styles.exportTag}>
              <Download size={12} color={Colors.textMuted} />
              <Text style={styles.exportText}>Local draft</Text>
            </View>
          </View>
        </View>

        {/* AI Analysis */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Text style={styles.aiTitle}>AI analysis</Text>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>Pending</Text>
            </View>
          </View>

          <View style={styles.aiList}>
            {aiRows.map(({ label, value, Icon, isTelemetry }) => (
              <View key={label} style={styles.aiRow}>
                <View style={styles.aiLabelGroup}>
                  <Icon size={16} color={isTelemetry ? Colors.telemetry : Colors.textMuted} />
                  <Text style={styles.aiLabel}>{label}</Text>
                </View>
                <Text style={styles.aiValue}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.violationTag}>
            <Text style={styles.violationLabel}>WHAT DID YOU SEE? · YOUR CLAIM</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {classes.map(([value, label]) => <TouchableOpacity key={value} onPress={() => setClaimedClass(value)} style={{ padding: 8, borderRadius: 8, borderWidth: 1, borderColor: claimedClass === value ? colors.telemetry : colors.edge }}><Text style={{ color: colors.ink, fontSize: 11 }}>{label}</Text></TouchableOpacity>)}
            </View>
          </View>
        </View>

        {/* Submit Action */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Lock size={18} color="#000" />
          <Text style={styles.submitText}>
            {submitting ? 'Uploading evidence…' : 'Submit to Private Vault'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Your selection is a claim. AI verdict, face blurring and government enforcement are not active yet.
        </Text>
        {!!error && <Text accessibilityRole="alert" style={{ color: colors.signal, marginTop: 8 }}>{error}</Text>}
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
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  mediaCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.2)',
  },
  playButton: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyBlur: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.5)',
  },
  imageFooter: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blurBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blurBadgeText: {
    color: Colors.telemetry,
    fontSize: 10,
    fontWeight: '800',
  },
  timeTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  mediaMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
  },
  metaLeft: {
    flex: 1,
    marginRight: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  hashText: {
    fontSize: 11,
    color: Colors.text,
    marginTop: 2,
  },
  exportTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.edge,
    backgroundColor: Colors.canvas,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  exportText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  aiCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    backgroundColor: Colors.surface,
    padding: 16,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  confidenceText: {
    color: Colors.telemetry,
    fontSize: 11,
    fontWeight: '700',
  },
  aiList: {
    marginTop: 14,
    gap: 12,
  },
  aiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  aiValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  violationTag: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
  },
  violationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.signal,
    letterSpacing: 0.5,
  },
  violationValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 10,
  },
});
