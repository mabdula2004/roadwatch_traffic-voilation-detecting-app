import React, { useEffect, useState } from 'react';
import { View, Text, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
    async function checkRegistration() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { if (mounted) { setIsOnboarded(false); setReady(true); } return; }
      const { data, error } = await supabase.from('base_users')
        .select('registration_completed_at,account_state').eq('user_id', auth.user.id).maybeSingle();
      if (mounted) {
        setIsOnboarded(!error && !!data?.registration_completed_at && data.account_state === 'active');
        setReady(true);
      }
    }
    void checkRegistration().catch(() => { if (mounted) setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (mounted) { setIsOnboarded(false); setClip(null); setLatestOutcome(null); setActiveScreen('capture'); }
      } else setTimeout(() => { void checkRegistration().catch(() => {}); }, 0);
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
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
            onLogout={() => { void supabase.auth.signOut(); }}
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
    <SafeAreaProvider>
    <ThemeProvider>
      <LanguageProvider>
        <UserProvider>
          <View style={{flex: 1}}>
            {Platform.OS === 'web' && <View style={{backgroundColor: '#102033', padding: 12}}>
              <Text style={{color: '#cbd5e1', fontSize: 12}}>RoadWatch web preview · Video evidence recording requires the Android or iOS app.</Text>
            </View>}
            <MainApp />
          </View>
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
    </SafeAreaProvider>
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
