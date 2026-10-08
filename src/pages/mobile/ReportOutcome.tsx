import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Car,
  MapPin,
  Clock,
  HardDrive,
  Camera,
  Eye,
  Hash,
  Scale,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/theme';
import { AiEvidentiaryResult } from '../../lib/aiAnalysis';
import { CapturedClip } from '../../lib/report';

interface ReportOutcomeProps {
  clip: CapturedClip;
  aiResult: AiEvidentiaryResult;
  onGoToVault: () => void;
  onRecordAnother: () => void;
}

export function ReportOutcome({
  clip,
  aiResult,
  onGoToVault,
  onRecordAnother,
}: ReportOutcomeProps) {
  const { colors } = useTheme();

  const isFined = aiResult.status === 'fined';
  const isPlateBlurred = aiResult.status === 'rejected_plate_blurred';
  const isVehicleTooFar = aiResult.status === 'rejected_vehicle_too_far';
  const isLowClarity = aiResult.status === 'auto_rejected_low_clarity';

  const statusBg = isFined
    ? 'rgba(16, 185, 129, 0.12)'
    : isPlateBlurred || isVehicleTooFar || isLowClarity
    ? 'rgba(245, 158, 11, 0.12)'
    : 'rgba(59, 130, 246, 0.12)';

  const statusBorder = isFined
    ? '#10b981'
    : isPlateBlurred || isVehicleTooFar || isLowClarity
    ? '#f59e0b'
    : '#3b82f6';

  const statusTextColor = isFined
    ? '#10b981'
    : isPlateBlurred || isVehicleTooFar || isLowClarity
    ? '#f59e0b'
    : '#3b82f6';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.edge }]}>
        <View>
          <Text style={[styles.headerPre, { color: colors.telemetry }]}>POC EVIDENTIARY AUDIT §15</Text>
          <Text style={[styles.headerTitle, { color: colors.ink }]}>Case Verification Result</Text>
        </View>
        <View style={[styles.badgePill, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          <Text style={[styles.badgeText, { color: colors.muted }]}>{aiResult.caseId}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Outcome Main Banner */}
        <View style={[styles.outcomeBanner, { backgroundColor: statusBg, borderColor: statusBorder }]}>
          <View style={styles.bannerRow}>
            {isFined ? (
              <CheckCircle2 size={24} color="#10b981" />
            ) : isPlateBlurred || isVehicleTooFar || isLowClarity ? (
              <ShieldAlert size={24} color="#f59e0b" />
            ) : (
              <AlertCircle size={24} color="#3b82f6" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: statusTextColor }]}>
                {aiResult.statusLabel.toUpperCase()}
              </Text>
              <Text style={[styles.bannerSubtitle, { color: colors.ink }]}>
                {isFined
                  ? `Automated citation sealed for ${aiResult.violationName}.`
                  : isPlateBlurred
                  ? 'Violation cannot be fined because license plate is blurred or illegible.'
                  : isVehicleTooFar
                  ? 'Target vehicle is too far away for legal verification.'
                  : isLowClarity
                  ? 'Video footage clarity is too low (< 50%) for citation.'
                  : 'No actionable traffic violation detected.'}
              </Text>
            </View>
          </View>

          {isFined && (
            <View style={[styles.fineBox, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
              <View>
                <Text style={[styles.fineLabel, { color: colors.muted }]}>MANDATED CITATION FINE</Text>
                <Text style={[styles.fineValue, { color: colors.ink }]}>PKR {aiResult.fineAmountPkr.toLocaleString()}</Text>
              </View>
              <View style={[styles.enforcePill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Scale size={14} color="#10b981" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>SEALED</Text>
              </View>
            </View>
          )}
        </View>

        {/* 4 POC Evidentiary Metrics */}
        <Text style={[styles.sectionHeading, { color: colors.muted }]}>EVIDENTIARY THRESHOLDS (POC PRD)</Text>
        <View style={styles.metricsGrid}>
          {/* Metric 1: Violation */}
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>VIOLATION</Text>
            <Text style={[styles.metricValue, { color: aiResult.violationDetected ? '#10b981' : colors.muted }]}>
              {aiResult.violationDetected ? 'YES' : 'NO'}
            </Text>
          </View>

          {/* Metric 2: Plate Status */}
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>PLATE STATUS</Text>
            <Text style={[styles.metricValue, { color: aiResult.plateStatus === 'clear' ? '#10b981' : '#f59e0b' }]}>
              {aiResult.plateStatus.toUpperCase()}
            </Text>
          </View>

          {/* Metric 3: Vehicle Distance */}
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>DISTANCE</Text>
            <Text style={[styles.metricValue, { color: aiResult.vehicleDistance === 'optimal' ? '#10b981' : '#f59e0b' }]}>
              {aiResult.vehicleDistance.toUpperCase()}
            </Text>
          </View>

          {/* Metric 4: Clarity Score */}
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>CLARITY</Text>
            <Text style={[styles.metricValue, { color: aiResult.clarityScore >= 50 ? '#10b981' : '#ef4444' }]}>
              {aiResult.clarityScore}%
            </Text>
          </View>
        </View>

        {/* Vehicle & Target Telemetry */}
        <Text style={[styles.sectionHeading, { color: colors.muted, marginTop: 18 }]}>VEHICLE & LOCATION TELEMETRY</Text>
        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          {/* Plate Row */}
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Hash size={16} color={colors.telemetry} />
              <Text style={[styles.detailKey, { color: colors.muted }]}>License Plate</Text>
            </View>
            <Text style={[styles.detailVal, { color: colors.ink, fontWeight: '700' }]}>
              {aiResult.plateNumber ? `${aiResult.plateNumber} (${aiResult.plateConfidence}% conf)` : 'Unreadable / Blurred'}
            </Text>
          </View>

          {/* Vehicle Make/Model */}
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Car size={16} color={colors.telemetry} />
              <Text style={[styles.detailKey, { color: colors.muted }]}>Vehicle Info</Text>
            </View>
            <Text style={[styles.detailVal, { color: colors.ink }]}>
              {aiResult.vehicleColor} {aiResult.vehicleMakeModel}
            </Text>
          </View>

          {/* GPS Location */}
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <MapPin size={16} color={colors.telemetry} />
              <Text style={[styles.detailKey, { color: colors.muted }]}>GPS Location</Text>
            </View>
            <Text style={[styles.detailVal, { color: colors.ink }]}>
              {clip.latitude.toFixed(5)}, {clip.longitude.toFixed(5)}
            </Text>
          </View>

          {/* Timestamp */}
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <View style={styles.detailLeft}>
              <Clock size={16} color={colors.telemetry} />
              <Text style={[styles.detailKey, { color: colors.muted }]}>Captured At</Text>
            </View>
            <Text style={[styles.detailVal, { color: colors.ink }]}>
              {new Date(clip.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* AI Evidentiary Reasoning Card */}
        <Text style={[styles.sectionHeading, { color: colors.muted, marginTop: 18 }]}>QWEN 2.5-VL ENFORCEMENT AUDIT</Text>
        <View style={[styles.reasoningCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Sparkles size={16} color={colors.telemetry} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.telemetry }}>MODEL REASONING</Text>
          </View>
          <Text style={[styles.reasoningText, { color: colors.ink }]}>
            {aiResult.reasoning}
          </Text>
          <Text style={[styles.reasoningNote, { color: colors.muted }]}>
            {aiResult.notes}
          </Text>
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.telemetry }]} onPress={onGoToVault}>
            <HardDrive size={18} color="#000" />
            <Text style={styles.primaryBtnText}>Proceed to Evidence Vault</Text>
            <ChevronRight size={18} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.edge }]} onPress={onRecordAnother}>
            <Camera size={16} color={colors.ink} />
            <Text style={[styles.secondaryBtnText, { color: colors.ink }]}>Record Another Violation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerPre: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  outcomeBanner: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  fineBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fineLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fineValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  enforcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailKey: {
    fontSize: 13,
  },
  detailVal: {
    fontSize: 13,
  },
  reasoningCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  reasoningText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  reasoningNote: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionContainer: {
    marginTop: 24,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
