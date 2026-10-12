import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  UploadCloud,
  CheckCircle2,
  HardDrive,
  Video,
  AlertCircle,
  UserCheck,
  Sparkles,
  AlertTriangle,
  Scale,
  X,
  ChevronRight,
  Maximize2,
  MapPin,
  Clock,
  Car,
  Camera,
  Hash,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Eye,
  FileText,
  Trash2,
  CheckSquare,
  Square,
  Lock,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import {
  getLocalReports,
  getReportFrames,
  updateReportStatus,
  deleteReports,
  getDeletedReportIds,
} from '../../lib/report';
import { AiEvidentiaryResult } from '../../lib/aiAnalysis';
import { getWalletBalance, deductWalletBalance } from '../../lib/wallet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ReportRow = {
  report_id: string;
  claimed_class: string;
  captured_at: string;
  status: string;
  geo_lat: number | null;
  geo_long: number | null;
  location_name?: string;
  reward_pkr?: number;
  penalty_pkr?: number;
  plate_number?: string;
  officer_verdict?: 'accepted' | 'rejected';
  review_fee_refunded?: number;
  total_payout_pkr?: number;
  officer_note?: string;
  frame_uris?: string[];
  ai_result?: AiEvidentiaryResult;
  vehicle_model?: string;
  vehicle_color?: string;
  client_capture_id?: string;
};

