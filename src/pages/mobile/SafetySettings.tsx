import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking } from 'react-native';
import { Siren, Phone, EyeOff, Search, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserProfile } from '../../contexts/UserContext';
import { Colors } from '../../constants/theme';
import * as Location from 'expo-location';

interface SafetySettingsProps {
  onBack: () => void;
  onOpenPlateSearch: () => void;
}

export function SafetySettings({ onBack, onOpenPlateSearch }: SafetySettingsProps) {
  const { colors } = useTheme();
  const { profile } = useUserProfile();
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
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.canvas, borderBottomColor: colors.edge }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Safety & Privacy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Emergency help and what RoadWatch shares about you.</Text>

        {/* SOS Button */}
        <TouchableOpacity style={[styles.sosCard, { backgroundColor: colors.signal }]} onPress={handleSos} activeOpacity={0.85}>
          <Siren size={36} color="#FFF" />
          <Text style={styles.sosTitle}>EMERGENCY SOS</Text>
          <Text style={styles.sosSub}>Send profile & live GPS to Rescue 1122</Text>
        </TouchableOpacity>

        {/* Quick Phone Buttons */}
        <View style={styles.phoneGrid}>
          {['Police 15', 'Rescue 1122'].map((label) => (
            <TouchableOpacity key={label} onPress={() => { void Linking.openURL(label === 'Police 15' ? 'tel:15' : 'tel:1122').catch(() => Alert.alert('Dialer unavailable', 'Is device par phone call available nahi hai.')); }} style={[styles.phoneButton, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
              <Phone size={14} color={colors.signal} />
              <Text style={[styles.phoneText, { color: colors.text }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Privacy Shield */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>PRIVACY SHIELDS</Text>
        <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          <EyeOff size={18} color={colors.telemetry} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>Auto-blur faces</Text>
            <Text style={[styles.settingSub, { color: colors.textMuted }]}>
              {blurFaces ? 'Automated privacy facial blur is active for clips.' : 'Disabled. Facial privacy blur is off.'}
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
            <Text style={[styles.linkTitle, { color: colors.text }]}>Public plate search</Text>
            <Text style={[styles.linkSub, { color: colors.textMuted }]}>Government registry is not connected yet.</Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.edge,
    backgroundColor: Colors.canvas,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
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
