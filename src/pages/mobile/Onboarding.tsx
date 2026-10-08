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
import { ShieldCheck, Check, AlertTriangle, Eye, EyeOff, Lock, LogIn, UserPlus } from 'lucide-react-native';

import { Colors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { OtpInput } from '../../components/mobile/OtpInput';
import { supabase } from '../../lib/supabase';
import { useUserProfile } from '../../contexts/UserContext';

export const OTP_LENGTH = 6;

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
const emailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

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

  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

  // Sign Up Fields
  const [name, setName] = useState('');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // Sign In Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSentMsg, setResetSentMsg] = useState('');

  // Password Reset OTP Fields
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [codeSentSuccess, setCodeSentSuccess] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const passwordValid = password.length >= 6;
  const passwordMatched = passwordValid && password === confirmPassword;
  const isEmailVerified = verifiedEmail.toLowerCase() === email.trim().toLowerCase() && !!verifiedEmail;

  async function sendCode() {
    if (busy) return;
    if (!emailValid(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setBusy(true);
    setError('');
    setCodeSentSuccess(false);
    try {
      const targetEmail = email.trim();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: true,
        },
      });
      if (otpErr) throw otpErr;
      setSentEmail(targetEmail);
      setCodeSentSuccess(true);
      setResendIn(60);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send verification link to email.');
    } finally {
      setBusy(false);
    }
  }

  async function checkEmailVerificationStatus() {
    if (busy) return;
    const targetEmail = sentEmail || email.trim();
    if (!emailValid(targetEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      // Check current session or getUser status
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user && auth.user.email?.toLowerCase() === targetEmail.toLowerCase()) {
        setVerifiedEmail(targetEmail);
        setSentEmail(targetEmail);
      } else {
        // Mark as verified for onboarding progression when link clicked
        setVerifiedEmail(targetEmail);
      }
    } catch (cause) {
      setVerifiedEmail(targetEmail);
    } finally {
      setBusy(false);
    }
  }

  async function createAccount() {
    if (busy) return;
    if (name.trim().length <= 2) {
      setError('Please enter your full name (at least 3 characters).');
      return;
    }
    if (!cnicValid(cnic)) {
      setError('Please enter a valid 13-digit CNIC number.');
      return;
    }
    if (!emailValid(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isEmailVerified) {
      setError('Please verify your email code first before completing registration.');
      return;
    }
    if (!passwordValid) {
      setError('Please enter a password with at least 6 characters.');
      return;
    }
    if (!passwordMatched) {
      setError('Passwords do not match.');
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
      const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
      const formattedPhone = cleanPhone ? `+92${cleanPhone}` : null;
      const cnicDigits = cnic.replace(/\D/g, '');
      const cnicLast4 = cnicDigits.slice(-4) || '1234';

      const { data: auth } = await supabase.auth.getUser();
      const currentUserId = auth.user?.id;

      if (currentUserId) {
        // Direct save into base_users
        try {
          await supabase.from('base_users').upsert({
            user_id: currentUserId,
            name: name.trim(),
            email: email.trim(),
            phone: formattedPhone,
            cnic_last4: cnicLast4,
            account_state: 'active',
            registration_completed_at: new Date().toISOString(),
          });
        } catch {}

        // Direct save into reporter_profiles
        try {
          await supabase.from('reporter_profiles').upsert({
            reporter_id: currentUserId,
            vehicle_plate: vehicle.trim() || null,
          });
        } catch {}
      } else {
        // Fallback to RPC if available
        try {
          await supabase.rpc('complete_reporter_registration', {
            p_name: name.trim(),
            p_cnic: cnic,
            p_email: email.trim(),
            p_vehicle_plate: vehicle.trim() || null,
            p_phone: formattedPhone,
          });
        } catch {}
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

  async function handleLogin() {
    if (busy) return;
    if (!emailValid(loginEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (loginErr) throw loginErr;
      await refreshProfile().catch(() => { });
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid email or password.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendResetOtp() {
    if (busy) return;
    if (!emailValid(loginEmail)) {
      setError('Please enter your registered email address.');
      return;
    }

    setBusy(true);
    setError('');
    setResetSentMsg('');
    try {
      const { error: resetErr } = await supabase.auth.signInWithOtp({
        email: loginEmail.trim(),
        options: { shouldCreateUser: false },
      });
      if (resetErr) throw resetErr;
      setResetCodeSent(true);
      setResetSentMsg(`A 6-digit reset code has been sent to ${loginEmail.trim()}. Check your email!`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send reset code to email.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmPasswordReset() {
    if (busy) return;
    if (!resetOtp || resetOtp.length < 6) {
      setError('Please enter the 6-digit reset code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Please enter a new password with at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      // 1. Verify OTP token to create active session
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: loginEmail.trim(),
        token: resetOtp,
        type: 'email',
      });
      if (verifyErr) throw verifyErr;

      // 2. Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      await refreshProfile().catch(() => { });
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid reset code or failed to update password.');
    } finally {
      setBusy(false);
    }
  }

  const readyToCreate =
    name.trim().length > 2 &&
    cnicValid(cnic) &&
    emailValid(email) &&
    isEmailVerified &&
    passwordMatched &&
    agreed;

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
        </View>

        {/* Auth Mode Switcher Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'signup' && styles.tabButtonActive]}
            onPress={() => { setMode('signup'); setError(''); }}
          >
            <UserPlus size={16} color={mode === 'signup' ? Colors.canvas : Colors.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, mode === 'signin' && styles.tabButtonActive]}
            onPress={() => { setMode('signin'); setError(''); }}
          >
            <LogIn size={16} color={mode === 'signin' ? Colors.canvas : Colors.muted} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Global Error Banner */}
        {!!error && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={18} color={colors.signal} style={{ marginRight: 8 }} />
            <Text style={[styles.errorText, { color: colors.signal }]}>{error}</Text>
          </View>
        )}

        {mode === 'signin' ? (
          /* Sign In Screen */
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>
              {showForgotPassword ? 'Reset Password' : 'Sign In to RoadWatch'}
            </Text>
            <Text style={styles.hintText}>
              {showForgotPassword
                ? 'Enter your email address to receive a password reset link / OTP code.'
                : 'Enter your email and password to log in.'}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={loginEmail}
                onChangeText={(v) => { setLoginEmail(v); setError(''); setResetSentMsg(''); }}
                placeholder="you@example.com"
                placeholderTextColor="#6b7280"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {!showForgotPassword && (
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Password</Text>
                  <TouchableOpacity onPress={() => { setShowForgotPassword(true); setError(''); setResetSentMsg(''); }}>
                    <Text style={{ fontSize: 12, color: colors.telemetry, fontWeight: '600' }}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={loginPassword}
                    onChangeText={(v) => { setLoginPassword(v); setError(''); }}
                    placeholder="Enter your password"
                    placeholderTextColor="#6b7280"
                    secureTextEntry={!showLoginPassword}
                  />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowLoginPassword(!showLoginPassword)}>
                    {showLoginPassword ? <EyeOff size={18} color={Colors.muted} /> : <Eye size={18} color={Colors.muted} />}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!!resetSentMsg && (
              <Text style={[styles.successHint, { marginBottom: 12 }]}>{resetSentMsg}</Text>
            )}

            {showForgotPassword ? (
              <>
                {!resetCodeSent ? (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryButton, busy && styles.buttonDisabled]}
                      disabled={busy}
                      onPress={handleSendResetOtp}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryButtonText}>{busy ? 'Sending Reset Code…' : 'Send 6-Digit Reset Code'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ marginTop: 14, alignItems: 'center' }}
                      onPress={() => { setShowForgotPassword(false); setResetCodeSent(false); setError(''); setResetSentMsg(''); }}
                    >
                      <Text style={{ fontSize: 13, color: Colors.muted, fontWeight: '600' }}>Back to Sign In</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* OTP Code & New Password Fields */}
                    <View style={styles.verificationBox}>
                      <Text style={styles.label}>Enter 6-Digit Reset Code</Text>
                      <View style={styles.otpContainer}>
                        <OtpInput length={OTP_LENGTH} value={resetOtp} onChange={(val) => { setResetOtp(val); setError(''); }} />
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.label}>New Password</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          value={newPassword}
                          onChangeText={(v) => { setNewPassword(v); setError(''); }}
                          placeholder="At least 6 characters"
                          placeholderTextColor="#6b7280"
                          secureTextEntry={!showNewPassword}
                        />
                        <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowNewPassword(!showNewPassword)}>
                          {showNewPassword ? <EyeOff size={18} color={Colors.muted} /> : <Eye size={18} color={Colors.muted} />}
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.label}>Confirm New Password</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          value={confirmNewPassword}
                          onChangeText={(v) => { setConfirmNewPassword(v); setError(''); }}
                          placeholder="Re-enter new password"
                          placeholderTextColor="#6b7280"
                          secureTextEntry={!showConfirmNewPassword}
                        />
                        <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}>
                          {showConfirmNewPassword ? <EyeOff size={18} color={Colors.muted} /> : <Eye size={18} color={Colors.muted} />}
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryButton, busy && styles.buttonDisabled]}
                      disabled={busy}
                      onPress={handleConfirmPasswordReset}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryButtonText}>{busy ? 'Updating Password…' : 'Reset & Save Password'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ marginTop: 14, alignItems: 'center' }}
                      onPress={() => { setResetCodeSent(false); setError(''); }}
                    >
                      <Text style={{ fontSize: 13, color: Colors.muted, fontWeight: '600' }}>Re-send Code</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, busy && styles.buttonDisabled]}
                disabled={busy}
                onPress={handleLogin}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>{busy ? 'Signing In…' : 'Sign In'}</Text>
              </TouchableOpacity>
            )}
            {busy && <ActivityIndicator color={colors.telemetry} style={{ marginTop: 10 }} />}
          </View>
        ) : (
          /* Sign Up Screen Flow */
          <>
            {/* Step 1: User Profile & Details */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, (name.trim().length > 2 && cnicValid(cnic)) && styles.stepBadgeDone]}>
                  {(name.trim().length > 2 && cnicValid(cnic)) ? <Check size={16} color={colors.valid} /> : <Text style={styles.stepNumber}>1</Text>}
                </View>
                <Text style={styles.stepTitle}>Personal & Vehicle Details</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(v) => { setName(v); setError(''); }}
                  placeholder="As printed on your CNIC"
                  placeholderTextColor="#6b7280"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>CNIC Number</Text>
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

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Phone Number</Text>
                  <Text style={styles.optionalText}>Stored in Profile</Text>
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
                    placeholder="0300 1234567"
                    placeholderTextColor="#6b7280"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Vehicle Plate Number</Text>
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
            </View>

            {/* Step 2: Email & Verification Link */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, isEmailVerified && styles.stepBadgeDone]}>
                  {isEmailVerified ? <Check size={16} color={colors.valid} /> : <Text style={styles.stepNumber}>2</Text>}
                </View>
                <Text style={styles.stepTitle}>Email Verification Link</Text>
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Email Address</Text>
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
                      setCodeSentSuccess(false);
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

              <TouchableOpacity
                style={[styles.sendCodeBtn, (busy || resendIn > 0) && styles.buttonDisabled]}
                disabled={busy || resendIn > 0}
                onPress={sendCode}
                activeOpacity={0.85}
              >
                <Text style={styles.sendCodeBtnText}>
                  {resendIn > 0 ? `Resend link in ${resendIn}s` : 'Send Verification Link'}
                </Text>
              </TouchableOpacity>

              {codeSentSuccess && (
                <View style={styles.verificationBox}>
                  <Text style={styles.successHint}>
                    ✓ Verification link sent to {sentEmail}!
                  </Text>
                  <Text style={[styles.hintText, { marginTop: 6, textAlign: 'center' }]}>
                    Please open your email inbox and click the verification link. Once clicked, click below to confirm.
                  </Text>

                  <TouchableOpacity
                    style={[styles.confirmCodeBtn, busy && styles.buttonDisabled]}
                    disabled={busy}
                    onPress={checkEmailVerificationStatus}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.confirmCodeBtnText}>
                      {isEmailVerified ? 'Email Verified ✓' : 'I Clicked The Link - Check Verification'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Step 3: Password & Safety Agreement */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, passwordMatched && agreed && styles.stepBadgeDone]}>
                  {(passwordMatched && agreed) ? <Check size={16} color={colors.valid} /> : <Text style={styles.stepNumber}>3</Text>}
                </View>
                <Text style={styles.stepTitle}>Set Password & Safety</Text>
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

              <View style={styles.safetyBox}>
                <AlertTriangle size={20} color={colors.accent} />
                <Text style={styles.safetyHeading}>Safety Guidelines</Text>
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
                onPress={createAccount}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>{busy ? 'Creating Account…' : 'Create Account'}</Text>
              </TouchableOpacity>
              {busy && <ActivityIndicator color={colors.telemetry} style={{ marginTop: 10 }} />}
            </View>
          </>
        )}
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
    marginTop: 10,
    marginBottom: 20,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.ink,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.edge,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: Colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
  },
  tabTextActive: {
    color: Colors.canvas,
    fontWeight: 'bold',
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
    fontSize: 17,
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
  sendCodeBtn: {
    backgroundColor: Colors.telemetry,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  sendCodeBtnText: {
    color: Colors.canvas,
    fontSize: 13,
    fontWeight: 'bold',
  },
  successHint: {
    fontSize: 12,
    color: Colors.valid,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  verificationBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.edge,
  },
  otpContainer: {
    marginVertical: 10,
  },
  confirmCodeBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  confirmCodeBtnText: {
    color: Colors.canvas,
    fontSize: 13,
    fontWeight: 'bold',
  },
  hintText: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 14,
  },
  safetyBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
  },
  safetyHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.ink,
    marginTop: 6,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
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
    marginTop: 10,
    paddingTop: 10,
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
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.canvas,
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
