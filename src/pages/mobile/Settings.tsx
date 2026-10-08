import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  KeyRound,
  Languages,
  Moon,
  Bell,
  HelpCircle,
  FileText,
  Info,
  ChevronRight,
  LogOut,
  TrendingUp,
} from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { useUserProfile } from '../../contexts/UserContext';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import { useLanguage, type Language } from '../../contexts/LanguageContext';
import { OptionSheet } from '../../components/mobile/OptionSheet';
import { NotificationSheet } from '../../components/mobile/NotificationSheet';
import { supabase } from '../../lib/supabase';

interface SettingsProps {
  onLogout?: () => void;
  onNavigate?: (screen: string) => void;
}

export function Settings({ onLogout, onNavigate }: SettingsProps) {
  const { profile } = useUserProfile();
  const { theme, setTheme, colors } = useTheme();
  const { language, setLanguage, t, isUrdu } = useLanguage();

  const [sheet, setSheet] = useState<'language' | 'theme' | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [trustScore, setTrustScore] = useState<number>(100);
  const [stats, setStats] = useState({ approved: 0, rejected: 0 });
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [reporter, reports] = await Promise.all([
          supabase.from('reporter_profiles').select('trust_score').maybeSingle(),
          supabase.from('reports').select('status').in('status', ['accepted', 'rejected']),
        ]);
        if (alive) {
          if (!reporter.error && reporter.data?.trust_score !== null && reporter.data?.trust_score !== undefined) {
            setTrustScore(reporter.data.trust_score);
          } else {
            setTrustScore(100);
          }
          if (!reports.error && reports.data) {
            setStats({
              approved: reports.data.filter(r => r.status === 'accepted').length,
              rejected: reports.data.filter(r => r.status === 'rejected').length,
            });
          }
        }
      } catch {
        if (alive) setTrustScore(100);
      }
    }
    void load();
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    let alive = true;
    void supabase.from('reporter_profiles').select('language,theme').single().then(({ data }) => {
      if (!alive || !data) return;
      if (data.language === 'ur' || data.language === 'en') setLanguage(data.language);
      if (data.theme === 'dark' || data.theme === 'light' || data.theme === 'system') setTheme(data.theme);
    });
    return () => { alive = false; };
  }, []);
  async function savePreference(values: { language?: Language; theme?: Theme }) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase.from('reporter_profiles').update(values).eq('reporter_id', auth.user.id);
    if (error) Alert.alert('Preference not saved', error.message);
  }

  const langOptions: { value: Language; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'ur', label: 'اردو (Urdu)' },
  ];

  const themeOptionsList: { value: Theme; label: string }[] = [
    { value: 'dark', label: t('dark') },
    { value: 'light', label: t('light') },
    { value: 'system', label: t('system') },
  ];

  const handleDeleteAccount = () => {
    Alert.alert(
      t('deleteAccount'),
      'Account deletion is not available in this build. Contact support for a deletion request.',
      [
        { text: isUrdu ? 'منسوخ کریں' : 'Cancel', style: 'cancel' },
        { text: 'OK' },
      ]
    );
  };

  const displayName = profile.name || 'RoadWatch Reporter';
  const cnicDisplay = profile.cnic ? (profile.cnic.startsWith('•') ? profile.cnic : `CNIC ${profile.cnic}`) : 'CNIC Pending';
  const plateDisplay = profile.plate ? profile.plate : 'No Plate Registered';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.profileName, { color: colors.ink }]}>{displayName}</Text>
            <Text style={[styles.profileSub, { color: colors.muted }]}>
              {cnicDisplay} · {plateDisplay}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bellButton, { backgroundColor: colors.surface, borderColor: colors.edge }]}
            activeOpacity={0.8}
            onPress={() => setNotificationsOpen(true)}
          >
            <Bell size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Hero Trust Score */}
        <View style={[styles.trustCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          <View style={styles.trustTop}>
            <View style={[styles.scoreCircle, { borderColor: colors.telemetry }]}>
              <Text style={[styles.scoreNumber, { color: colors.ink }]}>{trustScore ?? '—'}</Text>
              <Text style={[styles.scoreLabel, { color: colors.telemetry }]}>SCORE</Text>
            </View>
            <View style={styles.trustInfo}>
              <Text style={[styles.reporterTrustLabel, { color: colors.muted }]}>{t('reporterTrust')}</Text>
              <Text style={[styles.trustTitle, { color: colors.ink }]}>Reporter trust</Text>
              <Text style={[styles.trustDesc, { color: colors.muted }]}>Score from your reporter profile. Reports are awaiting real review.</Text>
              <View style={styles.trendingRow}>
                <TrendingUp size={14} color={colors.valid} />
                <Text style={[styles.trendingText, { color: colors.valid }]}>Current score</Text>
              </View>
            </View>
          </View>

          <View style={[styles.trustStatsGrid, { borderTopColor: colors.edge }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statItemLabel, { color: colors.muted }]}>{t('approved')}</Text>
              <Text style={[styles.statItemVal, { color: colors.ink }]}>{stats.approved}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statItemLabel, { color: colors.muted }]}>{t('rejected')}</Text>
              <Text style={[styles.statItemVal, { color: colors.ink }]}>{stats.rejected}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statItemLabel, { color: colors.muted }]}>{t('accuracy')}</Text>
              <Text style={[styles.statItemVal, { color: colors.ink }]}>{stats.approved + stats.rejected ? `${Math.round(stats.approved / (stats.approved + stats.rejected) * 100)}%` : '—'}</Text>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.muted }]}>{t('account')}</Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <TouchableOpacity style={styles.row} onPress={() => onNavigate?.('profile')}>
              <User size={18} color={colors.muted} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.ink }]}>{t('profile')}</Text>
                <Text style={[styles.rowSub, { color: colors.muted }]}>
                  {isUrdu ? `${displayName}، ${profile.phone || 'Phone Pending'}` : `${displayName}, ${profile.phone || 'Phone Pending'}`}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.muted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.edge }]} />

            <TouchableOpacity style={styles.row} onPress={() => onNavigate?.('password')}>
              <KeyRound size={18} color={colors.muted} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.ink }]}>{t('changePassword')}</Text>
                <Text style={[styles.rowSub, { color: colors.muted }]}>{t('updateSecurityCredentials')}</Text>
              </View>
              <ChevronRight size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.muted }]}>{t('preferences')}</Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <TouchableOpacity style={styles.row} onPress={() => setSheet('language')}>
              <Languages size={18} color={colors.muted} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.ink }]}>{t('language')}</Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.muted }]}>{language === 'ur' ? 'اردو' : 'English'}</Text>
              <ChevronRight size={18} color={colors.muted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.edge }]} />

            <TouchableOpacity style={styles.row} onPress={() => setSheet('theme')}>
              <Moon size={18} color={colors.muted} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.ink }]}>{t('theme')}</Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.muted }]}>
                {themeOptionsList.find((o) => o.value === theme)?.label ?? 'Dark'}
              </Text>
              <ChevronRight size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.muted }]}>{t('supportLegal')}</Text>
          <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <TouchableOpacity style={styles.row}>
              <HelpCircle size={18} color={colors.muted} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.ink }]}>{t('helpFaq')}</Text>
              </View>
              <ChevronRight size={18} color={colors.muted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.edge }]} />

            <TouchableOpacity style={styles.row}>
              <FileText size={18} color={colors.muted} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.ink }]}>{t('termsPrivacy')}</Text>
              </View>
              <ChevronRight size={18} color={colors.muted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.edge }]} />

            <View style={styles.row}>
              <Info size={18} color={colors.muted} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.ink }]}>{t('appVersion')}</Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.muted }]}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Logout & Delete Account */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.surface, borderColor: colors.edge }]} onPress={onLogout} activeOpacity={0.8}>
          <LogOut size={16} color={colors.ink} />
          <Text style={[styles.logoutText, { color: colors.ink }]}>{t('logout')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount} activeOpacity={0.7}>
          <Text style={[styles.deleteAccountText, { color: colors.signal }]}>{t('deleteAccount')}</Text>
        </TouchableOpacity>

        {/* Option Sheets & Notifications Sheet */}
        <OptionSheet
          open={sheet === 'language'}
          title={t('language')}
          options={langOptions}
          value={language}
          onSelect={(l) => { setLanguage(l); void savePreference({ language: l }); }}
          onClose={() => setSheet(null)}
        />

        <OptionSheet
          open={sheet === 'theme'}
          title={t('theme')}
          options={themeOptionsList}
          value={theme}
          onSelect={(th) => { setTheme(th); void savePreference({ theme: th }); }}
          onClose={() => setSheet(null)}
        />

        <NotificationSheet
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  profileSub: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.edge,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.signal,
  },
  trustCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    marginBottom: 20,
  },
  trustTop: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.telemetry,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  scoreLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.telemetry,
  },
  trustInfo: {
    flex: 1,
  },
  reporterTrustLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  trustTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.ink,
    marginTop: 2,
  },
  trustDesc: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 4,
    lineHeight: 15,
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  trendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.valid,
  },
  trustStatsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
    marginTop: 14,
    paddingTop: 12,
  },
  statItem: {
    flex: 1,
  },
  statItemLabel: {
    fontSize: 9,
    color: Colors.muted,
    fontWeight: '600',
  },
  statItemVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.ink,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.muted,
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  cardGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
  },
  rowSub: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 12,
    color: Colors.muted,
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.edge,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.edge,
    paddingVertical: 14,
    gap: 8,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
  },
  deleteAccountBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  deleteAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.signal,
  },
});
