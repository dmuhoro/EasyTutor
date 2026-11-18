import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase, isSupabaseAvailable } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { COLORS } from '../../src/design/tokens';
import { PASSWORD_UPDATED_PATH } from '../../lib/authRedirect';

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'verify' | 'reset' | 'done'>('verify');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle Supabase auth redirect from email confirmation / password reset links.
    // When the user clicks the email link, Supabase sets a session in the browser
    // (web) or deep-link (native). Check for an existing session.
  const checkSession = async () => {
    if (!supabase || !isSupabaseAvailable()) return;

    const { data: sessionData } = await supabase.auth.getSession();

    // If we have a session from the redirect, move to the reset step
    // so the user can set a new password.
    if (sessionData?.session) {
      setStep('reset');
    }
  };

    checkSession();
  }, []);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!supabase) {
      setError('Authentication service unavailable.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    // Not implemented here — user should go back to login and use Forgot Password.
    Alert.alert(
      'Request a new reset link',
      'Go back to the sign-in screen and tap "Forgot Password?" to receive a new link.'
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.surface.bg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <LinearGradient colors={['transparent', COLORS.overlay, COLORS.surface.bg]} className="flex-1">
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            {/* Skip to content */}
            <TouchableOpacity
              accessibilityRole="link"
              aria-label="Skip to main content"
              onPress={() => {}}
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-brand-500 focus:text-white focus:rounded-lg"
            >
              <Text className="text-white font-bold font-syne">Skip to main content</Text>
            </TouchableOpacity>

            {/* Brand */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-brand-500 rounded-3xl items-center justify-center shadow-2xl shadow-brand-500/40 mb-6">
                <Ionicons name="lock-open" size={40} color={COLORS.text.primary} />
              </View>
              <Text className="text-text-primary text-4xl font-bold font-syne text-center">
                Reset Password
              </Text>
              <Text className="text-text-secondary font-dmsans text-center mt-2">
                Set a new password for your account
              </Text>
            </View>

            {/* Auth card */}
            <View className="bg-surface-card/80 p-6 rounded-[40px] border border-surface-border/60">
              {step === 'verify' && (
                <>
                  <Text className="text-text-primary text-xl font-bold font-syne mb-2">
                    Check your email
                  </Text>
                  <Text className="text-text-secondary font-dmsans mb-6 text-center">
                    A password reset link has been sent to your email. Open it on this device
                    to continue setting a new password.
                  </Text>
                  <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    onPress={handleResend}
                  >
                    Didn't receive a link?
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    className="mt-4"
                    onPress={() => router.push('/(auth)/login')}
                  >
                    Back to sign in
                  </Button>
                </>
              )}

              {step === 'reset' && (
                <>
                  <Text className="text-text-primary text-xl font-bold font-syne mb-2">
                    New Password
                  </Text>
                  <Text className="text-text-secondary font-dmsans mb-6">
                    Choose a strong password you'll remember.
                  </Text>

                  <View className="mb-6">
                    <View className="bg-surface-bg border border-surface-border rounded-2xl flex-row items-center px-4 mb-4">
                      <Ionicons name="lock-closed" size={20} color={COLORS.text.secondary} />
                      <TextInput
                        placeholder="New Password"
                        placeholderTextColor={COLORS.text.muted}
                        className="flex-1 h-16 text-text-primary ml-3 font-dmsans"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                      />
                    </View>

                    <View className="bg-surface-bg border border-surface-border rounded-2xl flex-row items-center px-4">
                      <Ionicons name="lock-closed" size={20} color={COLORS.text.secondary} />
                      <TextInput
                        placeholder="Confirm Password"
                        placeholderTextColor={COLORS.text.muted}
                        className="flex-1 h-16 text-text-primary ml-3 font-dmsans"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                      />
                    </View>
                  </View>

                  {error && (
                    <View className="mb-4 p-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30">
                      <Text className="text-[#ef4444] text-sm font-dmsans">{error}</Text>
                    </View>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    disabled={!password || !confirmPassword}
                    onPress={handleReset}
                  >
                    Update Password
                  </Button>
                </>
              )}

              {step === 'done' && (
                <>
                  <View className="items-center mb-6">
                    <Ionicons name="checkmark-circle" size={48} color="#22c55e" className="mb-4" />
                    <Text className="text-text-primary text-2xl font-bold font-syne">
                      Password Updated
                    </Text>
                    <Text className="text-text-secondary font-dmsans text-center mt-2">
                      Your password has been changed successfully.
                    </Text>
                  </View>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onPress={() => router.push(PASSWORD_UPDATED_PATH)}
                  >
                    Continue to Learning
                  </Button>
                </>
              )}
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}
