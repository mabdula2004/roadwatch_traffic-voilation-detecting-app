import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Banknote,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  Award,
  CreditCard,
  Scale,
  ShieldCheck,
  FileText,
  Sparkles,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Colors } from '../../constants/theme';
import { useUserProfile } from '../../contexts/UserContext';
import {
  getWalletBalance,
  rechargeWalletBalance,
  getStoredTransactions,
  WalletState,
  WalletTransaction,
} from '../../lib/wallet';
import {
  getPenaltyCitations,
  getLocalReports,
  PenaltyCitation,
  StoredCaseReport,
} from '../../lib/report';

interface WalletProps {
  onSelectFine?: (fineId: string) => void;
}

type TabType = 'history' | 'citations';
type FilterType = 'all' | 'rewards' | 'deductions' | 'topups';

function formatDateTime(isoString?: string): { date: string; time: string; full: string } {
  if (!isoString) return { date: 'N/A', time: '', full: 'N/A' };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: isoString, time: '', full: isoString };
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date, time, full: `${date} · ${time}` };
  } catch {
    return { date: isoString, time: '', full: isoString };
  }
}

/**
 * Merges explicitly stored transactions with existing local reports and citations
 * so historical items (past rewards, fines, review fees) are seamlessly visible.
 */
function buildSynthesizedTransactions(
  storedTx: WalletTransaction[],
  reports: StoredCaseReport[],
  citations: PenaltyCitation[],
  isUrdu: boolean
): WalletTransaction[] {
  const result: WalletTransaction[] = [...storedTx];
  const existingKeys = new Set(
    storedTx.map(t => `${t.type}_${t.reportId || ''}_${t.amount}`)
  );

  // 1. Synthesize from local reports
  for (const rep of reports) {
    const repId = rep.reportId || rep.clientCaptureId;
    if (!repId) continue;

    // Accepted report -> Bounty Reward (+PKR 200)
    if (rep.status === 'accepted') {
      const key = `reward_${repId}_200`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        result.push({
          id: `TX-REP-REW-${repId.slice(-6)}`,
          type: 'reward',
          amount: 200,
          title: isUrdu ? 'شہری انعامی رقم (تصدیق شدہ)' : 'Citizen Bounty Reward',
          subtitle: rep.aiResult?.violationName
            ? (isUrdu ? `${rep.aiResult.violationName} پر تصدیق شدہ انعام` : `Verified ${rep.aiResult.violationName} prize`)
            : (rep.claimedClass && rep.claimedClass !== 'auto_ai_detect'
              ? (isUrdu ? `${rep.claimedClass} خلاف ورزی پر تصدیق شدہ انعام` : `Verified ${rep.claimedClass} violation`)
              : (isUrdu ? 'ٹریفک خلاف ورزی کی تصدیق پر انعام' : 'Verified traffic violation bounty prize')),
          timestamp: rep.uploadedAt || rep.capturedAt || new Date().toISOString(),
          reportId: repId,
          locationName: rep.locationName,
          reason: rep.aiResult?.reasoning,
        });
      }
    }

    // Under Review -> Manual Review Fee (-PKR 100)
    if (rep.status === 'under_review' || rep.status === 'pending_manual_review') {
      const key = `manual_review_fee_${repId}_-100`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        result.push({
          id: `TX-REP-REV-${repId.slice(-6)}`,
          type: 'manual_review_fee',
          amount: -100,
          title: isUrdu ? 'ٹریفک وارڈن ریویو فیس' : 'Traffic Warden Review Fee',
          subtitle: isUrdu ? 'دستی جائزے کے لیے جمع شدہ کیس' : 'Case submitted for manual officer audit',
          timestamp: rep.uploadedAt || rep.capturedAt || new Date().toISOString(),
          reportId: repId,
          locationName: rep.locationName,
        });
      }
    }

    // Rejected report -> False report penalty fine (-PKR 50)
    if (rep.status === 'rejected') {
      const key = `penalty_fine_${repId}_-50`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        result.push({
          id: `TX-REP-PEN-${repId.slice(-6)}`,
          type: 'penalty_fine',
          amount: -50,
          title: isUrdu ? 'غلط رپورٹ جمع کروانے کا چالان' : 'False Report Submission Penalty',
          subtitle: rep.aiResult?.reasoning?.slice(0, 80) || (isUrdu ? 'ویڈیو فوٹیج پر خلاف ورزی ثابت نہ ہو سکی' : 'Insufficient violation proof on video footage'),
          timestamp: rep.uploadedAt || rep.capturedAt || new Date().toISOString(),
          reportId: repId,
          locationName: rep.locationName,
          reason: rep.aiResult?.reasoning,
        });
      }
    }
  }

  // 2. Synthesize from citations
  for (const cit of citations) {
    const key = `penalty_fine_${cit.reportId}_-${cit.amountPkr}`;
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      result.push({
        id: `TX-CIT-${cit.citationId}`,
        type: 'penalty_fine',
        amount: -cit.amountPkr,
        title: isUrdu ? 'غلط رپورٹ جمع کروانے کا چالان' : 'False Report Submission Penalty',
        subtitle: cit.reason?.slice(0, 80) || (isUrdu ? 'غلط رپورٹنگ پر عائد کردہ چالان' : 'Automated fine for invalid report footage'),
        timestamp: cit.issuedAt,
        reportId: cit.reportId,
        locationName: cit.locationName,
        reason: cit.reason,
      });
    }
  }

  // Sort descending by timestamp
  return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function Wallet({ onSelectFine }: WalletProps) {
  const { colors } = useTheme();
  const { profile } = useUserProfile();
  const { t, isUrdu } = useLanguage();

  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [citations, setCitations] = useState<PenaltyCitation[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAllTransactions, setShowAllTransactions] = useState<boolean>(false);
  const [showAllCitations, setShowAllCitations] = useState<boolean>(false);
  const [expandedCitationIds, setExpandedCitationIds] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');

  const toggleCitationExpand = (id: string) => {
    setExpandedCitationIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const loadData = useCallback(async () => {
    try {
      const [walletState, penaltyList, storedTxList, localRepList] = await Promise.all([
        getWalletBalance(),
        getPenaltyCitations(),
        getStoredTransactions(),
        getLocalReports(),
      ]);

      // Enrich citations with location and reasoning from local reports if missing
      const enrichedCitations = penaltyList.map(cit => {
        const match = localRepList.find(r => r.reportId === cit.reportId || r.clientCaptureId === cit.reportId);
        return {
          ...cit,
          locationName: cit.locationName || match?.locationName,
          latitude: cit.latitude ?? match?.latitude,
          longitude: cit.longitude ?? match?.longitude,
          reason: cit.reason || match?.aiResult?.reasoning || (isUrdu ? 'ویڈیو فوٹیج میں ٹریفک قوانین کی کوئی خلاف ورزی نہیں پائی گئی۔' : 'AI evaluated video footage and found no actionable violation.'),
          claimedClass: cit.claimedClass || match?.claimedClass,
        };
      });

      const synthesized = buildSynthesizedTransactions(storedTxList, localRepList, enrichedCitations, isUrdu);

      setWallet(walletState);
      setCitations(enrichedCitations);
      setTransactions(synthesized);
      setLoadError('');
    } catch (e) {
      console.warn('Error loading wallet data:', e);
      setWallet({ balance: 500, pending_clearance: 0, epay_linked: true });
    } finally {
      setIsLoading(false);
    }
  }, [isUrdu]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleTopUp = async (amount: number) => {
    Alert.alert(
      isUrdu ? 'والیٹ ریچارج' : 'Top-Up Wallet',
      isUrdu
        ? `کیا آپ واقعی اپنے والیٹ میں PKR ${amount.toLocaleString()} کا بیلنس شامل کرنا چاہتے ہیں؟`
        : `Are you sure you want to recharge PKR ${amount.toLocaleString()} into your wallet?`,
      [
        { text: isUrdu ? 'منسوخ کریں' : 'Cancel', style: 'cancel' },
        {
          text: isUrdu ? 'ریچارج کریں' : 'Confirm Recharge',
          onPress: async () => {
            const res = await rechargeWalletBalance(amount, {
              title: isUrdu ? 'والیٹ ٹاپ اپ (ای پے)' : 'Wallet Top-Up (ePay)',
              subtitle: isUrdu ? 'منسلک ای پے اکاؤنٹ سے بیلنس ریچارج' : 'Direct balance credit via linked ePay',
              type: 'top_up',
            });
            if (res.success) {
              setWallet(prev => prev ? { ...prev, balance: res.newBalance } : { balance: res.newBalance, pending_clearance: 0, epay_linked: true });
              void loadData();
            }
          },
        },
      ]
    );
  };

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions;
    if (filter === 'rewards') {
      return transactions.filter(t => t.type === 'reward' || t.type === 'review_refund_bonus' || (t.amount > 0 && t.type !== 'top_up'));
    }
    if (filter === 'deductions') {
      return transactions.filter(t => t.type === 'penalty_fine' || t.type === 'manual_review_fee' || t.amount < 0);
    }
    if (filter === 'topups') {
      return transactions.filter(t => t.type === 'top_up');
    }
    return transactions;
  }, [transactions, filter]);

  const INITIAL_DISPLAY_COUNT = 5;

  useEffect(() => {
    setShowAllTransactions(false);
  }, [filter]);

  const displayedTransactions = useMemo(() => {
    if (showAllTransactions) return filteredTransactions;
    return filteredTransactions.slice(0, INITIAL_DISPLAY_COUNT);
  }, [filteredTransactions, showAllTransactions]);

  const displayedCitations = useMemo(() => {
    if (showAllCitations) return citations;
    return citations.slice(0, INITIAL_DISPLAY_COUNT);
  }, [citations, showAllCitations]);

  const totalRewardsWon = useMemo(() => {
    return transactions
      .filter(t => t.type === 'reward' || t.type === 'review_refund_bonus')
      .reduce((acc, curr) => acc + Math.max(0, curr.amount), 0);
  }, [transactions]);

  const totalFinesPaid = useMemo(() => {
    return citations.reduce((acc, curr) => acc + (curr.amountPkr || 0), 0);
  }, [citations]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Title & Subtitle */}
        <Text style={[styles.title, { color: colors.ink }]}>{t('citizenWallet')}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {t('walletSubtitle')}
        </Text>

        {/* Primary Reward & Balance Card */}
        <View style={[styles.rewardCard, { backgroundColor: colors.surface, borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
          <View style={styles.rewardHeader}>
            <View style={styles.rewardTitleRow}>
              <Banknote size={18} color={colors.accent} />
              <Text style={[styles.rewardLabel, { color: colors.muted }]}>{t('rewardBalance')}</Text>
            </View>
            <View style={styles.badgeEpay}>
              <Text style={[styles.badgeEpayText, { color: colors.accent }]}>
                {wallet?.epay_linked ? t('epayLinked') : t('activeAccount')}
              </Text>
            </View>
          </View>

          <Text style={[styles.rewardAmount, { color: colors.ink }]}>
            {wallet ? `PKR ${(wallet.balance ?? 0).toLocaleString()}` : 'PKR 500'}
          </Text>
          <Text style={[styles.rewardSub, { color: colors.muted }]}>
            {wallet ? `PKR ${(wallet.pending_clearance ?? 0).toLocaleString()} ${t('pendingClearance')}` : t('loadingWallet')}
          </Text>

          {/* Quick Test Top Up Buttons */}
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' }}>
              {t('quickRecharge')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.topUpBtn, { backgroundColor: colors.canvas, borderColor: colors.edge }]}
                onPress={() => handleTopUp(100)}
                activeOpacity={0.7}
              >
                <PlusCircle size={13} color={colors.telemetry} />
                <Text style={[styles.topUpBtnText, { color: colors.ink }]}>+PKR 100</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.topUpBtn, { backgroundColor: colors.canvas, borderColor: colors.edge }]}
                onPress={() => handleTopUp(500)}
                activeOpacity={0.7}
              >
                <PlusCircle size={13} color={colors.telemetry} />
                <Text style={[styles.topUpBtnText, { color: colors.ink }]}>+PKR 500</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.topUpBtn, { backgroundColor: colors.canvas, borderColor: colors.edge }]}
                onPress={() => handleTopUp(1000)}
                activeOpacity={0.7}
              >
                <PlusCircle size={13} color={colors.telemetry} />
                <Text style={[styles.topUpBtnText, { color: colors.ink }]}>+PKR 1,000</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Withdrawal status button */}
          <TouchableOpacity style={[styles.withdrawBtn, { backgroundColor: colors.accent, opacity: 0.6, marginTop: 14 }]} disabled activeOpacity={0.85}>
            <Text style={[styles.withdrawText, { color: colors.canvas }]}>{t('withdrawUnavailable')}</Text>
            <ArrowUpRight size={16} color={colors.canvas} />
          </TouchableOpacity>
        </View>

        {/* Summary Metric Stats */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Award size={14} color={colors.valid} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
                {isUrdu ? 'کل حاصل شدہ انعامات' : 'Total Rewards'}
              </Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.valid }}>
              +PKR {totalRewardsWon.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <AlertTriangle size={14} color={colors.signal} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
                {isUrdu ? 'کل چالان و جرمانے' : 'Total Citations'}
              </Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.signal }}>
              {citations.length} ({totalFinesPaid > 0 ? `-PKR ${totalFinesPaid}` : 'PKR 0'})
            </Text>
          </View>
        </View>

        {/* Segmented Navigation Switcher: [ Transaction History ] | [ Citations (N) ] */}
        <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'history' && [styles.segmentBtnActive, { backgroundColor: colors.canvas }],
            ]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <FileText size={15} color={activeTab === 'history' ? colors.telemetry : colors.muted} />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeTab === 'history' ? colors.ink : colors.muted },
                activeTab === 'history' && styles.segmentBtnTextActive,
              ]}
            >
              {t('transactionHistory')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'citations' && [styles.segmentBtnActive, { backgroundColor: colors.canvas }],
            ]}
            onPress={() => setActiveTab('citations')}
            activeOpacity={0.8}
          >
            <AlertTriangle size={15} color={activeTab === 'citations' ? colors.signal : colors.muted} />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeTab === 'citations' ? colors.ink : colors.muted },
                activeTab === 'citations' && styles.segmentBtnTextActive,
              ]}
            >
              {t('citations')}
            </Text>
            {citations.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.signal }]}>
                <Text style={styles.countBadgeText}>{citations.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* TAB 1: TRANSACTION HISTORY */}
        {activeTab === 'history' && (
          <View style={{ marginTop: 12 }}>
            {/* Filter pills */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  { borderColor: filter === 'all' ? colors.telemetry : colors.edge, backgroundColor: filter === 'all' ? 'rgba(6, 182, 212, 0.12)' : colors.surface },
                ]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterPillText, { color: filter === 'all' ? colors.telemetry : colors.muted }]}>
                  {t('allTransactions')} ({transactions.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  { borderColor: filter === 'rewards' ? colors.valid : colors.edge, backgroundColor: filter === 'rewards' ? 'rgba(16, 185, 129, 0.12)' : colors.surface },
                ]}
                onPress={() => setFilter('rewards')}
              >
                <Text style={[styles.filterPillText, { color: filter === 'rewards' ? colors.valid : colors.muted }]}>
                  {t('rewards')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  { borderColor: filter === 'deductions' ? colors.signal : colors.edge, backgroundColor: filter === 'deductions' ? 'rgba(239, 68, 68, 0.12)' : colors.surface },
                ]}
                onPress={() => setFilter('deductions')}
              >
                <Text style={[styles.filterPillText, { color: filter === 'deductions' ? colors.signal : colors.muted }]}>
                  {t('penalties')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  { borderColor: filter === 'topups' ? colors.accent : colors.edge, backgroundColor: filter === 'topups' ? 'rgba(245, 158, 11, 0.12)' : colors.surface },
                ]}
                onPress={() => setFilter('topups')}
              >
                <Text style={[styles.filterPillText, { color: filter === 'topups' ? colors.accent : colors.muted }]}>
                  {t('recharges')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Transaction List */}
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.telemetry} />
              </View>
            ) : filteredTransactions.length > 0 ? (
              <View style={styles.itemsList}>
                {displayedTransactions.map(item => {
                  const isPositive = item.amount > 0;
                  const dt = formatDateTime(item.timestamp);

                  // Pick visual iconography
                  let iconElement = <ArrowDownLeft size={16} color={colors.valid} />;
                  let iconBg = 'rgba(16, 185, 129, 0.15)';
                  let amountColor = colors.valid;

                  if (item.type === 'reward' || item.type === 'review_refund_bonus') {
                    iconElement = <Award size={16} color={colors.valid} />;
                    iconBg = 'rgba(16, 185, 129, 0.15)';
                    amountColor = colors.valid;
                  } else if (item.type === 'top_up') {
                    iconElement = <CreditCard size={16} color={colors.telemetry} />;
                    iconBg = 'rgba(6, 182, 212, 0.15)';
                    amountColor = colors.telemetry;
                  } else if (item.type === 'penalty_fine') {
                    iconElement = <AlertTriangle size={16} color={colors.signal} />;
                    iconBg = 'rgba(239, 68, 68, 0.15)';
                    amountColor = colors.signal;
                  } else if (item.type === 'manual_review_fee') {
                    iconElement = <Scale size={16} color={colors.accent} />;
                    iconBg = 'rgba(245, 158, 11, 0.15)';
                    amountColor = colors.accent;
                  }

                  return (
                    <View
                      key={item.id}
                      style={[styles.transactionCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}
                    >
                      {/* Left icon badge */}
                      <View style={[styles.txIconBadge, { backgroundColor: iconBg }]}>
                        {iconElement}
                      </View>

                      {/* Middle Details */}
                      <View style={{ flex: 1, paddingHorizontal: 10 }}>
                        <Text style={[styles.txTitle, { color: colors.ink }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[styles.txSubtitle, { color: colors.muted }]} numberOfLines={2}>
                          {item.subtitle}
                        </Text>

                        {/* Metadata row: time & location & reportId */}
                        <View style={styles.txMetaRow}>
                          <View style={styles.metaChip}>
                            <Clock size={11} color={colors.muted} />
                            <Text style={[styles.metaChipText, { color: colors.muted }]}>{dt.full}</Text>
                          </View>
                          {item.locationName && (
                            <View style={styles.metaChip}>
                              <MapPin size={11} color={colors.muted} />
                              <Text style={[styles.metaChipText, { color: colors.muted }]} numberOfLines={1}>
                                {item.locationName}
                              </Text>
                            </View>
                          )}
                          {item.reportId && (
                            <View style={[styles.caseChip, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
                              <Text style={[styles.caseChipText, { color: colors.telemetry }]}>
                                #{item.reportId.slice(0, 12)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Right Amount Column */}
                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text style={[styles.txAmountText, { color: amountColor }]}>
                          {isPositive ? `+PKR ${Math.abs(item.amount).toLocaleString()}` : `-PKR ${Math.abs(item.amount).toLocaleString()}`}
                        </Text>
                        <Text style={[styles.txStatusLabel, { color: colors.muted }]}>
                          {isPositive ? (item.type === 'top_up' ? 'CREDIT' : 'REWARD') : (item.type === 'penalty_fine' ? 'PENALTY' : 'FEE')}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                {filteredTransactions.length > INITIAL_DISPLAY_COUNT && (
                  <TouchableOpacity
                    style={[styles.showMoreBtn, { backgroundColor: colors.surface, borderColor: colors.edge }]}
                    onPress={() => setShowAllTransactions(prev => !prev)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.showMoreText, { color: colors.telemetry }]}>
                      {showAllTransactions
                        ? (isUrdu ? 'کم دکھائیں (تازہ ترین 5)' : `Show Less (Latest ${INITIAL_DISPLAY_COUNT})`)
                        : (isUrdu ? `مزید دکھائیں (+${filteredTransactions.length - INITIAL_DISPLAY_COUNT})` : `Show More (+${filteredTransactions.length - INITIAL_DISPLAY_COUNT} Transactions)`)}
                    </Text>
                    {showAllTransactions ? (
                      <ChevronUp size={16} color={colors.telemetry} />
                    ) : (
                      <ChevronDown size={16} color={colors.telemetry} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                <FileText size={32} color={colors.muted} />
                <Text style={[styles.emptyCardTitle, { color: colors.ink }]}>{t('noTransactions')}</Text>
                <Text style={[styles.emptyCardSub, { color: colors.muted }]}>
                  {isUrdu
                    ? 'جب آپ ویڈیوز اپلوڈ کریں گے یا انعامات حاصل کریں گے، تو تمام تفصیلات یہاں نظر آئیں گی۔'
                    : 'When you submit reports, win bounties, or top up balance, your full financial activity will appear here.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: CITATIONS & PENALTIES */}
        {activeTab === 'citations' && (
          <View style={{ marginTop: 12 }}>
            {/* Citations Advisory Banner */}
            <View style={[styles.citationBanner, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
              <AlertTriangle size={18} color={colors.signal} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.citationBannerTitle, { color: colors.signal }]}>
                  {isUrdu ? 'شہری چالان و احتسابی ضوابط' : 'Evidentiary Penalties Policy'}
                </Text>
                <Text style={[styles.citationBannerSub, { color: colors.muted }]}>
                  {isUrdu
                    ? 'موٹر وہیکلز آرڈیننس کے تحت اگر جمع کردہ ویڈیو میں خلاف ورزی ثابت نہ ہو تو غلط رپورٹنگ پر چالان عائد کیا جاتا ہے۔'
                    : 'Under traffic enforcement regulations, submitting video reports without confirmed violations incurs an automated penalty fine.'}
                </Text>
              </View>
            </View>

            {/* Citations List */}
            {citations.length > 0 ? (
              <View style={styles.itemsList}>
                {displayedCitations.map((c) => {
                  const dt = formatDateTime(c.issuedAt);
                  const isPaid = c.status === 'paid_from_wallet';
                  const isDisputed = c.status === 'disputed_in_review';
                  const isWaived = c.status === 'waived';
                  const isExpanded = !!expandedCitationIds[c.citationId];

                  return (
                    <View
                      key={c.citationId}
                      style={[
                        styles.detailedFineCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isPaid ? 'rgba(239, 68, 68, 0.35)' : isDisputed ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)',
                        },
                      ]}
                    >
                      {/* Compact Clickable Header Toggle */}
                      <TouchableOpacity
                        style={styles.fineHeaderRow}
                        onPress={() => toggleCitationExpand(c.citationId)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={15} color={colors.signal} />
                            <Text style={[styles.fineCardTitle, { color: colors.ink }]} numberOfLines={1}>
                              {isUrdu ? 'غلط رپورٹ چالان' : 'False Report Fine'}
                            </Text>
                          </View>
                          <Text style={[styles.fineCardId, { color: colors.muted }]}>
                            {c.reportId ? `Case #${c.reportId.slice(0, 10)}` : c.citationId} · {dt.date}
                          </Text>
                        </View>

                        {/* Right Amount, Status & Dropdown Chevron */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.fineAmountLarge, { color: colors.signal }]}>
                              PKR {c.amountPkr}
                            </Text>
                            <View
                              style={[
                                styles.fineStatusBadge,
                                {
                                  backgroundColor: isPaid
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : isDisputed
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(6, 182, 212, 0.15)',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.fineStatusBadgeText,
                                  {
                                    color: isPaid
                                      ? colors.valid
                                      : isDisputed
                                      ? colors.accent
                                      : colors.telemetry,
                                  },
                                ]}
                              >
                                {isPaid
                                  ? (isUrdu ? 'ادا شدہ' : 'PAID')
                                  : isDisputed
                                  ? (isUrdu ? 'زیر جائزہ' : 'IN REVIEW')
                                  : (isUrdu ? 'معاف شدہ' : 'WAIVED')}
                              </Text>
                            </View>
                          </View>
                          <View style={[styles.fineChevronBox, { backgroundColor: colors.canvas }]}>
                            {isExpanded ? (
                              <ChevronUp size={15} color={colors.muted} />
                            ) : (
                              <ChevronDown size={15} color={colors.muted} />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Expandable Details Accordion */}
                      {isExpanded && (
                        <View style={{ marginTop: 8 }}>
                          <View style={[styles.cardDivider, { backgroundColor: colors.edge }]} />

                          {/* Detail 1: Exact Date and Time */}
                          <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                              <Calendar size={12} color={colors.muted} />
                              <Text style={[styles.detailItemLabel, { color: colors.muted }]}>
                                {t('incidentTime')}:
                              </Text>
                              <Text style={[styles.detailItemValue, { color: colors.ink }]}>
                                {dt.full}
                              </Text>
                            </View>
                          </View>

                          {/* Detail 2: Incident Location */}
                          <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                              <MapPin size={12} color={colors.signal} />
                              <Text style={[styles.detailItemLabel, { color: colors.muted }]}>
                                {t('incidentLocation')}:
                              </Text>
                              <Text style={[styles.detailItemValue, { color: colors.ink }]} numberOfLines={2}>
                                {c.locationName
                                  ? c.locationName
                                  : c.latitude && c.longitude
                                  ? `${c.latitude.toFixed(4)}° N, ${c.longitude.toFixed(4)}° E`
                                  : (isUrdu ? 'لاہور اربن سیکٹر (جی پی ایس)' : 'Lahore Sector (GPS)')}
                              </Text>
                            </View>
                          </View>

                          {/* Detail 3: Official Enforcement Reason */}
                          <View style={[styles.reasonContainer, { backgroundColor: colors.canvas, borderColor: colors.edge }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                              <Scale size={11} color={colors.muted} />
                              <Text style={[styles.reasonHeader, { color: colors.muted }]}>
                                {t('violationReason')}:
                              </Text>
                            </View>
                            <Text style={[styles.reasonBody, { color: colors.ink }]}>
                              {c.reason}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
                {citations.length > INITIAL_DISPLAY_COUNT && (
                  <TouchableOpacity
                    style={[styles.showMoreBtn, { backgroundColor: colors.surface, borderColor: colors.edge }]}
                    onPress={() => setShowAllCitations(prev => !prev)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.showMoreText, { color: colors.telemetry }]}>
                      {showAllCitations
                        ? (isUrdu ? 'کم دکھائیں (تازہ ترین 5)' : `Show Less (Latest ${INITIAL_DISPLAY_COUNT})`)
                        : (isUrdu ? `مزید چالان دیکھیں (+${citations.length - INITIAL_DISPLAY_COUNT})` : `Show More (+${citations.length - INITIAL_DISPLAY_COUNT} Citations)`)}
                    </Text>
                    {showAllCitations ? (
                      <ChevronUp size={16} color={colors.telemetry} />
                    ) : (
                      <ChevronDown size={16} color={colors.telemetry} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
                <ShieldCheck size={36} color={colors.valid} />
                <Text style={[styles.emptyCardTitle, { color: colors.ink }]}>
                  {isUrdu ? 'کوئی زیر التواء چالان نہیں' : 'Clean Civic Record'}
                </Text>
                <Text style={[styles.emptyCardSub, { color: colors.muted }]}>
                  {t('noCitations')}
                </Text>
              </View>
            )}
          </View>
        )}

        {!!loadError && (
          <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.signal }]}>
            {loadError}
          </Text>
        )}
      </ScrollView>
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
    paddingBottom: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
    marginBottom: 16,
  },
  rewardCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: 14,
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.muted,
    letterSpacing: 0.8,
  },
  badgeEpay: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeEpayText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  rewardAmount: {
    fontSize: 34,
    fontWeight: 'bold',
    color: Colors.ink,
    marginTop: 8,
  },
  rewardSub: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 4,
  },
  topUpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
  },
  topUpBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    gap: 6,
  },
  withdrawText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.canvas,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginBottom: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  segmentBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 2,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsList: {
    gap: 10,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  txIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  txSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaChipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  caseChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  caseChipText: {
    fontSize: 9,
    fontWeight: '700',
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  txStatusLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  citationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  citationBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  citationBannerSub: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
  detailedFineCard: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  fineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fineCardTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  fineCardId: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  fineAmountLarge: {
    fontSize: 14,
    fontWeight: '800',
  },
  fineStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 2,
  },
  fineStatusBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  fineChevronBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  detailRow: {
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailItemLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  detailItemValue: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '700',
  },
  reasonContainer: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 2,
  },
  reasonHeader: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonBody: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyCardSub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
  errorText: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
