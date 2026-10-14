import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Car,
  MapPin,
  Clock,
  HardDrive,
  Camera,
  Hash,
  Scale,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  UserCheck,
  Wallet,
  PlusCircle,
  X,
  CreditCard,
  Edit3,
  Check,
  FileText,
  Info,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Colors } from '../../constants/theme';
import { AiEvidentiaryResult } from '../../lib/aiAnalysis';
import {
  CapturedClip,
  updateReportStatus,
  updateReportCitizenDetails,
  saveLocalReport,
  getLocalReports,
  saveFramesToDisk,
} from '../../lib/report';
import { VIOLATION_TAXONOMY } from '../../lib/violations';
import { getWalletBalance, deductWalletBalance, rechargeWalletBalance } from '../../lib/wallet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReportOutcomeProps {
  clip: CapturedClip;
  aiResult: AiEvidentiaryResult;
  reportId?: string;
  onGoToVault: () => void;
  onRecordAnother: () => void;
  onGoToWallet?: () => void;
}

export function ReportOutcome({
  clip,
  aiResult,
  reportId,
  onGoToVault,
  onRecordAnother,
  onGoToWallet,
}: ReportOutcomeProps) {
  const { colors } = useTheme();
  const { t, isUrdu } = useLanguage();

  // Wallet & Manual Review State
  const [walletBalance, setWalletBalance] = useState<number>(500);
  const [selectedZoomIndex, setSelectedZoomIndex] = useState<number | null>(null);
  const lightboxScrollRef = useRef<ScrollView>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isManualSubmitted, setIsManualSubmitted] = useState(false);
  const [processingDeduction, setProcessingDeduction] = useState(false);

  // Citizen Manual Evidence Overrides & Edit State
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [citizenPlate, setCitizenPlate] = useState(aiResult.citizenPlate || aiResult.plateNumber || '');
  const [citizenVehicleColor, setCitizenVehicleColor] = useState(
    aiResult.citizenVehicleColor || (aiResult.vehicleColor !== 'Unknown' ? aiResult.vehicleColor : '')
  );
  const [citizenVehicleModel, setCitizenVehicleModel] = useState(
    aiResult.citizenVehicleMakeModel ||
    (aiResult.vehicleMakeModel !== 'Not Identified' && aiResult.vehicleMakeModel !== 'Pending Sync' ? aiResult.vehicleMakeModel : '')
  );
  const [citizenVehicleType, setCitizenVehicleType] = useState(
    aiResult.citizenVehicleType || (aiResult.vehicleType !== 'Unknown' ? aiResult.vehicleType : 'Car')
  );
  const [citizenViolationType, setCitizenViolationType] = useState(
    aiResult.citizenViolationType || aiResult.violationType || 'red_light_running'
  );
  const [citizenNote, setCitizenNote] = useState(aiResult.citizenNote || '');
  const [hasCitizenEdited, setHasCitizenEdited] = useState(Boolean(aiResult.isCitizenEdited));

  const currentViolation = VIOLATION_TAXONOMY.find(v => v.code === citizenViolationType);
  const currentViolationName = currentViolation?.name || aiResult.violationName || citizenViolationType;

  useEffect(() => {
    if (selectedZoomIndex !== null) {
      setTimeout(() => {
        lightboxScrollRef.current?.scrollTo({
          x: selectedZoomIndex * SCREEN_WIDTH,
          animated: false,
        });
      }, 50);
    }
  }, [selectedZoomIndex !== null]);

  useEffect(() => {
    let alive = true;
    async function loadBalance() {
      const state = await getWalletBalance();
      if (alive) {
        setWalletBalance(state.balance);
      }
    }
    loadBalance();
    return () => { alive = false; };
  }, []);

  const isFined = aiResult.status === 'fined';
  const isPlateBlurred = aiResult.status === 'rejected_plate_blurred';
  const isVehicleTooFar = aiResult.status === 'rejected_vehicle_too_far';
  const isLowClarity = aiResult.status === 'auto_rejected_low_clarity';

  const statusBg = isManualSubmitted
    ? 'rgba(16, 185, 129, 0.12)'
    : isFined
    ? 'rgba(16, 185, 129, 0.12)'
    : isPlateBlurred || isVehicleTooFar || isLowClarity
    ? 'rgba(245, 158, 11, 0.12)'
    : 'rgba(59, 130, 246, 0.12)';

  const statusBorder = isManualSubmitted
    ? '#10b981'
    : isFined
    ? '#10b981'
    : isPlateBlurred || isVehicleTooFar || isLowClarity
    ? '#f59e0b'
    : '#3b82f6';

  const statusTextColor = isManualSubmitted
    ? '#10b981'
    : isFined
    ? '#10b981'
    : isPlateBlurred || isVehicleTooFar || isLowClarity
    ? '#f59e0b'
    : '#3b82f6';

  const handleOpenManualReview = async () => {
    try {
      const state = await getWalletBalance();
      setWalletBalance(state.balance);
      if (state.balance >= 100) {
        setShowConfirmModal(true);
      } else {
        setShowRechargeModal(true);
      }
    } catch {
      if (walletBalance >= 100) {
        setShowConfirmModal(true);
      } else {
        setShowRechargeModal(true);
      }
    }
  };

  const handleSaveCitizenDetails = async () => {
    const effectiveId = reportId || aiResult.caseId;
    const details = {
      plateNumber: citizenPlate.trim(),
      vehicleMakeModel: citizenVehicleModel.trim(),
      vehicleColor: citizenVehicleColor.trim(),
      vehicleType: citizenVehicleType,
      violationType: citizenViolationType,
      violationName: currentViolationName,
      citizenNote: citizenNote.trim(),
    };
    await updateReportCitizenDetails(effectiveId, details, clip.clientCaptureId);
    setHasCitizenEdited(true);
    setShowEditDetailsModal(false);
    Alert.alert(
      isUrdu ? 'تفصیلات محفوظ ہوگئیں' : 'Details Attached!',
      isUrdu
        ? 'آپ کی فراہم کردہ نمبر پلیٹ اور گاڑی کی معلومات کیس سے منسلک کر دی گئی ہیں اور وارڈن آڈٹ کے لیے تیار ہیں۔'
        : 'Your manual vehicle & plate details have been saved and attached to this case for officer audit.'
    );
  };

  const handleConfirmManualReview = async () => {
    if (processingDeduction) return;
    setProcessingDeduction(true);
    try {
      const effectiveId = reportId || aiResult.caseId;
      const res = await deductWalletBalance(100, {
        title: isUrdu ? 'ٹریفک وارڈن ریویو فیس' : 'Traffic Warden Review Fee',
        subtitle: isUrdu ? `کیس ${effectiveId} برائے دستی جائزہ` : `Escalated case ${effectiveId} for warden audit`,
        reportId: effectiveId,
        type: 'manual_review_fee',
      });
      if (res.success) {
        setWalletBalance(res.newBalance);
        setIsManualSubmitted(true);
        setShowConfirmModal(false);

        const citizenDetailsPayload = hasCitizenEdited ? {
          plateNumber: citizenPlate.trim(),
          vehicleMakeModel: citizenVehicleModel.trim(),
          vehicleColor: citizenVehicleColor.trim(),
          vehicleType: citizenVehicleType,
          violationType: citizenViolationType,
          violationName: currentViolationName,
          citizenNote: citizenNote.trim(),
        } : undefined;

        // 1. Update report status if exists by effective ID and clientCaptureId
        const frameUris = await saveFramesToDisk(effectiveId, aiResult.framesBase64 || clip.framesBase64);
        await updateReportStatus(effectiveId, 'under_review', clip.clientCaptureId, {
          frameUris,
          aiResult,
          citizenDetails: citizenDetailsPayload,
        });

        // 2. Guarantee it exists in local vault even if previous upload had failed
        const localList = await getLocalReports();
        const exists = localList.some(r => r.reportId === effectiveId || r.reportId === aiResult.caseId || r.clientCaptureId === clip.clientCaptureId);
        if (!exists) {
          await saveLocalReport({
            reportId: effectiveId,
            clientCaptureId: clip.clientCaptureId,
            claimedClass: citizenViolationType || 'auto_ai_detect',
            capturedAt: clip.capturedAt,
            uploadedAt: new Date().toISOString(),
            latitude: clip.latitude,
            longitude: clip.longitude,
            locationName: clip.locationName,
            accuracy: clip.accuracy,
            status: 'under_review',
            aiResult,
            penaltyPkr: 50,
            penaltyRefunded: true,
            frameUris,
            citizenPlate: citizenPlate.trim() || undefined,
            citizenVehicleMakeModel: citizenVehicleModel.trim() || undefined,
            citizenVehicleColor: citizenVehicleColor.trim() || undefined,
            citizenVehicleType: citizenVehicleType || undefined,
            citizenViolationType: citizenViolationType || undefined,
            citizenViolationName: currentViolationName || undefined,
            citizenNote: citizenNote.trim() || undefined,
            isCitizenEdited: hasCitizenEdited,
          });
        }

        setShowSuccessModal(true);
      } else {
        setWalletBalance(res.newBalance);
        setShowConfirmModal(false);
        setShowRechargeModal(true);
      }
    } catch (e) {
      console.log('Manual review deduction failed:', e);
    } finally {
      setProcessingDeduction(false);
    }
  };

  const handleQuickRecharge = async (amount: number) => {
    const res = await rechargeWalletBalance(amount);
    if (res.success) {
      setWalletBalance(res.newBalance);
      setShowRechargeModal(false);
      if (res.newBalance >= 100) {
        setShowConfirmModal(true);
      }
    }
  };

  // Frames to show (either from aiResult or clip)
  const frames = aiResult.framesBase64 || clip.framesBase64 || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.edge }]}>
        <View>
          <Text style={[styles.headerPre, { color: colors.telemetry }]}>POC EVIDENTIARY AUDIT (SEC 15)</Text>
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
            {isManualSubmitted ? (
              <ShieldCheck size={24} color="#10b981" />
            ) : isFined ? (
              <CheckCircle2 size={24} color="#10b981" />
            ) : isPlateBlurred || isVehicleTooFar || isLowClarity ? (
              <ShieldAlert size={24} color="#f59e0b" />
            ) : (
              <AlertCircle size={24} color="#3b82f6" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: statusTextColor }]}>
                {isManualSubmitted
                  ? 'CASE ESCALATED: PENDING MANUAL OFFICER REVIEW'
                  : aiResult.statusLabel.toUpperCase()}
              </Text>
              <Text style={[styles.bannerSubtitle, { color: colors.ink }]}>
                {isManualSubmitted
                  ? 'Evidence frames and video submitted for certified traffic officer manual audit. Fee of PKR 100 paid.'
                  : isFined
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

          {isFined && !isManualSubmitted && (
            <>
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

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, backgroundColor: 'rgba(16, 185, 129, 0.12)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)' }}>
                <Sparkles size={14} color="#10b981" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>
                  {isUrdu ? 'رپورٹ منظور! +200 روپے انعام والیٹ میں شامل کر دیا گیا' : 'Report Accepted! +PKR 200 Reward Prize Credited to Wallet'}
                </Text>
              </View>
            </>
          )}

          {!isFined && !isManualSubmitted && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)' }}>
              <AlertTriangle size={14} color="#ef4444" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444', flex: 1 }}>
                {isUrdu ? 'رپورٹ مسترد! -50 روپے غلط اطلاع جرمانہ لاگو (مینوئل ریویو کروائیں یا والٹ چیک کریں)' : 'Report Rejected! -PKR 50 Penalty Charged for Invalid Report (Dispute below)'}
              </Text>
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

        {/* 6 Analyzed Video Frames Gallery */}
        {frames.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.sectionHeading, { color: colors.muted, marginBottom: 0 }]}>
                ANALYZED VIDEO FRAMES ({frames.length} FRAMES INSPECTED)
              </Text>
              <Text style={{ fontSize: 11, color: colors.telemetry, fontWeight: '600' }}>
                Tap to inspect
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.framesScrollContainer}>
              {frames.map((frameB64, idx) => {
                const isVioMoment = aiResult.violationDetected && idx === ((aiResult.violationFrameIndex ?? 2) - 1);
                const timePct = idx === 0 ? 30 : idx === 1 ? 55 : 80;
                const customDesc = aiResult.frameDescriptions?.[idx];
                const phaseLabel = isVioMoment
                  ? (isUrdu ? '⚡ خلاف ورزی کا لمحہ' : '⚡ VIOLATION MOMENT')
                  : idx === 0
                  ? (isUrdu ? 'اپروچ اور پوزیشن' : 'Approach')
                  : (isUrdu ? 'پلیٹ و حتمی ثبوت' : 'Plate Track');

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.frameCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isVioMoment ? '#ef4444' : colors.edge,
                        borderWidth: isVioMoment ? 2 : 1,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedZoomIndex(idx)}
                  >
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${frameB64}` }}
                      style={styles.frameThumbnail}
                      resizeMode="cover"
                    />
                    <View style={styles.frameBadgeRow}>
                      <View
                        style={[
                          styles.frameIndexPill,
                          isVioMoment && { backgroundColor: '#ef4444' },
                        ]}
                      >
                        <Text style={styles.frameIndexText}>
                          {isVioMoment ? '⚡ Frame ' + (idx + 1) + ' · VIOLATION' : 'Frame ' + (idx + 1)}
                        </Text>
                      </View>
                      <View style={styles.frameZoomBtn}>
                        <Maximize2 size={10} color="#fff" />
                      </View>
                    </View>
                    <View style={styles.frameFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} color={colors.muted} />
                        <Text style={[styles.frameFooterText, { color: colors.muted }]}>{timePct}% timeline</Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: isVioMoment ? '#ef4444' : colors.ink,
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {phaseLabel}
                      </Text>
                      {customDesc ? (
                        <Text
                          style={{
                            fontSize: 9,
                            color: isVioMoment ? colors.ink : colors.muted,
                            marginTop: 1,
                            lineHeight: 12,
                          }}
                          numberOfLines={2}
                        >
                          {customDesc}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Dispute / Manual Review Request Card (When Violation is NOT detected) */}
        {!isFined && (
          <View style={[styles.manualReviewCard, { backgroundColor: colors.surface, borderColor: isManualSubmitted ? '#10b981' : 'rgba(245, 158, 11, 0.4)' }]}>
            <View style={styles.manualHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={16} color={isManualSubmitted ? '#10b981' : '#f59e0b'} />
                <Text style={[styles.manualReviewPre, { color: isManualSubmitted ? '#10b981' : '#f59e0b' }]}>
                  {isManualSubmitted ? 'CASE ESCALATED' : 'OFFICER DISPUTE & AUDIT'}
                </Text>
              </View>
              <View style={[styles.feePill, { backgroundColor: isManualSubmitted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                <Text style={[styles.feePillText, { color: isManualSubmitted ? '#10b981' : '#f59e0b' }]}>
                  {isManualSubmitted ? 'SUBMITTED' : 'FEE: PKR 100'}
                </Text>
              </View>
            </View>

            <Text style={[styles.manualTitle, { color: colors.ink }]}>
              {isManualSubmitted ? 'Submitted for Manual Traffic Review' : 'Dispute Verdict & Request Manual Review'}
            </Text>

            <Text style={[styles.manualDesc, { color: colors.muted }]}>
              {isManualSubmitted
                ? 'Your report is now in the Traffic Warden Audit Queue. A certified officer will inspect the 6 video frames and vehicle evidence within 24-48 hours.'
                : 'If you believe the AI missed a traffic violation or misread road conditions, submit this clip and key frames to a certified traffic warden for legal manual audit.'}
            </Text>

            {/* Citizen Details Attached Banner / Prompt */}
            {!isManualSubmitted && (
              hasCitizenEdited ? (
                <View style={[styles.citizenAttachedBanner, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>
                      {isUrdu ? 'شہری کی فراہم کردہ تفصیلات منسلک ہیں' : 'Citizen Evidence Details Attached'}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.ink, marginTop: 1 }}>
                      Plate: {citizenPlate || 'Pending'} · {[citizenVehicleColor, citizenVehicleModel].filter(Boolean).join(' ') || citizenVehicleType}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowEditDetailsModal(true)}>
                    <Text style={{ fontSize: 11, color: colors.telemetry, fontWeight: '700' }}>
                      {isUrdu ? 'ترمیم' : 'Edit ✏️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.attachDetailsPromptBtn, { backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}
                  activeOpacity={0.8}
                  onPress={() => setShowEditDetailsModal(true)}
                >
                  <Edit3 size={13} color="#3b82f6" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#3b82f6', flex: 1 }}>
                    {isUrdu ? 'پلیٹ یا گاڑی کی صحیح تفصیلات دستی درج کریں' : 'Manually Provide Plate / Vehicle Info for Warden'}
                  </Text>
                  <ChevronRight size={13} color="#3b82f6" />
                </TouchableOpacity>
              )
            )}

            {/* Wallet balance telemetry */}
            <View style={[styles.walletStatusRow, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Wallet size={14} color={colors.telemetry} />
                <Text style={[styles.walletStatusLabel, { color: colors.muted }]}>Wallet Balance:</Text>
                <Text style={[styles.walletStatusAmount, { color: colors.ink }]}>PKR {walletBalance.toLocaleString()}</Text>
              </View>
              <View style={[styles.balancePill, { backgroundColor: walletBalance >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: walletBalance >= 100 ? '#10b981' : '#ef4444' }}>
                  {walletBalance >= 100 ? 'Sufficient' : 'Low Balance'}
                </Text>
              </View>
            </View>

            {/* Action Button */}
            {isManualSubmitted ? (
              <View style={[styles.submittedSuccessBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10b981' }]}>
                <CheckCircle2 size={16} color="#10b981" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#10b981' }}>Pending Officer Inspection (#{aiResult.caseId})</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.manualReviewBtn, { backgroundColor: '#f59e0b' }]}
                activeOpacity={0.85}
                onPress={handleOpenManualReview}
              >
                <UserCheck size={16} color="#000" />
                <Text style={styles.manualReviewBtnText}>Request Manual Review (PKR 100)</Text>
                <ChevronRight size={16} color="#000" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Vehicle & Target Telemetry Header with Manual Edit Action */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
          <Text style={[styles.sectionHeading, { color: colors.muted, marginTop: 0, marginBottom: 0 }]}>
            VEHICLE & LOCATION TELEMETRY
          </Text>
          <TouchableOpacity
            style={[
              styles.editTelemetryBtn,
              {
                backgroundColor: hasCitizenEdited ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                borderColor: hasCitizenEdited ? '#10b981' : '#3b82f6',
              },
            ]}
            activeOpacity={0.8}
            onPress={() => setShowEditDetailsModal(true)}
          >
            <Edit3 size={12} color={hasCitizenEdited ? '#10b981' : '#3b82f6'} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: hasCitizenEdited ? '#10b981' : '#3b82f6' }}>
              {hasCitizenEdited ? (isUrdu ? 'ترمیم شدہ ✓' : 'Details Attached ✓') : (isUrdu ? 'دستی درج کریں ✏️' : 'Manual Edit ✏️')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          {/* Plate Row */}
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Hash size={16} color={colors.telemetry} />
              <Text style={[styles.detailKey, { color: colors.muted }]}>License Plate</Text>
            </View>
            {hasCitizenEdited && citizenPlate ? (
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.platePill, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' }]}>
                  <Text style={[styles.plateNumberText, { color: '#10b981', letterSpacing: 1 }]}>{citizenPlate.toUpperCase()}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                  <CheckCircle2 size={10} color="#10b981" />
                  <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '700' }}>
                    {isUrdu ? 'شہری کی فراہم کردہ' : 'Citizen Specified'}
                  </Text>
                </View>
                {aiResult.plateNumber && aiResult.plateNumber !== citizenPlate && (
                  <Text style={{ fontSize: 9, color: colors.muted, marginTop: 1 }}>
                    (AI read: {aiResult.plateNumber})
                  </Text>
                )}
              </View>
            ) : aiResult.plateNumber ? (
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.platePill, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' }]}>
                  <Text style={[styles.plateNumberText, { color: '#10b981' }]}>{aiResult.plateNumber}</Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>{aiResult.plateConfidence}% confidence</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.detailVal, { color: colors.muted }]}>
                  {aiResult.status === 'no_violation'
                    ? 'N/A (Compliant Traffic)'
                    : aiResult.status === 'auto_rejected_low_clarity'
                    ? 'Low Quality / Unreadable'
                    : aiResult.status === 'rejected_vehicle_too_far'
                    ? 'Vehicle Too Far'
                    : 'Unreadable / Blurred'}
                </Text>
                <TouchableOpacity onPress={() => setShowEditDetailsModal(true)} style={{ marginTop: 2 }}>
                  <Text style={{ fontSize: 10, color: '#3b82f6', fontWeight: '700' }}>
                    + {isUrdu ? 'پلیٹ درج کریں' : 'Add Plate Manually'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Vehicle Make/Model */}
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Car size={16} color={colors.telemetry} />
              <Text style={[styles.detailKey, { color: colors.muted }]}>Vehicle Info</Text>
            </View>
            {hasCitizenEdited && (citizenVehicleColor || citizenVehicleModel) ? (
              <View style={{ alignItems: 'flex-end', flexShrink: 1, maxWidth: '65%' }}>
                <Text style={[styles.detailVal, { color: colors.ink, fontWeight: '700', textAlign: 'right' }]}>
                  {[citizenVehicleColor, citizenVehicleModel].filter(Boolean).join(' ')}
                </Text>
                <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '600', marginTop: 1 }}>
                  {citizenVehicleType} · {isUrdu ? 'شہری تفصیلات' : 'Citizen Specified'}
                </Text>
              </View>
            ) : (
              <Text style={[styles.detailVal, { color: colors.ink, fontWeight: '600' }]}>
                {aiResult.vehicleColor && aiResult.vehicleColor !== 'Unknown'
                  ? `${aiResult.vehicleColor} ${aiResult.vehicleMakeModel}`
                  : aiResult.vehicleMakeModel !== 'Not Identified'
                  ? aiResult.vehicleMakeModel
                  : aiResult.vehicleType !== 'Unknown'
                  ? aiResult.vehicleType
                  : 'Traffic Vehicle Identified'}
              </Text>
            )}
          </View>

          {/* Violation Claim (if edited by citizen) */}
          {hasCitizenEdited && (
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Scale size={16} color={colors.telemetry} />
                <Text style={[styles.detailKey, { color: colors.muted }]}>Reported Violation</Text>
              </View>
              <View style={{ alignItems: 'flex-end', flexShrink: 1, maxWidth: '65%' }}>
                <Text style={[styles.detailVal, { color: colors.ink, fontWeight: '700', textAlign: 'right' }]}>
                  {currentViolationName}
                </Text>
                <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '600', marginTop: 1 }}>
                  {isUrdu ? 'شہری کی دعویٰ کردہ' : 'Citizen Stated Claim'}
                </Text>
              </View>
            </View>
          )}

          {/* Citizen Note for Officer (if provided) */}
          {hasCitizenEdited && citizenNote ? (
            <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FileText size={14} color={colors.telemetry} />
                <Text style={[styles.detailKey, { color: colors.muted }]}>Citizen Note for Officer:</Text>
              </View>
              <View style={[styles.citizenNoteDisplayBox, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
                <Text style={[styles.citizenNoteDisplayText, { color: colors.ink }]}>
                  "{citizenNote}"
                </Text>
              </View>
            </View>
          ) : null}

          {/* GPS Location & Place */}
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <MapPin size={16} color={colors.telemetry} />
              <Text style={[styles.detailKey, { color: colors.muted }]}>Location</Text>
            </View>
            <View style={{ alignItems: 'flex-end', flexShrink: 1, maxWidth: '65%' }}>
              {(aiResult.locationName || clip.locationName) ? (
                <Text style={[styles.detailVal, { color: colors.ink, fontWeight: '700', textAlign: 'right' }]} numberOfLines={2}>
                  {aiResult.locationName || clip.locationName}
                </Text>
              ) : null}
              <Text style={{ fontSize: 11, color: colors.telemetry, textAlign: 'right', marginTop: 2, fontFamily: 'monospace' }}>
                {clip.latitude.toFixed(5)}°, {clip.longitude.toFixed(5)}°
              </Text>
            </View>
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
            <Text style={styles.primaryBtnText}>{isUrdu ? 'شواہد والٹ پر جائیں' : 'Proceed to Evidence Vault'}</Text>
            <ChevronRight size={18} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.edge }]} onPress={onRecordAnother}>
            <Camera size={16} color={colors.ink} />
            <Text style={[styles.secondaryBtnText, { color: colors.ink }]}>{isUrdu ? 'ایک اور ویڈیو ریکارڈ کریں' : 'Record Another Violation'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL 1: Full-Screen Zoom Frame Lightbox with Side-Slide Carousel */}
      <Modal visible={selectedZoomIndex !== null} transparent animationType="fade" onRequestClose={() => setSelectedZoomIndex(null)}>
        {(() => {
          const activeIdx = selectedZoomIndex ?? 0;
          const isVio =
            aiResult.violationDetected &&
            activeIdx === ((aiResult.violationFrameIndex ?? 2) - 1);
          const tPct = activeIdx === 0 ? 30 : activeIdx === 1 ? 55 : 80;
          const customDesc = aiResult.frameDescriptions?.[activeIdx];

          return (
            <View style={styles.modalBackdrop}>
              <SafeAreaView style={styles.lightboxContainer}>
                {/* Header */}
                <View style={styles.lightboxHeader}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={[
                          styles.lightboxFrameBadge,
                          isVio && { backgroundColor: '#ef4444' },
                        ]}
                      >
                        <Text style={styles.lightboxFrameBadgeText}>
                          {isVio
                            ? `⚡ Frame ${activeIdx + 1} of ${frames.length} · VIOLATION`
                            : `Frame ${activeIdx + 1} of ${frames.length}`}
                        </Text>
                      </View>
                      <Text style={styles.lightboxTimelineText}>{tPct}% timeline</Text>
                    </View>
                    <Text style={styles.lightboxSub} numberOfLines={1}>
                      {customDesc || (isVio ? 'Decisive evidence moment' : 'Traffic alignment frame')}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedZoomIndex(null)} activeOpacity={0.7}>
                    <X size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Horizontal Side-Slide Carousel */}
                <View style={styles.lightboxCarouselWrapper}>
                  <ScrollView
                    ref={lightboxScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      const nextIdx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                      if (nextIdx >= 0 && nextIdx < frames.length) {
                        setSelectedZoomIndex(nextIdx);
                      }
                    }}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ alignItems: 'center' }}
                  >
                    {frames.map((frameB64, idx) => (
                      <View
                        key={idx}
                        style={{
                          width: SCREEN_WIDTH,
                          height: '100%',
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingHorizontal: 8,
                        }}
                      >
                        <Image
                          source={{ uri: `data:image/jpeg;base64,${frameB64}` }}
                          style={styles.lightboxImage}
                          resizeMode="contain"
                        />
                      </View>
                    ))}
                  </ScrollView>

                  {/* Floating Left Arrow */}
                  {selectedZoomIndex !== null && selectedZoomIndex > 0 && (
                    <TouchableOpacity
                      style={[styles.floatingNavBtn, styles.floatingNavLeft]}
                      activeOpacity={0.8}
                      onPress={() => {
                        const prev = selectedZoomIndex - 1;
                        setSelectedZoomIndex(prev);
                        lightboxScrollRef.current?.scrollTo({ x: prev * SCREEN_WIDTH, animated: true });
                      }}
                    >
                      <ChevronLeft size={22} color="#ffffff" />
                    </TouchableOpacity>
                  )}

                  {/* Floating Right Arrow */}
                  {selectedZoomIndex !== null && selectedZoomIndex < frames.length - 1 && (
                    <TouchableOpacity
                      style={[styles.floatingNavBtn, styles.floatingNavRight]}
                      activeOpacity={0.8}
                      onPress={() => {
                        const next = selectedZoomIndex + 1;
                        setSelectedZoomIndex(next);
                        lightboxScrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
                      }}
                    >
                      <ChevronRight size={22} color="#ffffff" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Footer with Pagination Dots & Guidance */}
                <View style={styles.lightboxFooter}>
                  {frames.length > 1 && (
                    <View style={styles.lightboxDotsRow}>
                      {frames.map((_, dotIdx) => {
                        const isActive = dotIdx === selectedZoomIndex;
                        const isDotVio =
                          aiResult.violationDetected &&
                          dotIdx === ((aiResult.violationFrameIndex ?? 2) - 1);
                        return (
                          <TouchableOpacity
                            key={dotIdx}
                            onPress={() => {
                              setSelectedZoomIndex(dotIdx);
                              lightboxScrollRef.current?.scrollTo({ x: dotIdx * SCREEN_WIDTH, animated: true });
                            }}
                            style={[
                              styles.lightboxDot,
                              isActive && styles.lightboxDotActive,
                              isActive && isDotVio && { backgroundColor: '#ef4444', width: 22 },
                            ]}
                          />
                        );
                      })}
                    </View>
                  )}

                  <Text style={styles.lightboxFooterText}>
                    {isUrdu
                      ? '👈 فریمز کو دائیں بائیں سلائیڈ کریں تاکہ تمام ثبوت دیکھ سکیں 👉'
                      : '👈 Swipe sideways or tap arrows to inspect all evidence frames 👉'}
                  </Text>
                </View>
              </SafeAreaView>
            </View>
          );
        })()}
      </Modal>

      {/* MODAL 2: Confirm Manual Review Deduction Modal */}
      <Modal visible={showConfirmModal} transparent animationType="slide" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialogCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <View style={styles.dialogHeaderRow}>
              <View style={[styles.dialogIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <UserCheck size={24} color="#f59e0b" />
              </View>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)} style={styles.dialogCloseBtn}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.dialogTitle, { color: colors.ink }]}>Request Officer Manual Review</Text>
            <Text style={[styles.dialogDesc, { color: colors.muted }]}>
              Submit Case <Text style={{ color: colors.telemetry, fontWeight: '700' }}>{aiResult.caseId}</Text> for human police warden inspection.
            </Text>

            {/* Officer Submission Details Preview */}
            <View style={[styles.officerSubmissionPreview, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.telemetry }}>
                  {isUrdu ? 'وارڈن کو بھیجی جانے والی تفصیلات:' : 'DETAILS SENT TO WARDEN:'}
                </Text>
                <TouchableOpacity onPress={() => { setShowConfirmModal(false); setShowEditDetailsModal(true); }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#3b82f6' }}>
                    {isUrdu ? 'ترمیم ✏️' : 'Edit ✏️'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, color: colors.ink }}>
                  <Text style={{ color: colors.muted }}>Plate: </Text>
                  <Text style={{ fontWeight: '700', fontFamily: 'monospace' }}>
                    {citizenPlate || aiResult.plateNumber || (isUrdu ? 'دستی شناخت درکار' : 'Pending Warden Identification')}
                  </Text>
                  {hasCitizenEdited && citizenPlate ? (
                    <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '700' }}> (Citizen Specified)</Text>
                  ) : null}
                </Text>
                <Text style={{ fontSize: 12, color: colors.ink }}>
                  <Text style={{ color: colors.muted }}>Vehicle: </Text>
                  <Text style={{ fontWeight: '600' }}>
                    {[citizenVehicleColor, citizenVehicleModel].filter(Boolean).join(' ') || aiResult.vehicleMakeModel || citizenVehicleType}
                  </Text>
                </Text>
                <Text style={{ fontSize: 12, color: colors.ink }}>
                  <Text style={{ color: colors.muted }}>Violation Claim: </Text>
                  <Text style={{ fontWeight: '600' }}>
                    {currentViolationName}
                  </Text>
                </Text>
                {citizenNote ? (
                  <Text style={{ fontSize: 11, color: colors.muted, fontStyle: 'italic', marginTop: 2 }}>
                    "{citizenNote}"
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Fee Breakdown Box */}
            <View style={[styles.breakdownBox, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownKey, { color: colors.muted }]}>Manual Review Fee:</Text>
                <Text style={[styles.breakdownVal, { color: colors.ink }]}>PKR 100</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownKey, { color: colors.muted }]}>Current Wallet Balance:</Text>
                <Text style={[styles.breakdownVal, { color: '#10b981' }]}>PKR {walletBalance.toLocaleString()}</Text>
              </View>
              <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: colors.edge, paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.breakdownKey, { color: colors.ink, fontWeight: '700' }]}>Balance After Payment:</Text>
                <Text style={[styles.breakdownVal, { color: colors.ink, fontWeight: '700' }]}>PKR {(walletBalance - 100).toLocaleString()}</Text>
              </View>
            </View>

            <Text style={[styles.dialogPolicyText, { color: colors.muted }]}>
              {isUrdu
                ? 'ریویو پالیسی:\n• اگر افسر نے خلاف ورزی کی تصدیق کی: 100 روپے فیس واپس + 200 روپے انعام (کل 300 روپے والیٹ میں ملیں گے)!\n• اگر خلاف ورزی ثابت نہ ہوئی: 100 روپے فیس ضبط ہو گی۔'
                : 'Review Policy:\n• If officer confirms violation: 100% Fee Refund (PKR 100) + Prize Bonus (PKR 200) = Total PKR 300 credited to wallet!\n• If officer rejects claim: PKR 100 review fee is forfeited.'}
            </Text>

            <View style={styles.dialogBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.edge }]} onPress={() => setShowConfirmModal(false)} disabled={processingDeduction}>
                <Text style={[styles.cancelBtnText, { color: colors.ink }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#f59e0b' }]} onPress={handleConfirmManualReview} disabled={processingDeduction}>
                {processingDeduction ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <CreditCard size={16} color="#000" />
                    <Text style={styles.confirmBtnText}>Pay PKR 100 & Submit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Edit Evidence Details Modal */}
      <Modal visible={showEditDetailsModal} transparent animationType="slide" onRequestClose={() => setShowEditDetailsModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.editDetailsModalCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            {/* Header */}
            <View style={styles.dialogHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.dialogIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Edit3 size={20} color="#3b82f6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dialogTitle, { color: colors.ink, marginBottom: 2 }]}>
                    {t('citizenDetailsTitle')}
                  </Text>
                  <Text style={[styles.dialogSubText, { color: colors.muted }]} numberOfLines={2}>
                    {t('citizenDetailsSubtitle')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowEditDetailsModal(false)} style={styles.dialogCloseBtn}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 430 }} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Field 1: License Plate Number */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[styles.formLabel, { color: colors.ink }]}>{t('licensePlateLabel')}</Text>
                  {aiResult.plateNumber && (
                    <TouchableOpacity onPress={() => setCitizenPlate(aiResult.plateNumber || '')}>
                      <Text style={{ fontSize: 11, color: colors.telemetry, fontWeight: '600' }}>
                        Use AI: {aiResult.plateNumber}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.edge, fontFamily: 'monospace', fontSize: 16, letterSpacing: 1.5, fontWeight: '700' }]}
                  value={citizenPlate}
                  onChangeText={(val) => setCitizenPlate(val.toUpperCase())}
                  placeholder={t('licensePlatePlaceholder')}
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                />
                <Text style={[styles.formHint, { color: colors.muted }]}>
                  {isUrdu ? 'اگر ویڈیو میں پلیٹ صاف نظر آ رہی ہو اور اے آئی شناخت نہ کر سکا ہو تو یہاں اصل رجسٹریشن نمبر لکھیں۔' : 'If license plate is visible in video and AI missed it, enter exact plate here.'}
                </Text>
              </View>

              {/* Field 2: Vehicle Color */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.ink }]}>{t('vehicleColorLabel')}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.edge }]}
                  value={citizenVehicleColor}
                  onChangeText={setCitizenVehicleColor}
                  placeholder="e.g. White, Black, Silver, Red..."
                  placeholderTextColor={colors.muted}
                />
                {/* Color Quick Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 6 }}>
                  {['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Yellow', 'Green'].map(col => (
                    <TouchableOpacity
                      key={col}
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: citizenVehicleColor.toLowerCase() === col.toLowerCase() ? '#3b82f6' : colors.canvas,
                          borderColor: citizenVehicleColor.toLowerCase() === col.toLowerCase() ? '#3b82f6' : colors.edge,
                        },
                      ]}
                      onPress={() => setCitizenVehicleColor(col)}
                    >
                      <Text
                        style={[
                          styles.chipPillText,
                          { color: citizenVehicleColor.toLowerCase() === col.toLowerCase() ? '#fff' : colors.ink },
                        ]}
                      >
                        {col}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Field 3: Vehicle Make & Model */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.ink }]}>{t('vehicleModelLabel')}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.edge }]}
                  value={citizenVehicleModel}
                  onChangeText={setCitizenVehicleModel}
                  placeholder="e.g. Toyota Corolla, Honda Civic, Suzuki Alto, CD 70..."
                  placeholderTextColor={colors.muted}
                />
                {/* Popular Models Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 6 }}>
                  {['Corolla', 'Civic', 'Alto', 'Yaris', 'City', 'CD 70', '125', 'Rickshaw'].map(mod => (
                    <TouchableOpacity
                      key={mod}
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: citizenVehicleModel.toLowerCase().includes(mod.toLowerCase()) ? '#3b82f6' : colors.canvas,
                          borderColor: citizenVehicleModel.toLowerCase().includes(mod.toLowerCase()) ? '#3b82f6' : colors.edge,
                        },
                      ]}
                      onPress={() => setCitizenVehicleModel(mod)}
                    >
                      <Text
                        style={[
                          styles.chipPillText,
                          { color: citizenVehicleModel.toLowerCase().includes(mod.toLowerCase()) ? '#fff' : colors.ink },
                        ]}
                      >
                        {mod}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Field 4: Vehicle Type */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.ink }]}>{t('vehicleTypeLabel')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {['Car', 'Motorcycle', 'Rickshaw', 'Commercial / Truck', 'Bus'].map(vt => (
                    <TouchableOpacity
                      key={vt}
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: citizenVehicleType === vt ? '#3b82f6' : colors.canvas,
                          borderColor: citizenVehicleType === vt ? '#3b82f6' : colors.edge,
                        },
                      ]}
                      onPress={() => setCitizenVehicleType(vt)}
                    >
                      <Text
                        style={[
                          styles.chipPillText,
                          { color: citizenVehicleType === vt ? '#fff' : colors.ink },
                        ]}
                      >
                        {vt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Field 5: Violation Category */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.ink }]}>{t('violationCategoryLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }} contentContainerStyle={{ gap: 6 }}>
                  {VIOLATION_TAXONOMY.map(v => (
                    <TouchableOpacity
                      key={v.code}
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: citizenViolationType === v.code ? '#10b981' : colors.canvas,
                          borderColor: citizenViolationType === v.code ? '#10b981' : colors.edge,
                        },
                      ]}
                      onPress={() => setCitizenViolationType(v.code)}
                    >
                      <Text
                        style={[
                          styles.chipPillText,
                          { color: citizenViolationType === v.code ? '#fff' : colors.ink },
                        ]}
                      >
                        {v.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Field 6: Citizen Audit Note */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.ink }]}>{t('citizenNoteLabel')}</Text>
                <TextInput
                  style={[styles.formTextArea, { backgroundColor: colors.canvas, color: colors.ink, borderColor: colors.edge }]}
                  value={citizenNote}
                  onChangeText={setCitizenNote}
                  placeholder={t('citizenNotePlaceholder')}
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={[styles.dialogBtnRow, { marginTop: 14 }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.edge }]}
                onPress={() => setShowEditDetailsModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.ink }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: '#10b981' }]}
                onPress={handleSaveCitizenDetails}
              >
                <Check size={16} color="#fff" />
                <Text style={[styles.confirmBtnText, { color: '#fff' }]}>
                  {t('saveDetailsBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Insufficient Wallet Balance Modal */}
      <Modal visible={showRechargeModal} transparent animationType="slide" onRequestClose={() => setShowRechargeModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialogCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <View style={styles.dialogHeaderRow}>
              <View style={[styles.dialogIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <AlertCircle size={24} color="#ef4444" />
              </View>
              <TouchableOpacity onPress={() => setShowRechargeModal(false)} style={styles.dialogCloseBtn}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.dialogTitle, { color: colors.ink }]}>Insufficient Wallet Balance</Text>
            <Text style={[styles.dialogDesc, { color: colors.muted }]}>
              Manual review requires <Text style={{ color: colors.ink, fontWeight: '700' }}>PKR 100</Text>. Your current balance is only <Text style={{ color: '#ef4444', fontWeight: '700' }}>PKR {walletBalance.toLocaleString()}</Text>.
            </Text>

            <Text style={[styles.rechargeLabel, { color: colors.muted }]}>QUICK RECHARGE / TOP UP FUNDS:</Text>
            <View style={styles.topUpRow}>
              <TouchableOpacity style={[styles.topUpBtn, { backgroundColor: colors.canvas, borderColor: colors.edge }]} onPress={() => handleQuickRecharge(100)}>
                <PlusCircle size={14} color={colors.telemetry} />
                <Text style={[styles.topUpBtnText, { color: colors.ink }]}>+PKR 100</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.topUpBtn, { backgroundColor: colors.canvas, borderColor: colors.edge }]} onPress={() => handleQuickRecharge(500)}>
                <PlusCircle size={14} color={colors.telemetry} />
                <Text style={[styles.topUpBtnText, { color: colors.ink }]}>+PKR 500</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.topUpBtn, { backgroundColor: colors.canvas, borderColor: colors.edge }]} onPress={() => handleQuickRecharge(1000)}>
                <PlusCircle size={14} color={colors.telemetry} />
                <Text style={[styles.topUpBtnText, { color: colors.ink }]}>+PKR 1,000</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 18, gap: 10 }}>
              {onGoToWallet && (
                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: colors.telemetry }]}
                  onPress={() => {
                    setShowRechargeModal(false);
                    onGoToWallet();
                  }}
                >
                  <Wallet size={16} color={colors.telemetry} />
                  <Text style={[styles.outlineBtnText, { color: colors.telemetry }]}>Open Citizen Wallet Tab</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.edge }]} onPress={() => setShowRechargeModal(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Success Popup Modal (Requested by User) */}
      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: '#10b981' }]}>
            <View style={styles.successIconBox}>
              <CheckCircle2 size={44} color="#10b981" />
            </View>

            <Text style={[styles.successTitle, { color: colors.ink }]}>Submitted for Manual Review!</Text>
            <Text style={[styles.successDesc, { color: colors.muted }]}>
              Your case evidence for <Text style={{ color: colors.telemetry, fontWeight: '700' }}>{aiResult.caseId}</Text> has been successfully queued for traffic warden verification.
            </Text>

            <View style={[styles.successDetailsBox, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
              <View style={styles.successDetailRow}>
                <Text style={[styles.successDetailKey, { color: colors.muted }]}>Deducted Fee:</Text>
                <Text style={[styles.successDetailVal, { color: '#ef4444' }]}>-PKR 100</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={[styles.successDetailKey, { color: colors.muted }]}>Remaining Wallet Balance:</Text>
                <Text style={[styles.successDetailVal, { color: '#10b981' }]}>PKR {walletBalance.toLocaleString()}</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={[styles.successDetailKey, { color: colors.muted }]}>If Confirmed by Officer:</Text>
                <Text style={[styles.successDetailVal, { color: '#10b981', fontWeight: '700' }]}>+PKR 300 (Fee + Bonus)</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={[styles.successDetailKey, { color: colors.muted }]}>Audit Resolution Time:</Text>
                <Text style={[styles.successDetailVal, { color: colors.ink }]}>24 – 48 Hours</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.successDoneBtn, { backgroundColor: colors.telemetry }]}
              onPress={() => {
                setShowSuccessModal(false);
                onGoToVault();
              }}
            >
              <Text style={styles.successDoneBtnText}>
                {isUrdu ? 'تسلیم کریں اور والٹ میں دیکھیں' : 'Acknowledge & View in Vault'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // Analyzed Frames Carousel
  framesScrollContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  frameCard: {
    width: 140,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  frameThumbnail: {
    width: 140,
    height: 95,
  },
  frameBadgeRow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frameIndexPill: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  frameIndexText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  frameZoomBtn: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 4,
    borderRadius: 4,
  },
  frameFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  frameFooterText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Manual Review Card
  manualReviewCard: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
  },
  manualHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  manualReviewPre: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  feePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  manualDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  walletStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  walletStatusLabel: {
    fontSize: 12,
  },
  walletStatusAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  balancePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  manualReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  manualReviewBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  submittedSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },

  // Telemetry details
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
  platePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  plateNumberText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
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

  // Modals & Popups
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lightboxContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  lightboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lightboxTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  lightboxSub: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  lightboxCarouselWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  floatingNavBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  floatingNavLeft: {
    left: 12,
  },
  floatingNavRight: {
    right: 12,
  },
  lightboxDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  lightboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  lightboxDotActive: {
    width: 22,
    backgroundColor: Colors.telemetry,
  },
  lightboxFrameBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lightboxFrameBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  lightboxTimelineText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },
  lightboxImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: SCREEN_WIDTH - 16,
    height: '100%',
  },
  lightboxFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  lightboxFooterText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    textAlign: 'center',
  },

  // Dialog Card
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
  },
  dialogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dialogIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogCloseBtn: {
    padding: 4,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  dialogDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  breakdownBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownKey: {
    fontSize: 12,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  dialogPolicyText: {
    fontSize: 11,
    lineHeight: 15,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  dialogBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },

  // Top Up Box
  rechargeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  topUpRow: {
    flexDirection: 'row',
    gap: 8,
  },
  topUpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  topUpBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Success Card
  successCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
  },
  successIconBox: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  successDetailsBox: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginBottom: 18,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successDetailKey: {
    fontSize: 12,
  },
  successDetailVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  successDoneBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  successDoneBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },

  // Manual Details Editor & Overrides Styles
  editDetailsModalCard: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
  },
  dialogSubText: {
    fontSize: 12,
    lineHeight: 16,
  },
  formGroup: {
    marginTop: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formTextArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14,
  },
  chipPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  citizenAttachedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  attachDetailsPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  editTelemetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  citizenNoteDisplayBox: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  citizenNoteDisplayText: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  officerSubmissionPreview: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
});
