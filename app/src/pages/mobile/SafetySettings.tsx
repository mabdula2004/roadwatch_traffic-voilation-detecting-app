import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Siren, Phone, EyeOff, Search, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserProfile } from '../../contexts/UserContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Colors } from '../../constants/theme';
import * as Location from 'expo-location';

interface SafetySettingsProps {
  onBack: () => void;
  onOpenPlateSearch: () => void;
}

export function SafetySettings({ onBack, onOpenPlateSearch }: SafetySettingsProps) {
  const { colors } = useTheme();
  const { profile } = useUserProfile();
  const { t, isUrdu } = useLanguage();
  const [blurFaces, setBlurFaces] = useState(true);

  const handleSos = async () => {
    let coordsText = 'Location pending';
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      if (loc) {
        coordsText = `${loc.coords.latitude.toFixed(5)}°, ${loc.coords.longitude.toFixed(5)}°`;
      }
    } catch { }

    Alert.alert(
      'EMERGENCY SOS',
      `Live SOS payload delivery (GPS: ${coordsText} & Phone: ${profile.phone || 'Profile Contact'}) to Rescue 1122 is currently unavailable in this build.\n\nFor immediate emergency assistance, please call 1122 or 15 directly using the buttons below.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Rescue 1122',
          onPress: () => {
            void Linking.openURL('tel:1122').catch(() => Alert.alert('Dialer unavailable', 'Is device par phone call available nahi hai.'));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header without separating border line */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('safetyAndPrivacy')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('safetySub')}</Text>
        </View>

        {/* SOS Button */}
        <TouchableOpacity style={[styles.sosCard, { backgroundColor: colors.signal }]} onPress={handleSos} activeOpacity={0.85}>
          <Siren size={36} color="#FFF" />
          <Text style={styles.sosTitle}>{t('emergencySos')}</Text>
          <Text style={styles.sosSub}>{t('emergencySosSub')}</Text>
        </TouchableOpacity>

        {/* Quick Phone Buttons */}
        <View style={styles.phoneGrid}>
          {[
            { key: 'police', label: t('police15'), number: '15' },
            { key: 'rescue', label: t('rescue1122'), number: '1122' },
          ].map(({ key, label, number }) => (
            <TouchableOpacity key={key} onPress={() => { void Linking.openURL(`tel:${number}`).catch(() => Alert.alert(isUrdu ? 'کال دستیاب نہیں' : 'Dialer unavailable', t('dialerUnavailable'))); }} style={[styles.phoneButton, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
              <Phone size={14} color={colors.signal} />
              <Text style={[styles.phoneText, { color: colors.text }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Privacy Shield */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{t('privacyShields')}</Text>
        <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          <EyeOff size={18} color={colors.telemetry} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>{t('autoBlurFaces')}</Text>
            <Text style={[styles.settingSub, { color: colors.textMuted }]}>
              {blurFaces ? t('autoBlurActive') : t('autoBlurDisabled')}
            </Text>
          </View>
          <Switch
            value={blurFaces}
            onValueChange={setBlurFaces}
            trackColor={{ false: colors.edge, true: colors.telemetry }}
            thumbColor="#FFF"
          />
        </View>

        {/* Plate Search Navigation Link */}
        <TouchableOpacity style={[styles.linkCard, { backgroundColor: colors.surface, borderColor: colors.edge }]} onPress={onOpenPlateSearch}>
          <Search size={18} color={colors.telemetry} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.linkTitle, { color: colors.text }]}>{t('publicPlateSearch')}</Text>
            <Text style={[styles.linkSub, { color: colors.textMuted }]}>{t('publicPlateSub')}</Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  shieldBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  shieldText: {
    color: Colors.valid,
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  sosCard: {
    marginTop: 16,
    backgroundColor: Colors.signal,
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  sosTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  sosSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  phoneGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  phoneButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.edge,
    borderRadius: 30,
    paddingVertical: 12,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    padding: 14,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  settingSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  linkCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    padding: 14,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  linkSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
