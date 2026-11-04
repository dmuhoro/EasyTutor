import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase, isSupabaseAvailable } from '../../lib/supabase';
import { track } from '../../lib/analytics';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { useToast } from '../../components/ui/Toast';
import { COLORS } from '../../src/design/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const authLock = useRef(false);
  const toast = useToast();

  const handleAuth = async () => {
    if (authLock.current || loading) return;

    if (!isSupabaseAvailable()) {
      toast.show({
        title: 'Offline mode',
        message: 'Authentication needs a connection. Reconnect and try again.',
        variant: 'warning',
      });
      return;
    }

    if (!email || !password) {
      toast.show({ title: 'Missing details', message: 'Enter both email and password.', variant: 'warning' });
      return;
    }

    authLock.current = true;
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase!.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user?.id) {
          track('user_registered', { user_id: data.user.id });
        }
        toast.show({
          title: 'Account created',
          message: 'Check your email for the confirmation link.',
          variant: 'success',
        });
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.show({
        title: isSignUp ? 'Sign-up failed' : 'Sign-in failed',
        message: error.message || 'An unexpected error occurred.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
      authLock.current = false;
    }
  };

  const handleGoogle = async () => {
    if (authLock.current || loading) return;
    if (!isSupabaseAvailable()) {
      toast.show({
        title: 'Offline mode',
        message: 'Google sign-in needs a connection.',
        variant: 'warning',
      });
      return;
    }
    authLock.current = true;
    setLoading(true);
    try {
      const { error } = await supabase!.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (error: any) {
      toast.show({
        title: 'Google sign-in failed',
        message: error.message || 'Try again in a moment.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
      authLock.current = false;
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/auth_background.png')}
      className="flex-1"
      resizeMode="cover"
    >
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <LinearGradient
          colors={['transparent', COLORS.overlay, COLORS.surface.bg]}
          className="flex-1"
        >
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            {/* Brand */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-brand-500 rounded-3xl items-center justify-center shadow-2xl shadow-brand-500/40 mb-6">
                <Ionicons name="school" size={40} color={COLORS.text.primary} />
              </View>
              <Text className="text-text-primary text-4xl font-bold font-syne text-center">
                EasyTutor
              </Text>
              <Text className="text-text-secondary text-lg font-dmsans text-center mt-2">
                Your AI Study Partner
              </Text>
            </View>

            {/* Auth card */}
            <View className="bg-surface-card/80 p-6 rounded-[40px] border border-surface-border/60">
              <View className="flex-row mb-6">
                <Chip
                  label="Sign In"
                  variant={isSignUp ? 'neutral' : 'brand'}
                  selected={!isSignUp}
                  onPress={() => setIsSignUp(false)}
                  className="mr-2"
                />
                <Chip
                  label="Create Account"
                  variant={isSignUp ? 'brand' : 'neutral'}
                  selected={isSignUp}
                  onPress={() => setIsSignUp(true)}
                />
              </View>

              <Text className="text-text-primary text-2xl font-bold font-syne mb-2">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text className="text-text-secondary font-dmsans mb-8">
                {isSignUp
                  ? 'Join the community of self-taught learners.'
                  : 'Sign in to continue your learning journey.'}
              </Text>

              <View className="mb-6">
                <View className="bg-surface-bg border border-surface-border rounded-2xl flex-row items-center px-4 mb-4">
                  <Ionicons name="mail" size={20} color={COLORS.text.secondary} />
                  <TextInput
                    placeholder="Email Address"
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 h-16 text-text-primary ml-3 font-dmsans"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View className="bg-surface-bg border border-surface-border rounded-2xl flex-row items-center px-4">
                  <Ionicons name="lock-closed" size={20} color={COLORS.text.secondary} />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 h-16 text-text-primary ml-3 font-dmsans"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              </View>

              {!isSignUp && (
                <Button variant="ghost" size="sm" className="self-end mb-4">
                  Forgot Password?
                </Button>
              )}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                onPress={handleAuth}
                icon={isSignUp ? 'person-add-outline' : 'log-in-outline'}
                iconPosition="right"
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>

              <Button
                variant="inverse"
                size="lg"
                fullWidth
                disabled={loading}
                onPress={handleGoogle}
                icon="logo-google"
                className="mt-3"
              >
                Continue with Google
              </Button>
            </View>

            <Text className="text-text-muted text-center font-dmsans text-xs mt-8">
              Your progress stays on this device and syncs when you are online.
            </Text>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
