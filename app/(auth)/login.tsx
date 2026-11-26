import { t } from '../../src/locales';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase, isSupabaseAvailable } from '../../lib/supabase';
import { buildAuthRedirect, EMAIL_CONFIRMATION_PATH, OAUTH_RETURN_PATH, PASSWORD_RESET_PATH } from '../../lib/authRedirect';
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
  const [resetPending, setResetPending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const emailRef = useRef(null as any);
  const authLock = useRef(false);
  const toast = useToast();

  useEffect(() => {
    if (resetSent && emailRef.current) {
      emailRef.current.focus();
    }
  }, [resetSent]);

  const handleAuth = async () => {
    if (authLock.current || loading) return;

    if (!isSupabaseAvailable()) {
      toast.show({
        title: t('s0'),
        message: t('s97'),
        variant: 'warning',
      });
      return;
    }

    if (!email || !password) {
      toast.show({ title: t('s303'), message: t('s404'), variant: 'warning' });
      return;
    }

    authLock.current = true;
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase!.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildAuthRedirect(EMAIL_CONFIRMATION_PATH),
          },
        });
        if (error) throw error;
        if (data.user?.id) {
          track('user_registered', { user_id: data.user.id });
        }
        toast.show({
          title: t('s442'),
          message: t('s60'),
          variant: 'success',
        });
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.show({
        title: isSignUp ? t('s347') : t('s163'),
        message: error.message || t('s196'),
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
        title: t('s0'),
        message: t('s262'),
        variant: 'warning',
      });
      return;
    }
    authLock.current = true;
    setLoading(true);
    try {
      const { error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildAuthRedirect(OAUTH_RETURN_PATH),
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.show({
        title: t('s72'),
        message: error.message || t('s83'),
        variant: 'error',
      });
    } finally {
      setLoading(false);
      authLock.current = false;
    }
  };

  const handleForgotPassword = async () => {
    if (authLock.current || loading || resetPending) return;
    if (!isSupabaseAvailable()) {
      toast.show({
        title: t('s0'),
        message: t('s244'),
        variant: 'warning',
      });
      return;
    }
    if (!email) {
      toast.show({ title: t('s22'), message: t('s77'), variant: 'warning' });
      return;
    }
    authLock.current = true;
    setResetPending(true);
    try {
      const { error } = await supabase!.auth.resetPasswordForEmail(email, {
        redirectTo: buildAuthRedirect(PASSWORD_RESET_PATH),
      });
      if (error) throw error;
      track('password_reset_requested', { email });
      setResetSent(true);
      toast.show({
        title: t('s308'),
        message: t('s20'),
        variant: 'success',
      });
    } catch (error: any) {
      toast.show({
        title: t('s14'),
        message: error.message || t('s196'),
        variant: 'error',
      });
    } finally {
      setLoading(false);
      setResetPending(false);
      authLock.current = false;
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.surface.bg }}>
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
            role="main"
            className="flex-1 px-6"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            {/* Skip to content for keyboard/screen-reader users */}
            <TouchableOpacity
              accessibilityRole="link"
              aria-label={t('s358')}
              onPress={() => emailRef.current?.focus()}
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-brand-500 focus:text-white focus:rounded-lg"
            >
              <Text className="text-white font-bold font-syne">{t('s358')}</Text>
            </TouchableOpacity>
            {/* Brand */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-brand-500 rounded-3xl items-center justify-center shadow-2xl shadow-brand-500/40 mb-6">
                <Ionicons name="school" size={40} color={COLORS.text.primary} />
              </View>
              <Text className="text-text-primary text-4xl font-bold font-syne text-center">
                {t('s80')}
              </Text>
              <Text className="text-text-secondary text-lg font-dmsans text-center mt-2">
                {t('s425')}
              </Text>
            </View>

            {/* Auth card */}
            <View className="bg-surface-card/80 p-6 rounded-[40px] border border-surface-border/60">
              <View className="flex-row mb-6">
                <Chip
                  label={t('s340')}
                  variant={isSignUp ? 'neutral' : 'brand'}
                  selected={!isSignUp}
                  onPress={() => setIsSignUp(false)}
                  className="mr-2"
                  aria-label={t('s361')}
                />
                <Chip
                  label={t('s36')}
                  variant={isSignUp ? 'brand' : 'neutral'}
                  selected={isSignUp}
                  onPress={() => setIsSignUp(true)}
                  aria-label={t('s304')}
                />
              </View>

              <Text className="text-text-primary text-2xl font-bold font-syne mb-2">
                {isSignUp ? t('s36') : t('s29')}
              </Text>
              <Text className="text-text-secondary font-dmsans mb-8">
                {isSignUp
                  ? t('s121')
                  : t('s224')}
              </Text>

              <View className="mb-6">
                <View className="bg-surface-bg border border-surface-border rounded-2xl flex-row items-center px-4 mb-4">
                  <Ionicons name="mail" size={20} color={COLORS.text.secondary} />
                  <TextInput
                    ref={emailRef}
                    placeholder={t('s19')}
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
                    placeholder={t('password')}
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 h-16 text-text-primary ml-3 font-dmsans"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              </View>

              {!isSignUp && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-end mb-4"
                  onPress={handleForgotPassword}
                  disabled={resetPending || loading}
                  aria-label={t('s456')}
                >
                  {resetPending ? t('s79') : t('s437')}
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
                {isSignUp ? t('s129') : t('s340')}
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
                {t('s369')}
              </Button>
            </View>

            <Text className="text-text-muted text-center font-dmsans text-xs mt-8">
              {t('s176')}
            </Text>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}
