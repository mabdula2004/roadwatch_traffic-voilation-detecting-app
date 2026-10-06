import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from './src/lib/supabase';
import type { CapturedClip } from './src/lib/report';
import { Colors } from './src/constants/theme';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { UserProvider } from './src/contexts/UserContext';
import { OnboardingNative } from './src/pages/mobile/Onboarding.native';
import { LiveCaptureNative } from './src/pages/mobile/LiveCapture.native';
import { ReportReviewNative } from './src/pages/mobile/ReportReview.native';
import { VaultNative } from './src/pages/mobile/Vault.native';
import { WalletNative } from './src/pages/mobile/Wallet.native';
import { FineDetailsNative } from './src/pages/mobile/FineDetails.native';
import { PlateSearchNative } from './src/pages/mobile/PlateSearch.native';
import { SafetySettingsNative } from './src/pages/mobile/SafetySettings.native';
import { SettingsNative } from './src/pages/mobile/Settings.native';
import { ProfileSettingsNative } from './src/pages/mobile/ProfileSettings.native';
import { ChangePasswordNative } from './src/pages/mobile/ChangePassword.native';
import { BottomNav } from './src/components/mobile/BottomNav.native';

function MainApp() {
  const { colors } = useTheme();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [ready, setReady] = useState(false);
  const [activeScreen, setActiveScreen] = useState<string>('capture');
  const [clip, setClip] = useState<CapturedClip | null>(null);

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
        if (mounted) { setIsOnboarded(false); setClip(null); setActiveScreen('capture'); }
      } else setTimeout(() => { void checkRegistration().catch(() => {}); }, 0);
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);

  if (!ready) return <View style={[styles.loading, { backgroundColor: colors.canvas }]}><ActivityIndicator color={colors.telemetry} /></View>;

  if (!isOnboarded) {
    return <OnboardingNative onComplete={() => setIsOnboarded(true)} />;
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
          <LiveCaptureNative onCapture={(newClip) => { setClip(newClip); setActiveScreen('review'); }} />
        )}

        {activeScreen === 'review' && clip && (
          <ReportReviewNative
            clip={clip}
            onBack={() => { setClip(null); setActiveScreen('capture'); }}
            onSubmit={() => { setClip(null); setActiveScreen('vault'); }}
          />
        )}

        {activeScreen === 'vault' && <VaultNative />}

        {activeScreen === 'wallet' && <WalletNative />}

        {activeScreen === 'search' && (
          <PlateSearchNative onBack={() => setActiveScreen('safety')} />
        )}

        {activeScreen === 'safety' && (
          <SafetySettingsNative
            onBack={() => setActiveScreen('settings')}
            onOpenPlateSearch={() => setActiveScreen('search')}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsNative
            onLogout={() => { void supabase.auth.signOut(); }}
            onNavigate={(screen) => setActiveScreen(screen)}
          />
        )}

        {activeScreen === 'profile' && (
          <ProfileSettingsNative onBack={() => setActiveScreen('settings')} />
        )}

        {activeScreen === 'password' && (
          <ChangePasswordNative onBack={() => setActiveScreen('settings')} />
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
