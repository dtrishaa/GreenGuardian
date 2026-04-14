// src/screens/RegisterScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import GradientBackground from '../utils/GradientBackground';
import Ionicons from '@expo/vector-icons/Ionicons';

const STEPS = 4;

const strengthConfig = [
  { label: 'Very weak', color: '#ef4444' },
  { label: 'Weak',      color: '#f97316' },
  { label: 'Fair',      color: '#eab308' },
  { label: 'Good',      color: '#22c55e' },
  { label: 'Strong',    color: '#16a34a' },
];

function getPasswordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { register } = useAuth();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(formData.password);
  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const update = (field, value) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleNext = () => {
    if (step === 1) {
      if (formData.name.trim().length < 2) {
        Alert.alert('Invalid name', 'Please enter at least 2 characters.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!validateEmail(formData.email)) {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (strength < 2) {
        Alert.alert('Weak password', 'Use at least 6 characters, ideally with numbers or symbols.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!passwordsMatch) {
        Alert.alert('Mismatch', 'Passwords do not match.');
        return;
      }
      handleRegister();
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      await register(formData.name, formData.email, formData.password);
      navigation.replace('Welcome');
    } catch (error) {
      Alert.alert('Registration failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepHeading}>What's your name?</Text>
            <Text style={styles.stepHint}>This is how we'll greet you in the app.</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={formData.name}
              onChangeText={v => update('name', v)}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
              placeholderTextColor="#9ca3af"
            />
            {formData.name.trim().length >= 2 && (
              <Text style={styles.validMsg}>Looks good</Text>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepHeading}>What's your email?</Text>
            <Text style={styles.stepHint}>We'll use this to sign you in.</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder="you@example.com"
              value={formData.email}
              onChangeText={v => update('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
              placeholderTextColor="#9ca3af"
            />
            {formData.email.length > 0 && (
              <Text style={validateEmail(formData.email) ? styles.validMsg : styles.errorMsg}>
                {validateEmail(formData.email) ? 'Valid email' : 'Enter a valid email address'}
              </Text>
            )}
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipText}>{formData.name}</Text>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepHeading}>Create a password</Text>
            <Text style={styles.stepHint}>Minimum 6 characters. Use numbers and symbols for a stronger password.</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={passwordRef}
                style={styles.passwordInput}
                placeholder="Password"
                value={formData.password}
                onChangeText={v => update('password', v)}
                secureTextEntry={!showPassword}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleNext}
                placeholderTextColor="#9ca3af"
              />
              <Pressable
                onPress={() => setShowPassword(p => !p)}
                style={({ pressed }) => [styles.eyeButton, pressed && { opacity: 0.5 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
              </Pressable>
            </View>

            {formData.password.length > 0 && (
              <View style={styles.strengthWrapper}>
                <View style={styles.strengthBarTrack}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor:
                            i <= strength
                              ? strengthConfig[strength].color
                              : '#e5e7eb',
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strengthConfig[strength].color }]}>
                  {strengthConfig[strength].label}
                </Text>
              </View>
            )}

            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipText}>{formData.email}</Text>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepHeading}>Confirm your password</Text>
            <Text style={styles.stepHint}>Re-enter your password to continue.</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={confirmRef}
                style={styles.passwordInput}
                placeholder="Retype password"
                value={formData.confirmPassword}
                onChangeText={v => update('confirmPassword', v)}
                secureTextEntry={!showConfirm}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleNext}
                placeholderTextColor="#9ca3af"
              />
              <Pressable
                onPress={() => setShowConfirm(p => !p)}
                style={({ pressed }) => [styles.eyeButton, pressed && { opacity: 0.5 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
              >
                <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
              </Pressable>
            </View>

            {formData.confirmPassword.length > 0 && (
              <Text style={passwordsMatch ? styles.validMsg : styles.errorMsg}>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </Text>
            )}

            <View style={styles.reviewBox}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Name</Text>
                <Text style={styles.reviewValue}>{formData.name}</Text>
              </View>
              <View style={[styles.reviewRow, styles.reviewRowBorder]}>
                <Text style={styles.reviewLabel}>Email</Text>
                <Text style={styles.reviewValue}>{formData.email}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Password</Text>
                <Text style={styles.reviewValue}>{'•'.repeat(Math.min(formData.password.length, 10))}</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.stepCounter}>Step {step} of {STEPS}</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(step / STEPS) * 100}%` }]} />
          </View>

          {renderStep()}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {step === STEPS ? 'Create account' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backButton: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    color: '#2e7d32',
    fontWeight: '500',
  },
  stepCounter: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 28,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2e7d32',
    borderRadius: 2,
  },
  stepContent: {
    marginBottom: 24,
    minHeight: 210,
  },
  stepHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  stepHint: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 18,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fafafa',
    marginBottom: 10,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    marginBottom: 10,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validMsg: {
    fontSize: 13,
    color: '#16a34a',
    marginBottom: 10,
    marginLeft: 2,
  },
  errorMsg: {
    fontSize: 13,
    color: '#dc2626',
    marginBottom: 10,
    marginLeft: 2,
  },
  strengthWrapper: {
    marginBottom: 12,
  },
  strengthBarTrack: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  summaryChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 6,
  },
  summaryChipText: {
    fontSize: 13,
    color: '#374151',
  },
  reviewBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  reviewRowBorder: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  reviewValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    maxWidth: '65%',
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
});