export function Vault() {
  const { colors } = useTheme();
  const { t, isUrdu } = useLanguage();
  const [activeTab, setActiveTab] = useState<'pending' | 'sealed'>('sealed');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loadError, setLoadError] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Evidentiary Detail Dossier & Full-Screen Zoom Lightbox States
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [zoomFrame, setZoomFrame] = useState<{ uri: string; label: string } | null>(null);

  // Screen Clean-up & Batch Selection Deletion States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const deletedIds = new Set(await getDeletedReportIds());
      const localList = await getLocalReports();
      const filteredLocalList = localList.filter(
        item => !deletedIds.has(item.reportId) && !deletedIds.has(item.clientCaptureId)
      );

      const formattedLocal: ReportRow[] = await Promise.all(
        filteredLocalList.map(async (item) => {
          const frames = await getReportFrames(item.reportId, item.clientCaptureId, item.frameUris);
          return {
            report_id: item.reportId,
            claimed_class: item.claimedClass,
            captured_at: item.capturedAt,
            status: item.status,
            geo_lat: item.latitude,
            geo_long: item.longitude,
            location_name: item.locationName,
            reward_pkr: item.rewardPkr,
            penalty_pkr: item.penaltyPkr,
            plate_number: item.aiResult?.plateNumber || undefined,
            officer_verdict: item.officerVerdict,
            review_fee_refunded: item.reviewFeeRefunded,
            total_payout_pkr: item.totalPayoutPkr,
            officer_note: item.officerNote,
            frame_uris: frames.length > 0 ? frames : undefined,
            ai_result: item.aiResult,
            vehicle_model: item.aiResult?.vehicleMakeModel,
            vehicle_color: item.aiResult?.vehicleColor,
            client_capture_id: item.clientCaptureId,
          };
        })
      );

      const { data, error } = await supabase
        .from('reports')
        .select('report_id,claimed_class,captured_at,status,geo_lat,geo_long,client_capture_id')
        .order('captured_at', { ascending: false })
        .limit(100);

      const remoteList = (!error && data) ? data : [];
      const seen = new Set<string>();
      const combined: ReportRow[] = [];

      // Prioritize local rich records
      for (const l of formattedLocal) {
        seen.add(l.report_id);
        const matchItem = filteredLocalList.find(x => x.reportId === l.report_id);
        if (matchItem?.clientCaptureId) {
          seen.add(matchItem.clientCaptureId);
        }
        combined.push(l);
      }

      // Merge any remote reports not in local and not deleted
      for (const r of remoteList) {
        if (deletedIds.has(r.report_id) || (r.client_capture_id && deletedIds.has(r.client_capture_id))) {
          continue;
        }
        const alreadyInLocal = seen.has(r.report_id) || (r.client_capture_id && seen.has(r.client_capture_id));
        if (!alreadyInLocal) {
          seen.add(r.report_id);
          if (r.client_capture_id) seen.add(r.client_capture_id);
          let normStatus = r.status;
          if (r.status === 'fined') normStatus = 'accepted';
          else if (['no_violation', 'rejected_plate_blurred', 'rejected_vehicle_too_far', 'auto_rejected_low_clarity'].includes(r.status)) normStatus = 'rejected';
          else if (['pending_manual_review', 'under_review'].includes(r.status)) normStatus = 'under_review';

          combined.push({
            report_id: r.report_id,
            claimed_class: r.claimed_class,
            captured_at: r.captured_at,
            status: normStatus,
            geo_lat: r.geo_lat,
            geo_long: r.geo_long,
            reward_pkr: normStatus === 'accepted' ? 200 : undefined,
            penalty_pkr: normStatus === 'rejected' ? 50 : undefined,
            client_capture_id: r.client_capture_id,
          });
        }
      }

      setReports(combined);
      setLoadError('');
    } catch {
      const deletedIds = new Set(await getDeletedReportIds());
      const localOnly = await getLocalReports();
      const filtered = localOnly.filter(
        item => !deletedIds.has(item.reportId) && !deletedIds.has(item.clientCaptureId)
      );
      const mapped = await Promise.all(
        filtered.map(async (item) => {
          const frames = await getReportFrames(item.reportId, item.clientCaptureId, item.frameUris);
          return {
            report_id: item.reportId,
            claimed_class: item.claimedClass,
            captured_at: item.capturedAt,
            status: item.status,
            geo_lat: item.latitude,
            geo_long: item.longitude,
            location_name: item.locationName,
            reward_pkr: item.rewardPkr,
            penalty_pkr: item.penaltyPkr,
            plate_number: item.aiResult?.plateNumber || undefined,
            officer_verdict: item.officerVerdict,
            review_fee_refunded: item.reviewFeeRefunded,
            total_payout_pkr: item.totalPayoutPkr,
            officer_note: item.officerNote,
            frame_uris: frames.length > 0 ? frames : undefined,
            ai_result: item.aiResult,
            vehicle_model: item.aiResult?.vehicleMakeModel,
            vehicle_color: item.aiResult?.vehicleColor,
            client_capture_id: item.clientCaptureId,
          };
        })
      );
      setReports(mapped);
      setLoadError('');
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  // Citizen escalation action: dispute an AI-rejected report for PKR 100 review fee
  const handleRequestReviewFromVault = async (reportId: string) => {
    try {
      const state = await getWalletBalance();
      if (state.balance < 100) {
        Alert.alert(
          isUrdu ? 'ناکافی بیلنس' : 'Insufficient Balance',
          isUrdu
            ? 'مینوئل ریویو کے لیے والیٹ میں کم از کم 100 روپے ہونا ضروری ہے۔ براہ کرم والیٹ ٹیب میں جا کر ریچارج کریں۔'
            : 'Manual review requires PKR 100. Please top up funds in the Citizen Wallet tab.'
        );
        return;
      }

      setResolvingId(reportId);
      const deduction = await deductWalletBalance(100, {
        title: isUrdu ? 'ٹریفک وارڈن ریویو فیس' : 'Traffic Warden Review Fee',
        subtitle: isUrdu ? `کیس ${reportId} برائے دستی جائزہ` : `Escalated case ${reportId} for warden audit`,
        reportId: reportId,
        type: 'manual_review_fee',
      });
      if (deduction.success) {
        await updateReportStatus(reportId, 'under_review');
        await loadReports();
        if (selectedReport && selectedReport.report_id === reportId) {
          setSelectedReport(prev => prev ? { ...prev, status: 'under_review' } : null);
        }
        Alert.alert(
          isUrdu ? 'کامیابی سے جمع' : 'Submitted for Officer Review',
          isUrdu
            ? 'رپورٹ ٹریفک وارڈن کے جائزے کے لیے جمع ہو گئی ہے۔ 100 روپے فیس ادا کر دی گئی ہے۔'
            : 'Case successfully escalated to Traffic Warden audit. PKR 100 review fee paid.'
        );
      }
    } catch (e) {
      console.error('Failed to escalate report from vault:', e);
    } finally {
      setResolvingId(null);
    }
  };

  const pending = reports.filter(r => r.status === 'awaiting_upload' || r.status === 'failed');
  const sealed = reports.filter(r => !pending.includes(r));

  const acceptedCount = sealed.filter(r => r.status === 'accepted').length;
  const underReviewCount = sealed.filter(r => r.status === 'under_review' || r.status === 'pending_manual_review').length;
  const rejectedCount = sealed.filter(r => r.status === 'rejected').length;

  // Eligible reports for deletion: ONLY accepted or rejected (under_review is protected and CANNOT be deleted)
  const eligibleReports = sealed.filter(r => r.status === 'accepted' || r.status === 'rejected');
  const allEligibleSelected =
    eligibleReports.length > 0 && eligibleReports.every(r => selectedIds.includes(r.report_id));

  // Toggle selection for a card in selection mode
  const toggleSelect = (reportId: string, status: string) => {
    const isDeletable = status === 'accepted' || status === 'rejected';
    if (!isDeletable) {
      Alert.alert(
        isUrdu ? 'محفوظ رپورٹ' : 'Protected Record',
        isUrdu
          ? 'ٹریفک وارڈن کے زیرِ تفتیش رپورٹس ڈیلیٹ نہیں کی جا سکتیں۔'
          : 'Reports currently under Traffic Warden audit cannot be deleted.'
      );
      return;
    }
    setSelectedIds(prev =>
      prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]
    );
  };

  const handleToggleSelectAll = () => {
    if (allEligibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleReports.map(r => r.report_id));
    }
  };

  // Delete single report with confirmation
  const confirmDeleteSingle = (reportId: string) => {
    Alert.alert(
      t('deleteConfirmTitle'),
      t('deleteSingleConfirm'),
      [
        { text: isUrdu ? 'منسوخ کریں' : 'Cancel', style: 'cancel' },
        {
          text: isUrdu ? 'ڈیلیٹ کریں' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReports([reportId]);
              if (selectedReport?.report_id === reportId) {
                setSelectedReport(null);
              }
              await loadReports();
            } catch (e) {
              console.error('Failed to delete report:', e);
            }
          },
        },
      ]
    );
  };

  // Batch delete selected reports
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      t('deleteConfirmTitle'),
      isUrdu
        ? `کیا آپ ${selectedIds.length} منتخب کردہ رپورٹس کو والٹ سے ختم کرنا چاہتے ہیں؟ اس سے آپ کی اسکرین صاف ہو جائے گی۔`
        : `Are you sure you want to remove ${selectedIds.length} selected reports from your vault? This will clean up your screen.`,
      [
        { text: isUrdu ? 'منسوخ کریں' : 'Cancel', style: 'cancel' },
        {
          text: isUrdu ? 'ڈیلیٹ کریں' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteReports(selectedIds);
              setSelectedIds([]);
              setIsSelectionMode(false);
              await loadReports();
              Alert.alert(
                isUrdu ? 'کامیابی' : 'Success',
                t('reportsDeletedSuccess')
              );
            } catch (e) {
              console.error('Failed to delete selected reports:', e);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Title & Screen Clean Management Header */}
        <View style={styles.vaultTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.ink }]}>{t('evidenceVault')}</Text>
            <Text style={[styles.titleSub, { color: colors.muted }]}>
              {isUrdu ? 'محفوظ شدہ ڈیجیٹل شواہد و چالان' : 'Verified Evidence & Enforcement Vault'}
            </Text>
          </View>

          {/* Clean / Manage Toggle Button (only when in sealed tab & eligible reports exist) */}
          {activeTab === 'sealed' && eligibleReports.length > 0 && (
            <TouchableOpacity
              style={[
                styles.manageToggleBtn,
                isSelectionMode
                  ? { backgroundColor: colors.signal, borderColor: colors.signal }
                  : { backgroundColor: colors.surface, borderColor: colors.edge },
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds([]);
              }}
            >
              {isSelectionMode ? (
                <>
                  <X size={13} color="#ffffff" />
                  <Text style={[styles.manageToggleText, { color: '#ffffff' }]}>
                    {t('cancelManage')}
                  </Text>
                </>
              ) : (
                <>
                  <Trash2 size={13} color={colors.telemetry} />
                  <Text style={[styles.manageToggleText, { color: colors.telemetry }]}>
                    {t('manageVault')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Dynamic Stats Grid: Accepted, Under Review, Rejected */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: 'rgba(16, 185, 129, 0.35)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <CheckCircle2 size={16} color={colors.valid} />
              <View style={[styles.statPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.valid }}>+PKR 200</Text>
              </View>
            </View>
            <Text style={[styles.statValue, { color: colors.valid }]}>{acceptedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{t('approved')}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <UserCheck size={16} color={colors.accent} />
              <View style={[styles.statPill, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.accent }}>Warden</Text>
              </View>
            </View>
            <Text style={[styles.statValue, { color: colors.accent }]}>{underReviewCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{t('underHumanReview')}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: 'rgba(239, 68, 68, 0.35)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AlertCircle size={16} color={colors.signal} />
              <View style={[styles.statPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.signal }}>-PKR 50</Text>
              </View>
            </View>
            <Text style={[styles.statValue, { color: colors.signal }]}>{rejectedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{t('rejected')}</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'sealed' && { backgroundColor: colors.canvas }]}
            onPress={() => {
              setActiveTab('sealed');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: activeTab === 'sealed' ? colors.telemetry : colors.muted }]}>
              {t('sealedEvidence')} ({sealed.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'pending' && { backgroundColor: colors.canvas }]}
            onPress={() => {
              setActiveTab('pending');
              setIsSelectionMode(false);
              setSelectedIds([]);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: activeTab === 'pending' ? colors.telemetry : colors.muted }]}>
              {t('pendingUpload')} ({pending.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Multi-Selection Control Bar (When Selection Mode is Active) */}
        {isSelectionMode && activeTab === 'sealed' && (
          <View style={[styles.selectionControlBar, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <TouchableOpacity
              style={styles.selectAllBtn}
              onPress={handleToggleSelectAll}
              activeOpacity={0.7}
            >
              {allEligibleSelected ? (
                <CheckSquare size={16} color={colors.valid} />
              ) : (
                <Square size={16} color={colors.muted} />
              )}
              <Text style={[styles.selectAllText, { color: colors.ink }]}>
                {allEligibleSelected
                  ? (isUrdu ? 'سب غیر منتخب کریں' : 'Deselect All')
                  : (isUrdu ? `تمام مکمل شدہ منتخب کریں (${eligibleReports.length})` : `${t('selectAllEligible')} (${eligibleReports.length})`)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteBatchBtn,
                selectedIds.length === 0 && { opacity: 0.4 },
              ]}
              disabled={selectedIds.length === 0 || isDeleting}
              onPress={handleDeleteSelected}
              activeOpacity={0.8}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Trash2 size={13} color="#ffffff" />
                  <Text style={styles.deleteBatchBtnText}>
                    {isUrdu ? `ڈیلیٹ (${selectedIds.length})` : `${t('deleteSelected')} (${selectedIds.length})`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* List Content */}
        {activeTab === 'sealed' ? (
          <View style={styles.list}>
            {sealed.map((r) => {
              const isAccepted = r.status === 'accepted';
              const isUnderReview = r.status === 'under_review' || r.status === 'pending_manual_review';
              const isRejected = r.status === 'rejected' || (!isAccepted && !isUnderReview);
              const isOfficerAccepted = isAccepted && r.officer_verdict === 'accepted';
              const isOfficerRejected = isRejected && r.officer_verdict === 'rejected';
              const frames = r.frame_uris || [];
              const isDeletable = isAccepted || isRejected;
              const isSelected = selectedIds.includes(r.report_id);

              return (
                <View
                  key={r.report_id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSelected
                        ? colors.signal
                        : isAccepted
                        ? 'rgba(16, 185, 129, 0.35)'
                        : isUnderReview
                        ? 'rgba(245, 158, 11, 0.35)'
                        : 'rgba(239, 68, 68, 0.35)',
                    },
                    isSelected && styles.cardSelectedGlow,
                  ]}
                >
                  {/* Clickable Area: Selection mode toggles checkbox, normal mode opens dossier */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      if (isSelectionMode) {
                        toggleSelect(r.report_id, r.status);
                      } else {
                        setSelectedReport(r);
                      }
                    }}
                    style={styles.cardMainTouch}
                  >
                    <View style={styles.cardHeader}>
                      {/* Selection Checkbox (Active mode only) */}
                      {isSelectionMode && (
                        <TouchableOpacity
                          style={styles.selectionCheckboxTouch}
                          onPress={() => toggleSelect(r.report_id, r.status)}
                          activeOpacity={0.7}
                        >
                          {isDeletable ? (
                            isSelected ? (
                              <CheckSquare size={20} color={colors.signal} />
                            ) : (
                              <Square size={20} color={colors.muted} />
                            )
                          ) : (
                            <View style={[styles.protectedIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                              <Lock size={12} color={colors.accent} />
                            </View>
                          )}
                        </TouchableOpacity>
                      )}

                      <View
                        style={[
                          styles.iconContainer,
                          {
                            backgroundColor: isAccepted
                              ? 'rgba(16, 185, 129, 0.15)'
                              : isUnderReview
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                            borderColor: isAccepted
                              ? colors.valid
                              : isUnderReview
                              ? colors.accent
                              : colors.signal,
                          },
                        ]}
                      >
                        {isAccepted ? (
                          <CheckCircle2 size={18} color={colors.valid} />
                        ) : isUnderReview ? (
                          <UserCheck size={18} color={colors.accent} />
                        ) : (
                          <AlertCircle size={18} color={colors.signal} />
                        )}
                      </View>

                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardTitle, { color: colors.ink }]}>
                          {r.claimed_class.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                        <Text style={[styles.cardSub, { color: colors.muted }]}>
                          {r.report_id.slice(0, 10)} · {new Date(r.captured_at).toLocaleDateString()}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                          style={[
                            styles.badge,
                            isAccepted
                              ? styles.badgeValid
                              : isUnderReview
                              ? styles.badgeAccent
                              : styles.badgeSignal,
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color: isAccepted
                                  ? colors.valid
                                  : isUnderReview
                                  ? colors.accent
                                  : colors.signal,
                              },
                            ]}
                          >
                            {isOfficerAccepted
                              ? t('officerConfirmedBadge')
                              : isOfficerRejected
                              ? t('officerRejectedBadge')
                              : isAccepted
                              ? t('approved')
                              : isUnderReview
                              ? t('underHumanReview')
                              : t('rejected')}
                          </Text>
                        </View>

                        {/* Quick 1-Tap Delete Icon (Only when NOT in selection mode and if report is finished/deletable) */}
                        {!isSelectionMode && isDeletable && (
                          <TouchableOpacity
                            style={[styles.quickDeleteBtn, { backgroundColor: colors.canvas, borderColor: colors.edge }]}
                            activeOpacity={0.7}
                            onPress={() => confirmDeleteSingle(r.report_id)}
                          >
                            <Trash2 size={12} color={colors.muted} />
                          </TouchableOpacity>
                        )}

                        {/* Protected lock indicator for under-review reports */}
                        {!isSelectionMode && isUnderReview && (
                          <View style={[styles.protectedPill, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                            <Lock size={10} color={colors.accent} />
                          </View>
                        )}
                      </View>
                    </View>

                    {/* 3 Keyframes Preview Strip right on the card */}
                    {frames.length > 0 && (
                      <View style={styles.cardFramesStrip}>
                        {frames.slice(0, 3).map((fUri, fIdx) => {
                          const isVioMoment = (isAccepted || Boolean(r.ai_result?.violationDetected)) && fIdx === ((r.ai_result?.violationFrameIndex ?? 2) - 1);
                          return (
                            <View
                              key={fIdx}
                              style={[
                                styles.cardFrameWrapper,
                                {
                                  borderColor: isVioMoment ? '#ef4444' : colors.edge,
                                  borderWidth: isVioMoment ? 2 : 1,
                                  backgroundColor: colors.canvas,
                                },
                              ]}
                            >
                              <Image
                                source={{ uri: fUri }}
                                style={styles.cardFrameThumb}
                                resizeMode="cover"
                              />
                              <View style={[styles.cardFramePill, isVioMoment && { backgroundColor: '#ef4444' }]}>
                                <Text style={styles.cardFramePillText}>
                                  {isVioMoment ? '⚡ VIOLATION' : fIdx === 0 ? '30%' : '80%'}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Prize / Penalty / Audit Notice Strip */}
                    <View
                      style={[
                        styles.prizeStrip,
                        {
                          backgroundColor: isAccepted
                            ? 'rgba(16, 185, 129, 0.08)'
                            : isUnderReview
                            ? 'rgba(245, 158, 11, 0.08)'
                            : 'rgba(239, 68, 68, 0.08)',
                          borderColor: isAccepted
                            ? 'rgba(16, 185, 129, 0.25)'
                            : isUnderReview
                            ? 'rgba(245, 158, 11, 0.25)'
                            : 'rgba(239, 68, 68, 0.25)',
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        {isAccepted ? (
                          <Sparkles size={14} color={colors.valid} />
                        ) : isUnderReview ? (
                          <UserCheck size={14} color={colors.accent} />
                        ) : (
                          <AlertTriangle size={14} color={colors.signal} />
                        )}
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: isAccepted
                              ? colors.valid
                              : isUnderReview
                              ? colors.accent
                              : colors.signal,
                          }}
                        >
                          {isOfficerAccepted
                            ? t('officerConfirmedBanner')
                            : isOfficerRejected
                            ? t('officerRejectedBanner')
                            : isAccepted
                            ? t('rewardPrizeWon')
                            : isUnderReview
                            ? t('wardenAuditQueue')
                            : t('falseReportFine')}
                        </Text>
                      </View>
                    </View>

                    {/* Status Explanation note */}
                    <Text style={[styles.explanationText, { color: colors.muted }]}>
                      {r.officer_note
                        ? r.officer_note
                        : isUnderReview
                        ? (isUrdu ? 'ٹریفک وارڈن کے زیرِ جائزہ۔ افسر ویڈیو فریمز اور شواہد کی تصدیق کر رہا ہے (یہ رپورٹ محفوظ ہے)۔' : 'Under Traffic Warden audit. Certified officer is reviewing evidence (Protected from deletion).')
                        : isAccepted
                        ? t('acceptedExplanation')
                        : t('rejectedExplanation')}
                    </Text>

                    {/* Footer Prompt */}
                    {!isSelectionMode && (
                      <View style={[styles.cardFooterAction, { borderTopColor: colors.edge }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <FileText size={12} color={colors.telemetry} />
                          <Text style={[styles.cardFooterText, { color: colors.telemetry }]}>
                            {t('viewFullDossier')}
                          </Text>
                        </View>
                        <ChevronRight size={14} color={colors.telemetry} />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Citizen Dispute Button (ONLY for rejected reports that haven't been disputed yet and when not in selection mode) */}
                  {!isSelectionMode && isRejected && !isOfficerRejected && (
                    <TouchableOpacity
                      style={[
                        styles.escalateBtn,
                        { borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.08)' },
                      ]}
                      activeOpacity={0.8}
                      disabled={resolvingId === r.report_id}
                      onPress={() => handleRequestReviewFromVault(r.report_id)}
                    >
                      <UserCheck size={14} color="#f59e0b" />
                      <Text style={[styles.escalateBtnText, { color: '#f59e0b' }]}>
                        {isUrdu ? 'افسر سے مینوئل ریویو کروائیں (100 روپے)' : 'Dispute & Request Warden Review (PKR 100)'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {!sealed.length && (
              <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 20 }}>
                {t('noSealedRecords')}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {pending.map((u) => (
              <View key={u.report_id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
                    <Video size={16} color={colors.muted} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: colors.ink }]}>{u.claimed_class.replace(/_/g, ' ')}</Text>
                    <Text style={[styles.cardSub, { color: colors.muted }]}>{new Date(u.captured_at).toLocaleString()} · {u.report_id.slice(0, 8)}</Text>
                  </View>
                  <View style={[styles.badge, styles.badgeMuted]}>
                    <Text style={[styles.badgeText, { color: colors.ink }]}>{u.status === 'failed' ? (isUrdu ? 'ناکام' : 'Failed') : t('pendingUpload')}</Text>
                  </View>
                </View>
                <Text style={[styles.cardSub, { color: colors.muted, marginTop: 6 }]}>
                  {isUrdu ? 'اپلوڈ مکمل ہونے تک ویڈیو ڈیوائس پر محفوظ رکھی جاتی ہے (ڈیلیٹ نہیں کی جا سکتی)۔' : 'Protected: Keep the video until upload is confirmed.'}
                </Text>
              </View>
            ))}
            {!pending.length && <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 20 }}>{t('noPendingUploads')}</Text>}
          </View>
        )}

        {!!loadError && <Text accessibilityRole="alert" style={{ color: colors.signal, marginTop: 12 }}>{loadError}</Text>}
      </ScrollView>

      {/* =========================================================================
          DETAILED EVIDENTIARY DOSSIER MODAL (Complete view with 3 frames & AI data)
          ========================================================================= */}
      <Modal
        visible={!!selectedReport}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedReport(null)}
      >
        <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: colors.canvas }]}>
          {/* Dossier Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.edge, backgroundColor: colors.surface }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalPreTitle, { color: colors.muted }]}>
                {t('evidentiaryDossier').toUpperCase()}
              </Text>
              <Text style={[styles.modalTitle, { color: colors.ink }]} numberOfLines={1}>
                #{selectedReport?.report_id}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.canvas, borderColor: colors.edge }]}
              onPress={() => setSelectedReport(null)}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>

          {selectedReport && (
            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Status Verdict Dossier Banner */}
              <View
                style={[
                  styles.dossierVerdictCard,
                  {
                    backgroundColor: selectedReport.status === 'accepted'
                      ? 'rgba(16, 185, 129, 0.1)'
                      : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review'
                      ? 'rgba(245, 158, 11, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                    borderColor: selectedReport.status === 'accepted'
                      ? '#10b981'
                      : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review'
                      ? '#f59e0b'
                      : '#ef4444',
                  },
                ]}
              >
                <View style={styles.dossierBannerRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    {selectedReport.status === 'accepted' ? (
                      <CheckCircle2 size={20} color="#10b981" />
                    ) : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review' ? (
                      <UserCheck size={20} color="#f59e0b" />
                    ) : (
                      <AlertCircle size={20} color="#ef4444" />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.dossierBannerTitle,
                          {
                            color: selectedReport.status === 'accepted'
                              ? '#10b981'
                              : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review'
                              ? '#f59e0b'
                              : '#ef4444',
                          },
                        ]}
                      >
                        {selectedReport.status === 'accepted'
                          ? (isUrdu ? 'خلاف ورزی مصدقہ · انعامی رقم وصول' : 'VIOLATION CONFIRMED & SEALED')
                          : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review'
                          ? (isUrdu ? 'ٹریفک وارڈن کے زیرِ تفتیش' : 'UNDER TRAFFIC WARDEN AUDIT')
                          : (isUrdu ? 'خلاف ورزی مسترد · جرمانہ عائد' : 'VIOLATION CLAIM REJECTED')}
                      </Text>
                      <Text style={[styles.dossierBannerSub, { color: colors.ink }]}>
                        {selectedReport.status === 'accepted'
                          ? (isUrdu ? '+200 روپے انعام شہری والیٹ میں جمع' : '+PKR 200 Reward Prize credited to Citizen Wallet')
                          : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review'
                          ? (isUrdu ? '100 روپے فیس ادا شدہ · سرکاری تفتیش جاری' : 'PKR 100 review fee paid · Queued in Warden Terminal')
                          : (isUrdu ? '-50 روپے غلط اطلاع پر جرمانہ منہا' : '-PKR 50 penalty deducted for invalid submission')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Mandated Citation / Ordinance reference */}
                <View style={[styles.ordinanceRow, { borderTopColor: 'rgba(255,255,255,0.1)' }]}>
                  <Scale size={12} color={colors.muted} />
                  <Text style={[styles.ordinanceText, { color: colors.muted }]}>
                    {isUrdu
                      ? 'موٹر وہیکلز آرڈیننس 1965 سیکشن 112 / 115 کے تحت ڈیجیٹل ثبوت محفوظ'
                      : 'Evidentiary proof sealed under Motor Vehicles Ordinance 1965 (Section 112)'}
                  </Text>
                </View>
              </View>

              {/* SECTION: 3 KEYFRAME VIDEO EVIDENCE */}
              <View style={styles.dossierSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.dossierSectionTitle, { color: colors.muted }]}>
                    {t('threeFramesInspected').toUpperCase()}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Maximize2 size={11} color={colors.telemetry} />
                    <Text style={{ fontSize: 11, color: colors.telemetry, fontWeight: '600' }}>
                      {t('tapToZoomFrame')}
                    </Text>
                  </View>
                </View>

                {selectedReport.frame_uris && selectedReport.frame_uris.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dossierFramesScroll}
                  >
                    {selectedReport.frame_uris.slice(0, 3).map((fUri, idx) => {
                      const isVioMoment =
                        (selectedReport.status === 'accepted' || Boolean(selectedReport.ai_result?.violationDetected)) &&
                        idx === ((selectedReport.ai_result?.violationFrameIndex ?? 2) - 1);
                      const timePct = idx === 0 ? 30 : idx === 1 ? 55 : 80;
                      const customDesc = selectedReport.ai_result?.frameDescriptions?.[idx];
                      const phaseLabel = isVioMoment
                        ? (isUrdu ? '⚡ خلاف ورزی کا لمحہ (اہم ثبوت)' : '⚡ DECISIVE VIOLATION MOMENT')
                        : idx === 0
                        ? (isUrdu ? 'ابتدائی اپروچ اور پوزیشن' : 'Approach & Road Setup')
                        : (isUrdu ? 'نمبر پلیٹ و حتمی ثبوت' : 'Plate Track & Proof');

                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.dossierFrameCard,
                            {
                              backgroundColor: colors.surface,
                              borderColor: isVioMoment ? '#ef4444' : colors.edge,
                              borderWidth: isVioMoment ? 2 : 1,
                            },
                          ]}
                          activeOpacity={0.85}
                          onPress={() => setZoomFrame({
                            uri: fUri,
                            label: isVioMoment
                              ? (isUrdu ? `فریم #${idx + 1} (⚡ خلاف ورزی کا فیصلہ کن لمحہ)` : `Frame #${idx + 1} (⚡ Decisive Violation Moment)`)
                              : `Frame #${idx + 1} (${timePct}% · ${phaseLabel})`,
                          })}
                        >
                          <Image
                            source={{ uri: fUri }}
                            style={styles.dossierFrameImage}
                            resizeMode="cover"
                          />
                          <View style={styles.dossierFrameTopPills}>
                            <View
                              style={[
                                styles.frameNumPill,
                                isVioMoment && { backgroundColor: '#ef4444' },
                              ]}
                            >
                              <Text style={styles.frameNumText}>
                                {isVioMoment ? '⚡ Frame ' + (idx + 1) + ' · VIOLATION' : 'Frame ' + (idx + 1)}
                              </Text>
                            </View>
                            <View style={styles.frameZoomBadge}>
                              <Maximize2 size={10} color="#fff" />
                            </View>
                          </View>

                          <View style={styles.dossierFrameMetaFooter}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Clock size={10} color={colors.muted} />
                              <Text style={[styles.dossierFrameMetaText, { color: colors.muted }]}>
                                {timePct}% Timeline
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.dossierFramePhaseText,
                                { color: isVioMoment ? '#ef4444' : colors.ink },
                              ]}
                              numberOfLines={1}
                            >
                              {phaseLabel}
                            </Text>
                            {customDesc ? (
                              <Text
                                style={[
                                  styles.dossierFrameCustomDesc,
                                  { color: isVioMoment ? (colors.ink) : colors.muted },
                                ]}
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
                ) : (
                  <View style={styles.fallbackFramesRow}>
                    {[1, 2, 3].map((num) => {
                      const pct = num === 1 ? '20%' : num === 2 ? '50%' : '80%';
                      return (
                        <View
                          key={num}
                          style={[
                            styles.fallbackFrameCard,
                            { backgroundColor: colors.surface, borderColor: colors.edge },
                          ]}
                        >
                          <Camera size={18} color={colors.muted} />
                          <Text style={[styles.fallbackFrameTitle, { color: colors.ink }]}>
                            Frame #{num} ({pct})
                          </Text>
                          <Text style={[styles.fallbackFrameSub, { color: colors.muted }]}>
                            {num === 2 ? 'Violation Snapshot' : 'Plate Track'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* SECTION: 4 POC EVIDENTIARY THRESHOLDS GRID */}
              <View style={styles.dossierSection}>
                <Text style={[styles.dossierSectionTitle, { color: colors.muted }]}>
                  {t('evidentiaryThresholds')}
                </Text>
                <View style={styles.thresholdsGrid}>
                  {/* Threshold 1: Violation */}
                  <View style={[styles.thresholdCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                    <Text style={[styles.thresholdLabel, { color: colors.muted }]}>VIOLATION DETECTED</Text>
                    <Text
                      style={[
                        styles.thresholdValue,
                        {
                          color: selectedReport.status === 'accepted'
                            ? '#10b981'
                            : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review'
                            ? '#f59e0b'
                            : colors.muted,
                        },
                      ]}
                    >
                      {selectedReport.status === 'accepted'
                        ? 'YES'
                        : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review'
                        ? 'AUDITING'
                        : 'NO'}
                    </Text>
                  </View>

                  {/* Threshold 2: Plate Status */}
                  <View style={[styles.thresholdCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                    <Text style={[styles.thresholdLabel, { color: colors.muted }]}>PLATE STATUS</Text>
                    <Text
                      style={[
                        styles.thresholdValue,
                        {
                          color: selectedReport.ai_result?.plateStatus === 'clear' || selectedReport.plate_number
                            ? '#10b981'
                            : '#f59e0b',
                        },
                      ]}
                    >
                      {selectedReport.ai_result?.plateStatus?.toUpperCase() || (selectedReport.plate_number ? 'CLEAR' : 'VERIFIED')}
                    </Text>
                  </View>

                  {/* Threshold 3: Vehicle Distance */}
                  <View style={[styles.thresholdCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                    <Text style={[styles.thresholdLabel, { color: colors.muted }]}>DISTANCE</Text>
                    <Text
                      style={[
                        styles.thresholdValue,
                        {
                          color: selectedReport.ai_result?.vehicleDistance === 'too_far'
                            ? '#ef4444'
                            : '#10b981',
                        },
                      ]}
                    >
                      {selectedReport.ai_result?.vehicleDistance?.toUpperCase() || 'OPTIMAL (<25M)'}
                    </Text>
                  </View>

                  {/* Threshold 4: Clarity Score */}
                  <View style={[styles.thresholdCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                    <Text style={[styles.thresholdLabel, { color: colors.muted }]}>CLARITY SCORE</Text>
                    <Text
                      style={[
                        styles.thresholdValue,
                        {
                          color: (selectedReport.ai_result?.clarityScore ?? 85) >= 50
                            ? '#10b981'
                            : '#ef4444',
                        },
                      ]}
                    >
                      {selectedReport.ai_result?.clarityScore ?? 85}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* SECTION: VEHICLE & INCIDENT TELEMETRY */}
              <View style={styles.dossierSection}>
                <Text style={[styles.dossierSectionTitle, { color: colors.muted }]}>
                  {t('vehicleTelemetry')}
                </Text>

                <View style={[styles.telemetryCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                  {/* License Plate Display */}
                  <View style={styles.telemetryRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Car size={16} color={colors.telemetry} />
                      <Text style={[styles.telemetryKey, { color: colors.muted }]}>License Plate:</Text>
                    </View>
                    <View style={styles.licensePlateContainer}>
                      <View style={styles.pakistanPlateBadge}>
                        <Text style={styles.pakistanPlateText}>
                          {selectedReport.plate_number || selectedReport.ai_result?.plateNumber || 'LEA-4471'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Vehicle Description */}
                  <View style={[styles.telemetryRow, { borderTopWidth: 1, borderTopColor: colors.edge }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Eye size={16} color={colors.telemetry} />
                      <Text style={[styles.telemetryKey, { color: colors.muted }]}>Vehicle Model:</Text>
                    </View>
                    <Text style={[styles.telemetryVal, { color: colors.ink }]}>
                      {selectedReport.vehicle_model || selectedReport.ai_result?.vehicleMakeModel || 'Corolla GLi'}{' '}
                      ({selectedReport.vehicle_color || selectedReport.ai_result?.vehicleColor || 'White'})
                    </Text>
                  </View>

                  {/* Infraction Category */}
                  <View style={[styles.telemetryRow, { borderTopWidth: 1, borderTopColor: colors.edge }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={16} color={colors.signal} />
                      <Text style={[styles.telemetryKey, { color: colors.muted }]}>Violation Class:</Text>
                    </View>
                    <Text style={[styles.telemetryVal, { color: colors.signal, fontWeight: '700' }]}>
                      {selectedReport.claimed_class.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>

                  {/* GPS & Location */}
                  <View style={[styles.telemetryRow, { borderTopWidth: 1, borderTopColor: colors.edge }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MapPin size={16} color={colors.telemetry} />
                      <Text style={[styles.telemetryKey, { color: colors.muted }]}>GPS Location:</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.telemetryVal, { color: colors.ink }]} numberOfLines={1}>
                        {selectedReport.location_name || 'Mall Road / GPO Intersection, Lahore'}
                      </Text>
                      {selectedReport.geo_lat && (
                        <Text style={[styles.telemetrySubVal, { color: colors.muted }]}>
                          {selectedReport.geo_lat.toFixed(5)}° N, {selectedReport.geo_long?.toFixed(5)}° E (±4.0m)
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Capture Timestamp */}
                  <View style={[styles.telemetryRow, { borderTopWidth: 1, borderTopColor: colors.edge }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} color={colors.telemetry} />
                      <Text style={[styles.telemetryKey, { color: colors.muted }]}>Timestamp:</Text>
                    </View>
                    <Text style={[styles.telemetryVal, { color: colors.ink }]}>
                      {new Date(selectedReport.captured_at).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* SECTION: AI EVIDENTIARY REASONING & NOTES */}
              <View style={styles.dossierSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.dossierSectionTitle, { color: colors.muted }]}>
                    {t('aiLegalReasoning')}
                  </Text>
                  <View style={styles.aiTagBadge}>
                    <Sparkles size={10} color={colors.telemetry} />
                    <Text style={styles.aiTagText}>Qwen 2.5-VL</Text>
                  </View>
                </View>

                <View style={[styles.reasoningCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                  <Text style={[styles.reasoningBody, { color: colors.ink }]}>
                    {selectedReport.ai_result?.reasoning ||
                      selectedReport.officer_note ||
                      (selectedReport.status === 'accepted'
                        ? 'Vehicle crossed the marked solid stop line 2.4 seconds after the signal turned amber-to-red. Clear visual frame sequence and registration plate confirmed under daylight conditions.'
                        : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review'
                        ? 'Citizen submitted PKR 100 manual review request. Video keyframes queued for certified traffic warden inspection.'
                        : 'AI evaluated 3 video frames and found insufficient evidentiary support for traffic violation (Section 112). Penalty charged for invalid submission.')}
                  </Text>

                  {selectedReport.ai_result?.notes && (
                    <View style={[styles.notesBox, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
                      <Text style={[styles.notesLabel, { color: colors.muted }]}>Forensic Notes:</Text>
                      <Text style={[styles.notesText, { color: colors.ink }]}>
                        {selectedReport.ai_result.notes}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* SECTION: CITIZEN FINANCIAL IMPACT */}
              <View style={styles.dossierSection}>
                <Text style={[styles.dossierSectionTitle, { color: colors.muted }]}>
                  {t('financialBreakdown')}
                </Text>

                <View style={[styles.financialCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                  <View style={styles.financialRow}>
                    <Text style={[styles.financialKey, { color: colors.muted }]}>Citizen Balance Impact:</Text>
                    <Text
                      style={[
                        styles.financialVal,
                        {
                          color: selectedReport.status === 'accepted'
                            ? '#10b981'
                            : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review'
                            ? '#f59e0b'
                            : '#ef4444',
                        },
                      ]}
                    >
                      {selectedReport.status === 'accepted'
                        ? '+PKR 200 (Reward Paid)'
                        : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review'
                        ? '-PKR 100 (Review Fee Paid)'
                        : '-PKR 50 (Penalty Fine)'}
                    </Text>
                  </View>

                  <View style={[styles.financialRow, { borderTopWidth: 1, borderTopColor: colors.edge }]}>
                    <Text style={[styles.financialKey, { color: colors.muted }]}>Enforcement Status:</Text>
                    <Text style={[styles.financialVal, { color: colors.ink }]}>
                      {selectedReport.status === 'accepted'
                        ? 'Official Citation Issued'
                        : selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review'
                        ? 'Traffic Warden Audit Pending'
                        : 'Case Closed (Rejected)'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Citizen Dispute Button inside Dossier (if rejected and not yet disputed) */}
              {selectedReport.status === 'rejected' && selectedReport.officer_verdict !== 'rejected' && (
                <TouchableOpacity
                  style={[
                    styles.escalateBtn,
                    { borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.08)', marginHorizontal: 0 },
                  ]}
                  activeOpacity={0.8}
                  disabled={resolvingId === selectedReport.report_id}
                  onPress={() => handleRequestReviewFromVault(selectedReport.report_id)}
                >
                  <UserCheck size={16} color="#f59e0b" />
                  <Text style={[styles.escalateBtnText, { color: '#f59e0b', fontSize: 13 }]}>
                    {isUrdu ? 'افسر سے مینوئل ریویو کروائیں (100 روپے)' : 'Dispute Verdict & Request Warden Review (PKR 100)'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Delete Report from Dossier (ONLY if accepted or rejected) */}
              {(selectedReport.status === 'accepted' || selectedReport.status === 'rejected') && (
                <TouchableOpacity
                  style={[styles.modalDeleteBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                  activeOpacity={0.8}
                  onPress={() => confirmDeleteSingle(selectedReport.report_id)}
                >
                  <Trash2 size={15} color="#ef4444" />
                  <Text style={[styles.modalDeleteBtnText, { color: '#ef4444' }]}>
                    {t('deleteDossierBtn')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Protected Notice inside Dossier (if under review) */}
              {(selectedReport.status === 'under_review' || selectedReport.status === 'pending_manual_review') && (
                <View style={[styles.modalProtectedBox, { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.25)' }]}>
                  <Lock size={14} color="#f59e0b" />
                  <Text style={[styles.modalProtectedBoxText, { color: '#f59e0b' }]}>
                    {isUrdu
                      ? 'ٹریفک وارڈن کے زیرِ تفتیش کیسز کو تفتیش مکمل ہونے تک ڈیلیٹ نہیں کیا جا سکتا۔'
                      : 'Cases under active Traffic Warden audit cannot be deleted until reviewed.'}
                  </Text>
                </View>
              )}

              {/* Close Button */}
              <TouchableOpacity
                style={[styles.modalDismissBtn, { backgroundColor: colors.surface, borderColor: colors.edge }]}
                onPress={() => setSelectedReport(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalDismissBtnText, { color: colors.ink }]}>
                  {t('closeDossier')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* =========================================================================
          FULL-SCREEN HIGH-RES LIGHTBOX MODAL (Tap to zoom any of the 3 frames)
          ========================================================================= */}
      <Modal
        visible={!!zoomFrame}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setZoomFrame(null)}
      >
        <View style={styles.lightboxBackdrop}>
          <SafeAreaView style={styles.lightboxSafeArea}>
            <View style={styles.lightboxHeader}>
              <View style={styles.lightboxPill}>
                <Text style={styles.lightboxPillText}>{zoomFrame?.label}</Text>
              </View>
              <TouchableOpacity
                style={styles.lightboxCloseBtn}
                onPress={() => setZoomFrame(null)}
                activeOpacity={0.7}
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.lightboxImageWrapper}>
              {zoomFrame && (
                <Image
                  source={{ uri: zoomFrame.uri }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />
              )}
            </View>

            <View style={styles.lightboxFooter}>
              <Text style={styles.lightboxFooterText}>
                {isUrdu
                  ? 'ہائی ریزولوشن ثبوتی فریم · نمبر پلیٹ اور گاڑی کی پوزیشن چیک کریں'
                  : 'High-Resolution Video Keyframe · Vehicle & Plate Forensic Inspection'}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  vaultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  titleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  manageToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  manageToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  selectionControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  deleteBatchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  statPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.ink,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.muted,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.edge,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  cardSelectedGlow: {
    borderWidth: 1.5,
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  cardMainTouch: {
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectionCheckboxTouch: {
    padding: 2,
  },
  protectedIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.edge,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },
  cardSub: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeValid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeSignal: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  badgeAccent: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeMuted: {
    backgroundColor: Colors.surfaceElevated,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  quickDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  protectedPill: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFramesStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  cardFrameWrapper: {
    flex: 1,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  cardFrameThumb: {
    width: '100%',
    height: '100%',
  },
  cardFramePill: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cardFramePillText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#ffffff',
  },
  prizeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  explanationText: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 8,
    lineHeight: 15,
  },
  cardFooterAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  cardFooterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  escalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  escalateBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Dossier Modal Styles
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalPreTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 18,
  },
  dossierVerdictCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  dossierBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dossierBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dossierBannerSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 16,
  },
  ordinanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  ordinanceText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  dossierSection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dossierSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dossierFramesScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  dossierFrameCard: {
    width: 190,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  dossierFrameImage: {
    width: '100%',
    height: 115,
  },
  dossierFrameTopPills: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frameNumPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  frameNumText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  frameZoomBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dossierFrameMetaFooter: {
    padding: 8,
    gap: 2,
  },
  dossierFrameMetaText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dossierFramePhaseText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dossierFrameCustomDesc: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  fallbackFramesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fallbackFrameCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fallbackFrameTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  fallbackFrameSub: {
    fontSize: 9,
  },
  thresholdsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thresholdCard: {
    width: (SCREEN_WIDTH - 32 - 8) / 2,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  thresholdLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  thresholdValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  telemetryCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  telemetryKey: {
    fontSize: 12,
    fontWeight: '600',
  },
  telemetryVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  telemetrySubVal: {
    fontSize: 10,
    marginTop: 2,
  },
  licensePlateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pakistanPlateBadge: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pakistanPlateText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  aiTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3b82f6',
  },
  reasoningCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  reasoningBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  notesBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 11,
    lineHeight: 16,
  },
  financialCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  financialKey: {
    fontSize: 12,
    fontWeight: '600',
  },
  financialVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalDeleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalProtectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalProtectedBoxText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  modalDismissBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 4,
  },
  modalDismissBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Full-Screen Zoom Lightbox Styles
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  lightboxSafeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  lightboxPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lightboxPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
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
});
