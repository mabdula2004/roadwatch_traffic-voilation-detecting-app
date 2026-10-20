import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './src/lib/supabase';
import type { CapturedClip } from './src/lib/report';
import { Colors } from './src/constants/theme';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { UserProvider } from './src/contexts/UserContext';
import { Onboarding } from './src/pages/mobile/Onboarding';
import { LiveCapture } from './src/pages/mobile/LiveCapture';
import { ReportReview } from './src/pages/mobile/ReportReview';
import { Vault } from './src/pages/mobile/Vault';
import { Wallet } from './src/pages/mobile/Wallet';
import { FineDetails } from './src/pages/mobile/FineDetails';
import { PlateSearch } from './src/pages/mobile/PlateSearch';
import { SafetySettings } from './src/pages/mobile/SafetySettings';
import { Settings } from './src/pages/mobile/Settings';
import { ProfileSettings } from './src/pages/mobile/ProfileSettings';
import { ChangePassword } from './src/pages/mobile/ChangePassword';
import { ReportOutcome } from './src/pages/mobile/ReportOutcome';
import { BottomNav } from './src/components/mobile/BottomNav';
import type { AiEvidentiaryResult } from './src/lib/aiAnalysis';

function MainApp() {
  const { colors } = useTheme();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [ready, setReady] = useState(false);
  const [activeScreen, setActiveScreen] = useState<string>('capture');
  const [clip, setClip] = useState<CapturedClip | null>(null);
  const [latestOutcome, setLatestOutcome] = useState<AiEvidentiaryResult | null>(null);
  const [latestReportId, setLatestReportId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function checkPendingRewardAlerts(uid?: string) {
      try {
        const userId = uid || (await supabase.auth.getUser()).data.user?.id;
        if (!userId) return;

        const seenRaw = await AsyncStorage.getItem(`@roadwatch_seen_notif_${userId}`);
        const seenIds: string[] = seenRaw ? JSON.parse(seenRaw) : [];

        const { data: unreadNotifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', userId)
          .eq('type', 'reward_payout')
          .order('sent_at', { ascending: false })
          .limit(5);

        if (unreadNotifs && unreadNotifs.length > 0) {
          const newest = unreadNotifs.find((n: any) => !seenIds.includes(n.notification_id));
          if (newest) {
            seenIds.push(newest.notification_id);
            await AsyncStorage.setItem(`@roadwatch_seen_notif_${userId}`, JSON.stringify(seenIds));
            Alert.alert(
              '🎉 Reward Bounty Credited!',
              newest.message,
              [
                { text: 'View Wallet', onPress: () => setActiveScreen('wallet') },
                { text: 'OK' },
              ]
            );
          }
        }
      } catch {}
    }

    async function checkRegistration() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { if (mounted) { setIsOnboarded(false); setReady(true); } return; }
      const { data, error } = await supabase.from('base_users')
        .select('registration_completed_at,account_state').eq('user_id', auth.user.id).maybeSingle();
      if (mounted) {
        setIsOnboarded(!error && !!data?.registration_completed_at && data.account_state === 'active');
        setReady(true);
      }
      void checkPendingRewardAlerts(auth.user.id);
    }
    void checkRegistration().catch(() => { if (mounted) setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (mounted) { setIsOnboarded(false); setClip(null); setLatestOutcome(null); setActiveScreen('capture'); }
      } else {
        setTimeout(() => {
          void checkRegistration().catch(() => {});
          void checkPendingRewardAlerts().catch(() => {});
        }, 0);
      }
    });

    // Real-time in-app notification popup when officer confirms report or credits reward
    const notifChannel = supabase
      .channel('app_reward_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as any;
          if (newNotif && newNotif.message) {
            if (newNotif.notification_id && newNotif.recipient_id) {
              AsyncStorage.getItem(`@roadwatch_seen_notif_${newNotif.recipient_id}`).then((seenRaw) => {
                const seenIds: string[] = seenRaw ? JSON.parse(seenRaw) : [];
                seenIds.push(newNotif.notification_id);
                AsyncStorage.setItem(`@roadwatch_seen_notif_${newNotif.recipient_id}`, JSON.stringify(seenIds)).catch(() => {});
              }).catch(() => {});
            }
            Alert.alert(
              '🎉 Reward Bounty Credited!',
              newNotif.message,
              [
                { text: 'View Wallet', onPress: () => setActiveScreen('wallet') },
                { text: 'OK' },
              ]
            );
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      supabase.removeChannel(notifChannel);
    };
  }, []);

  if (!ready) return <View style={[styles.loading, { backgroundColor: colors.canvas }]}><ActivityIndicator color={colors.telemetry} /></View>;

  if (!isOnboarded) {
    return <Onboarding onComplete={() => setIsOnboarded(true)} />;
  }

  // Determine if bottom navigation bar should be visible
  const showBottomNav = [
    'capture',
    'vault',
    'wallet',
    'safety',
    'settings',
  ].includes(activeScreen);

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={styles.content}>
        {activeScreen === 'capture' && (
          <LiveCapture onCapture={(newClip) => { setClip(newClip); setActiveScreen('review'); }} />
        )}

        {activeScreen === 'review' && clip && (
          <ReportReview
            clip={clip}
            onBack={() => { setClip(null); setLatestReportId(null); setActiveScreen('capture'); }}
            onSubmit={(id, aiResult) => {
              setLatestReportId(id);
              setLatestOutcome(aiResult);
              setActiveScreen('outcome');
            }}
          />
        )}

        {activeScreen === 'outcome' && clip && latestOutcome && (
          <ReportOutcome
            clip={clip}
            aiResult={latestOutcome}
            reportId={latestReportId || undefined}
            onGoToVault={() => {
              setClip(null);
              setLatestOutcome(null);
              setLatestReportId(null);
              setActiveScreen('vault');
            }}
            onRecordAnother={() => {
              setClip(null);
              setLatestOutcome(null);
              setLatestReportId(null);
              setActiveScreen('capture');
            }}
            onGoToWallet={() => {
              setClip(null);
              setLatestOutcome(null);
              setLatestReportId(null);
              setActiveScreen('wallet');
            }}
          />
        )}

        {activeScreen === 'vault' && <Vault />}

        {activeScreen === 'wallet' && <Wallet />}

        {activeScreen === 'search' && (
          <PlateSearch onBack={() => setActiveScreen('safety')} />
        )}

        {activeScreen === 'safety' && (
          <SafetySettings
            onBack={() => setActiveScreen('settings')}
            onOpenPlateSearch={() => setActiveScreen('search')}
          />
        )}

        {activeScreen === 'settings' && (
          <Settings
            onLogout={async () => {
              try {
                await AsyncStorage.multiRemove([
                  '@roadwatch_user_profile',
                  '@roadwatch_citizen_wallet_balance',
                  '@roadwatch_citizen_wallet_transactions',
                  '@roadwatch_local_vault_reports',
                  '@roadwatch_reporter_citations',
                  '@roadwatch_deleted_report_ids',
                  '@roadwatch_onboarding_temp_profile',
                ]);
              } catch {}
              await supabase.auth.signOut();
              setIsOnboarded(false);
            }}
            onNavigate={(screen) => setActiveScreen(screen)}
          />
        )}

        {activeScreen === 'profile' && (
          <ProfileSettings onBack={() => setActiveScreen('settings')} />
        )}

        {activeScreen === 'password' && (
          <ChangePassword onBack={() => setActiveScreen('settings')} />
        )}
      </View>

      {showBottomNav && (
        <BottomNav
          activeTab={activeScreen}
          onSelectTab={(tab) => setActiveScreen(tab)}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <UserProvider>
          <MainApp />
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    flex: 1,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
