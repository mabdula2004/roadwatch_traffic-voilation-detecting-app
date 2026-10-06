import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banknote, ArrowUpRight, Clock, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useUserProfile } from '../../contexts/UserContext';

interface WalletNativeProps {
  onSelectFine?: (fineId: string) => void;
}

export function WalletNative({ onSelectFine }: WalletNativeProps) {
  const { colors } = useTheme();
  const { profile } = useUserProfile();
  const [wallet, setWallet] = useState<{ balance: number; pending_clearance: number; epay_linked: boolean } | null>(null);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase.from('reward_wallets').select('balance,pending_clearance,epay_linked').single();
      if (alive) { if (error) setLoadError(error.message); else { setWallet(data); setLoadError(''); } }
    }
    void load(); const timer = setInterval(() => { void load(); }, 12000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.ink }]}>Citizen Wallet</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Reward balance & citations {profile.plate ? `against ${profile.plate}` : 'for your account'}</Text>

        {/* Reward Card */}
        <View style={[styles.rewardCard, { backgroundColor: colors.surface, borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
          <View style={styles.rewardHeader}>
            <View style={styles.rewardTitleRow}>
              <Banknote size={16} color={colors.accent} />
              <Text style={[styles.rewardLabel, { color: colors.muted }]}>REWARD BALANCE</Text>
            </View>
            <View style={styles.badgeEpay}>
              <Text style={[styles.badgeEpayText, { color: colors.accent }]}>{wallet?.epay_linked ? 'e-Pay linked' : 'e-Pay unavailable'}</Text>
            </View>
          </View>

          <Text style={[styles.rewardAmount, { color: colors.ink }]}>{wallet ? `PKR ${(wallet.balance ?? 0).toLocaleString()}` : '—'}</Text>
          <Text style={[styles.rewardSub, { color: colors.muted }]}>{wallet ? `PKR ${(wallet.pending_clearance ?? 0).toLocaleString()} pending clearance` : 'Loading wallet…'}</Text>

          <TouchableOpacity style={[styles.withdrawBtn, { backgroundColor: colors.accent, opacity: 0.5 }]} disabled activeOpacity={0.85}>
            <Text style={[styles.withdrawText, { color: colors.canvas }]}>Withdrawal unavailable</Text>
            <ArrowUpRight size={16} color={colors.canvas} />
          </TouchableOpacity>
        </View>

        {/* Citations section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Citations {profile.plate ? `against ${profile.plate}` : ''}</Text>
          <Text style={[styles.activeBadgeText, { color: colors.signal }]}>Unavailable</Text>
        </View>

        <View style={styles.finesList}>
          <View style={[styles.fineCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <Text style={[styles.fineSub, { color: colors.muted }]}>Government citation data is not connected yet. No sample fines are shown.</Text>
          </View>
        </View>
        {!!loadError && <Text accessibilityRole="alert" style={{ color: colors.signal }}>{loadError}</Text>}
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
    paddingBottom: 40,
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 24,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.ink,
    marginTop: 8,
  },
  rewardSub: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 4,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    gap: 6,
  },
  withdrawText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.canvas,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.signal,
  },
  finesList: {
    gap: 10,
  },
  fineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  fineInfo: {
    flex: 1,
  },
  fineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fineTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
  },
  disputeBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  disputeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.telemetry,
  },
  fineSub: {
    fontSize: 10,
    color: Colors.muted,
    marginTop: 2,
  },
  fineDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  fineAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.signal,
  },
});
