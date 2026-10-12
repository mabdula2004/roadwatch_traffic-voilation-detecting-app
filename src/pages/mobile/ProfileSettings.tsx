import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { ChevronLeft, User, Phone, Mail, ShieldCheck, Car, Save, Lock } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserProfile } from '../../contexts/UserContext';
import { Colors } from '../../constants/theme';

interface ProfileSettingsProps {
  onBack: () => void;
}

export function ProfileSettings({ onBack }: ProfileSettingsProps) {
  const { colors } = useTheme();
  const { profile, updateProfile } = useUserProfile();

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [plate, setPlate] = useState(profile.plate || '');
  const [saving, setSaving] = useState(false);

  // CNIC is permanently locked to 1 account and masked so only last 4 digits are visible
  const rawDigits = profile.cnic ? profile.cnic.replace(/\D/g, '') : '';
  const last4 = rawDigits ? rawDigits.slice(-4) : '8899';
  const maskedCnic = `••••••••${last4}`;

  useEffect(() => {
    setName(profile.name);
    setPhone(profile.phone);
    setEmail(profile.email);
    setPlate(profile.plate);
  }, [profile]);

  const handleSave = async () => {
    if (name.trim().length < 3) {
      Alert.alert('Name Required', 'Please provide a valid full name (at least 3 characters).');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        plate: plate.trim(),
      });
      Alert.alert('Profile Updated', 'Your profile details have been saved successfully.');
      onBack();
    } catch (cause) {
      Alert.alert('Save failed', cause instanceof Error ? cause.message : 'Please retry.');
    } finally {
      setSaving(false);
    }
  };

  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('') || '—';

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.canvas, borderBottomColor: colors.edge }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ChevronLeft size={20} color={colors.muted} />
          <Text style={[styles.backText, { color: colors.muted }]}>Back to Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={[styles.avatarText, { color: colors.telemetry }]}>{initials}</Text>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{name || 'Your Name'}</Text>
          <Text style={[styles.profileCnic, { color: colors.muted }]}>CNIC {maskedCnic}</Text>
        </View>

        {/* Inputs */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            <User size={13} color={colors.telemetry} /> Full Name
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.edge, color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="As printed on CNIC"
            placeholderTextColor={colors.muted}
          />
        </View>

        {/* Permanent Locked Masked CNIC Field */}
        <View style={styles.inputGroup}>
          <View style={styles.labelHeaderRow}>
            <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>
              <ShieldCheck size={13} color={colors.telemetry} /> National CNIC (Permanent)
            </Text>
            <View style={[styles.lockedBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Lock size={10} color="#f59e0b" />
              <Text style={styles.lockedBadgeText}>1 Account per CNIC · Locked</Text>
            </View>
          </View>
          <View style={[styles.lockedInputWrapper, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <Text style={[styles.lockedInputText, { color: colors.text }]}>{maskedCnic}</Text>
            <Lock size={15} color={colors.muted} />
          </View>
          <Text style={[styles.fieldNote, { color: colors.muted }]}>
            Your CNIC identity is permanently verified and cannot be changed after registration.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            <Phone size={13} color={colors.telemetry} /> Phone Number
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.edge, color: colors.text }]}
            value={phone}
            onChangeText={setPhone}
            editable={true}
            placeholder="+92 300 1234567"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            <Mail size={13} color={colors.telemetry} /> Email Address
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.edge, color: colors.text }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            <Car size={13} color={colors.telemetry} /> Vehicle Number Plate
          </Text>
          <TextInput
            style={[styles.input, { letterSpacing: 1, fontWeight: '700', backgroundColor: colors.surface, borderColor: colors.edge, color: colors.text }]}
            value={plate}
            onChangeText={(text) => setPlate(text.toUpperCase())}
            placeholder="e.g. LEA-4471"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
          />
        </View>

        {/* Verified Badge Section */}
        <View style={[styles.verifiedCard, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          <Text style={[styles.verifiedHeader, { color: colors.muted }]}>CITIZEN IDENTITY · VERIFIED ACCOUNT</Text>
          <View style={styles.verifiedRow}>
            <View style={styles.rowLeft}>
              <ShieldCheck size={16} color={colors.valid} />
              <View>
                <Text style={[styles.rowSub, { color: colors.muted }]}>National CNIC</Text>
                <Text style={[styles.rowMain, { color: colors.text }]}>{maskedCnic}</Text>
              </View>
            </View>
            <View style={styles.validBadge}>
              <Text style={[styles.badgeText, { color: colors.valid }]}>ACTIVE CITIZEN</Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.accent, opacity: saving ? 0.5 : 1 }]} disabled={saving} onPress={handleSave}>
          <Save size={18} color="#000" />
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.telemetry,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 10,
  },
  profileCnic: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  inputGroup: {
    marginTop: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  labelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
    marginLeft: 4,
  },
  lockedInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    opacity: 0.9,
  },
  lockedInputText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
  },
  fieldNote: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.edge,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  verifiedCard: {
    marginTop: 24,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    padding: 16,
  },
  verifiedHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  verifiedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowSub: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  rowMain: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 1,
  },
  validBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: Colors.valid,
    fontSize: 10,
    fontWeight: '800',
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
});
