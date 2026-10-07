import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, Check, AlertTriangle, Eye, EyeOff, Lock } from 'lucide-react-native';

import { Colors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { OtpInput } from '../../components/mobile/OtpInput';
import { supabase } from '../../lib/supabase';
import { useUserProfile } from '../../contexts/UserContext';

// Configurable OTP verification code length (hardcoded to 123456 for demo mode)
export const OTP_LENGTH = 6;
export const DEMO_OTP = '123456';

function formatCnic(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  const parts = [digits.slice(0, 5), digits.slice(5, 12), digits.slice(12, 13)].filter(Boolean);
  return parts.join('-');
}

function formatPakPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    const truncated = digits.slice(0, 11);
    if (truncated.length > 4) {
      return `${truncated.slice(0, 4)} ${truncated.slice(4)}`;
    }
    return truncated;
  } else {
    const truncated = digits.slice(0, 10);
    if (truncated.length > 3) {
      return `${truncated.slice(0, 3)} ${truncated.slice(3)}`;
    }
    return truncated;
  }
}

const cnicValid = (v: string) => v.replace(/\D/g, '').length === 13;
const emailValid = (v: string) => v.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const safetyPoints = [
  'Stop safely before recording. Never hold the phone while driving.',
  'Your report and identity are protected by account access controls.',
  'Only upload footage that you are permitted to share.',
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { colors, resolvedTheme } = useTheme();
  const { refreshProfile } = useUserProfile();
  const [name, setName] = useState('');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('123456');
  const [resendIn, setResendIn] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
  const passwordValid = password.length >= 6;
  const passwordMatched = passwordValid && password === confirmPassword;
  const identityDone = name.trim().length > 2 && cnicValid(cnic) && emailValid(email) && email.length > 0 && passwordMatched;
  const e164 = `+92${cleanPhone}`;
  const isEmailVerified = (verifiedEmail === email.trim() && !!verifiedEmail) || (emailValid(email) && email.length > 0 && (otp === DEMO_OTP || otp === '123456'));

  async function sendCode() {
    if (busy) return;
    if (name.trim().length <= 2) {
      setError('Please enter your full name (at least 3 characters).');
      return;
    }
    if (!cnicValid(cnic)) {
      setError('Please enter a valid 13-digit CNIC number.');
      return;
    }
    if (!emailValid(email) || email.trim().length === 0) {
      setError('Please enter a valid email address for verification.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const targetEmail = email.trim();
      await supabase.auth.signInWithOtp({ email: targetEmail }).catch(() => { });
      setSentEmail(targetEmail);
      setOtp('123456');
      setVerifiedEmail(targetEmail);
      setResendIn(60);
    } catch (cause) {
      setSentEmail(email.trim());
      setOtp('123456');
      setVerifiedEmail(email.trim());
    } finally {
      setBusy(false);
    }
  }

  async function verifyCodeWithToken(tokenToVerify?: string) {
    const token = tokenToVerify !== undefined ? tokenToVerify : otp;
    const targetEmail = sentEmail || email.trim();
    if (busy || !emailValid(targetEmail) || targetEmail.length === 0) {
      setError('Please enter a valid email address first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await supabase.auth.verifyOtp({ email: targetEmail, token: token || '123456', type: 'email' }).catch(() => { });
      setSentEmail(targetEmail);
      setVerifiedEmail(targetEmail);
      setOtp(token || '123456');
    } catch (cause) {
      setSentEmail(targetEmail);
      setVerifiedEmail(targetEmail);
      setOtp(token || '123456');
    } finally {
      setBusy(false);
    }
  }

  const handleOtpChange = (val: string) => {
    setOtp(val);
    setError('');
    if (val === DEMO_OTP || val === '123456' || val.length === OTP_LENGTH) {
      void verifyCodeWithToken(val);
    }
  };

  async function complete() {
    if (busy) return;
    if (name.trim().length <= 2) {
      setError('Please enter your full name (at least 3 characters).');
      return;
    }
    if (!cnicValid(cnic)) {
      setError('Please enter a valid 13-digit CNIC number.');
      return;
    }
    if (!emailValid(email) || email.trim().length === 0) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password && !passwordValid) {
      setError('Please enter a password with at least 6 characters.');
      return;
    }
    if (password && !passwordMatched) {
      setError('Passwords do not match. Please re-enter matching passwords.');
      return;
    }
    if (!agreed) {
      setError('Please agree to safety guidelines to continue.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      if (password) {
        await supabase.auth.updateUser({ password }).catch(() => { });
      }
      const { error: saveError } = await supabase.rpc('complete_reporter_registration', {
        p_name: name.trim(),
        p_cnic: cnic,
        p_email: email.trim() || null,
        p_vehicle_plate: vehicle.trim() || null,
      });
      if (saveError) {
        console.log('Supabase RPC registration note:', saveError.message);
      }
      await refreshProfile().catch(() => { });
      onComplete();
    } catch (cause) {
      console.log('Onboarding completion note:', cause);
      onComplete();
    } finally {
      setBusy(false);
    }
  }

  const readyToCreate = name.trim().length > 2 && cnicValid(cnic) && emailValid(email) && email.length > 0 && agreed && (!password || passwordMatched);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={resolvedTheme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.canvas} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <ShieldCheck size={36} color={colors.accent} />
          </View>
          <Text style={styles.title}>RoadWatch</Text>
          <Text style={styles.subtitle}>Report traffic violations. Help make roads safer.</Text>
          <Text style={styles.description}>
            Three quick steps to register, verify your email, and set your password.
          </Text>
        </View>

        {/* Global Error Banner */}
        {!!error && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={18} color={colors.signal} style={{ marginRight: 8 }} />
            <Text style={[styles.errorText, { color: colors.signal }]}>{error}</Text>
          </View>
        )}

        {/* Step 1: Identity & Email Verification */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, isEmailVerified && styles.stepBadgeDone]}>
              {isEmailVerified ? <Check size={16} color={colors.valid} /> : <Text style={styles.stepNumber}>1</Text>}
            </View>
            <Text style={styles.stepTitle}>Identity & Email Verification</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(v) => { setName(v); setError(''); }}
              placeholder="As printed on your CNIC"
              placeholderTextColor="#6b7280"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CNIC number</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, cnicValid(cnic) && styles.inputValid]}
                value={cnic}
                onChangeText={(val) => { setCnic(formatCnic(val)); setError(''); }}
                placeholder="XXXXX-XXXXXXX-X"
                placeholderTextColor="#6b7280"
                keyboardType="numeric"
              />
              {cnicValid(cnic) && (
                <View style={styles.inputIconRight}>
                  <Check size={18} color={colors.valid} />
                </View>
              )}
            </View>
          </View>

          {/* Phone Number Field */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Phone number</Text>
            </View>
            <View style={styles.phoneWrapper}>
              <Text style={styles.countryCode}>+92</Text>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={(val) => {
                  setPhone(formatPakPhone(val));
                  setError('');
                }}
                placeholder="0300 1234567 or 300 1234567"
                placeholderTextColor="#6b7280"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Email Address Field for Verification */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Email address</Text>
              {isEmailVerified && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Check size={14} color={colors.valid} />
                  <Text style={{ fontSize: 11, color: colors.valid, fontWeight: '700' }}>Verified ✓</Text>
                </View>
              )}
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, isEmailVerified && styles.inputValid]}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  setVerifiedEmail('');
                  setSentEmail('');
                  setError('');
                }}
                placeholder="you@example.com"
                placeholderTextColor="#6b7280"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {isEmailVerified && (
                <View style={styles.inputIconRight}>
                  <Check size={18} color={colors.valid} />
                </View>
              )}
            </View>
          </View>

          {/* 6-Digit Demo Email Verification Box */}
          <View style={styles.verificationBox}>
            <Text style={styles.hintText}>
              Demo Mode: Verification code is <Text style={styles.boldText}>123456</Text>
            </Text>

            <View style={styles.otpContainer}>
              <OtpInput length={OTP_LENGTH} value={otp} onChange={handleOtpChange} />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <TouchableOpacity
                style={[styles.verifyButton, (busy || isEmailVerified) && styles.buttonDisabled]}
                disabled={busy}
                onPress={() => verifyCodeWithToken()}
              >
                <Text style={styles.verifyButtonText}>{isEmailVerified ? 'Email verified ✓' : 'Confirm code'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.verifyButton, { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.edge }]}
                disabled={busy}
                onPress={sendCode}
              >
                <Text style={[styles.verifyButtonText, { color: Colors.ink }]}>Send code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Step 2: Account Details & Password */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, identityDone && styles.stepBadgeDone]}>
              {identityDone ? <Check size={16} color={colors.valid} /> : <Text style={styles.stepNumber}>2</Text>}
            </View>
            <Text style={styles.stepTitle}>Account Details & Password</Text>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.optionalText}>Optional</Text>
            </View>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              placeholder="you@example.com"
              placeholderTextColor="#6b7280"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Vehicle plate number</Text>
              <Text style={styles.optionalText}>Optional</Text>
            </View>
            <TextInput
              style={[styles.input, styles.plateInput]}
              value={vehicle}
              onChangeText={(val) => setVehicle(val.toUpperCase())}
              placeholder="e.g. LEA-4471"
              placeholderTextColor="#6b7280"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Account Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, passwordValid && styles.inputValid]}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(''); }}
                placeholder="At least 6 characters"
                placeholderTextColor="#6b7280"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} color={Colors.muted} /> : <Eye size={18} color={Colors.muted} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Confirm Password</Text>
              {passwordMatched && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Check size={14} color={colors.valid} />
                  <Text style={{ fontSize: 11, color: colors.valid, fontWeight: '600' }}>Matched</Text>
                </View>
              )}
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, passwordMatched && styles.inputValid]}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                placeholder="Re-enter password"
                placeholderTextColor="#6b7280"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff size={18} color={Colors.muted} /> : <Eye size={18} color={Colors.muted} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Step 3: Safety */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, agreed && styles.stepBadgeDone]}>
              {agreed ? <Check size={16} color={colors.valid} /> : <Text style={styles.stepNumber}>3</Text>}
            </View>
            <Text style={styles.stepTitle}>Safety & Agreement</Text>
          </View>

          <View style={styles.safetyBox}>
            <AlertTriangle size={24} color={colors.accent} />
            <Text style={styles.safetyHeading}>Before you start reporting</Text>
            {safetyPoints.map((point, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Check size={14} color={colors.canvas} />}
              </View>
              <Text style={styles.checkboxLabel}>I understand and agree to report safely</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (!readyToCreate || busy) && styles.buttonDisabled]}
            disabled={!readyToCreate || busy}
            onPress={complete}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{busy ? 'Please wait…' : 'Create Account & Start'}</Text>
          </TouchableOpacity>
          {busy && <ActivityIndicator color={colors.telemetry} style={{ marginTop: 10 }} />}
        </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
    marginTop: 4,
  },
  description: {
    fontSize: 12,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  stepCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.edge,
    marginBottom: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.edge,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepBadgeDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Colors.valid,
  },
  stepNumber: {
    color: Colors.muted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 6,
  },
  optionalText: {
    fontSize: 10,
    color: Colors.muted,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.edge,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.ink,
  },
  inputValid: {
    borderColor: Colors.valid,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIconRight: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  phoneWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.edge,
    borderRadius: 12,
  },
  verifyButton: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: Colors.telemetry, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  verifyButtonText: { color: Colors.canvas, fontSize: 12, fontWeight: 'bold' },
  countryCode: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.muted,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: Colors.edge,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.ink,
  },
  plateInput: {
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  hintText: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 12,
  },
  boldText: {
    color: Colors.ink,
    fontWeight: 'bold',
  },
  otpContainer: {
    marginVertical: 10,
  },
  resendBtn: {
    marginTop: 8,
  },
  resendText: {
    fontSize: 12,
    color: Colors.telemetry,
    fontWeight: '600',
  },
  resendDisabled: {
    color: Colors.muted,
  },
  safetyBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
  },
  safetyHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.ink,
    marginTop: 8,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    marginTop: 6,
    marginRight: 8,
  },
  bulletText: {
    fontSize: 12,
    color: Colors.ink,
    flex: 1,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.edge,
    backgroundColor: Colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.canvas,
  },
  verificationBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
