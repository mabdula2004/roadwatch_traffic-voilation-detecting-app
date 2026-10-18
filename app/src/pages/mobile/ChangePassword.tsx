import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { ChevronLeft, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

interface ChangePasswordProps {
  onBack: () => void;
}

export function ChangePassword({ onBack }: ChangePasswordProps) {
  const { colors, resolvedTheme } = useTheme();
  const { t, isUrdu } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const isMatched = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t('passwordShortTitle'), t('passwordShortMsg'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('passwordMismatchTitle'), t('passwordMismatchMsg'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        Alert.alert(t('updateFailed'), error.message);
        return;
      }

      Alert.alert(
        t('passwordUpdatedTitle'),
        t('passwordUpdatedSuccess'),
        [{ text: t('ok'), onPress: onBack }]
      );
    } catch (e) {
      Alert.alert(t('updateFailed'), e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.canvas, borderBottomColor: colors.edge }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ChevronLeft size={20} color={colors.muted} />
          <Text style={[styles.backText, { color: colors.muted }]}>{t('backToSettings')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.ink }]}>{t('changePassword')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Security Banner */}
        <View style={[styles.securityBanner, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
          <View style={styles.keyCircle}>
            <KeyRound size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.ink }]}>{t('securityBannerTitle')}</Text>
            <Text style={[styles.bannerSub, { color: colors.muted }]}>{t('securityBannerSub')}</Text>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.ink }]}>{t('newPassword')}</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.edge }]}>
            <TextInput
              style={[styles.input, { color: colors.ink }]}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('passwordPlaceholder')}
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowNew(!showNew)}>
              {showNew ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.ink }]}>{t('confirmNewPassword')}</Text>
            {isMatched && (
              <View style={styles.matchGroup}>
                <CheckCircle2 size={12} color={colors.valid} />
                <Text style={[styles.matchText, { color: colors.valid }]}>{isUrdu ? 'پاس ورڈز ایک جیسے ہیں' : 'Passwords match'}</Text>
              </View>
            )}
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.edge }, isMatched && { borderColor: 'rgba(34, 197, 94, 0.6)' }]}>
            <TextInput
              style={[styles.input, { color: colors.ink }]}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={isUrdu ? 'دوبارہ نیا پاس ورڈ درج کریں' : 'Re-enter new password'}
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.accent, opacity: loading ? 0.6 : 1 }]}
          disabled={loading}
          onPress={handleSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <KeyRound size={18} color="#000" />
              <Text style={styles.submitText}>{t('updatePassword')}</Text>
            </>
          )}
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
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 14,
  },
  keyCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  bannerSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  inputGroup: {
    marginTop: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  matchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchText: {
    fontSize: 11,
    color: Colors.valid,
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.edge,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 44,
    fontSize: 14,
    color: Colors.text,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
  },
  note: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 10,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
});
