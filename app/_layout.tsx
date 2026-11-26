import { t } from '../src/locales';
import { LEGACY_COLORS } from '../src/design/legacyPalette';
import { useEffect, useState } from 'react';
import { AppState, AppStateStatus, View, Text, TouchableOpacity } from 'react-native';import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import Ionicons from '@expo/vector-icons/Ionicons';
import { isSupabaseAvailable } from '../lib/supabase';
import { Database } from '../src/infrastructure/database';
import { useAuthStore } from '../store/authStore';
import { useProgressStore } from '../store/progressStore';
import { LearningMode, useRoadmapStore } from '../store/roadmapStore';
import { useSettingsStore } from '../store/settingsStore';
import { GlobalErrorBoundary } from '../components/GlobalErrorBoundary';
import { AppSkeleton } from '../components/AppSkeleton';
import { ToastProvider } from '../components/ui/Toast';
// Deferred dynamic imports are used for startup-heavy modules.
import { logEvent, setLogContext } from '../lib/logEvent';
import { scheduleIdleTask } from '../lib/idleTask';
import { resolveBootState } from '../lib/boot';
import { normalizeProfile } from '../lib/normalize';
import { getAuthenticatedUser, getSupabaseClient, logSupabaseError } from '../lib/supabaseOps';
import '../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// One-time per session: warn once that the embedding model is not pulled.
let embeddingWarningChecked = false;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const { session, setSession, isLoading: authLoading } = useAuthStore();
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(!isSupabaseAvailable());
  const [showEmbeddingWarning, setShowEmbeddingWarning] = useState(false);
  // System-font fallback: never hold first paint hostage to a font download.
  // After a short grace window the shell renders with platform fonts and the
  // custom fonts swap in when (if) they arrive.
  const [fontGraceElapsed, setFontGraceElapsed] = useState(false);
  const { 
    onboardingComplete, 
    learningMode, 
    setUserId: setRoadmapUserId,
    setLearningMode,
    setOnboardingComplete 
  } = useRoadmapStore();
  const { setUserId: setProgressUserId, awardLoginXP } = useProgressStore();
  const segments = useSegments();
  const router = useRouter();
  // Light-first: screens render the light palette until per-screen dark
  // variants land, so only an explicit `dark` selection flips the chrome.
  const theme = useSettingsStore((s) => s.theme);
  const isDarkChrome = theme === 'dark';

  const fontsSettled = fontsLoaded || Boolean(fontError) || fontGraceElapsed;

  // First paint is latched: once the shell has rendered, a later auth/profile
  // refresh must never swap it back to the skeleton. Unmounting the <Stack>
  // resets expo-router's navigation state, and the router then re-derives the
  // URL from the route tree while dropping the user's back-stack. See
  // lib/boot.ts for the rule and the regression it prevents.
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const boot = resolveBootState(
    { authLoading, profileLoading: isProfileLoading, fontsSettled },
    hasBootstrapped,
  );
  useEffect(() => {
    if (boot.shouldLatch) setHasBootstrapped(true);
  }, [boot.shouldLatch]);
  const isAppReady = boot.isAppReady;
  const isKnownLearningMode = (mode: string): mode is LearningMode =>
    mode === 'high_school' || mode === 'university' || mode === 'self_directed';

  useEffect(() => {
    const timer = setTimeout(() => setFontGraceElapsed(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const retry = async <T,>(fn: () => Promise<T>, retries = 3): Promise<T> => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        console.warn(`[PROFILE] Retry ${i + 1} failed`, err);
      }
    }
    throw new Error('Max retries reached');
  };

  const syncProfile = async (userId: string) => {
    setIsProfileLoading(true);
    setIsOfflineMode(false);
    try {
      const authUser = await getAuthenticatedUser();
      setLogContext({ userId: authUser.id });

      const profile = await retry(async () => {
        const { data, error } = await Database.governedQuery({
          table: 'profiles',
          columns: '*',
          userId: authUser.id,
        }).maybeSingle();

        if (error) {
          logSupabaseError('profiles', 'select', error);
          console.error('[PROFILE FETCH ERROR]', error);
          throw error;
        }

        if (!data) {
          await Database.governedWrite('profiles', {
            id: authUser.id,
            email: authUser.email ?? '',
            learning_mode: null,
            onboarding_complete: false,
          });

          console.log('[PROFILE] Created successfully');
          // Re-fetch on next sync pass; caller should fall back to defaults now.
          return null;
        }

        return data;
      });

      const safeProfile = normalizeProfile(profile ?? {});
      if (isKnownLearningMode(safeProfile.learning_mode)) {
        setLearningMode(safeProfile.learning_mode);
      }
      setOnboardingComplete(Boolean(safeProfile.onboarding_complete));
      setProfileError(null);

      console.log('[PROFILE] Sync success');
      return safeProfile;
    } catch (err) {
      console.error('[PROFILE FATAL]', err);
      setProfileError('Profile sync failed. Using offline defaults.');
      return null;
    } finally {
      setIsProfileLoading(false);
    }
  };

  useEffect(() => {
    // Defer non-critical startup work to a browser idle period. A 100 ms timer
    // ran inside Lighthouse's TBT window on every route; idle scheduling keeps
    // the work (and its explicit failure logging) without blocking first input.
    const cancelIdleTask = scheduleIdleTask(() => {
      void import('../data/knowledgeStore').then(({ initializeKnowledge, syncToRemote }) => {
        initializeKnowledge();
        void logEvent('INFO', 'app_start', { offlineMode: !isSupabaseAvailable() });

        void (async () => {
          try {
            const { retryFailedSyncs } = await import('../services/syncEngine');
            await retryFailedSyncs();
            await syncToRemote();
          } catch (err) {
            await logEvent('WARN', 'startup_sync_failed', {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        })();
      });
    });

    // Flush offline analytics queue on foreground — fire-and-forget.
    // Analytics is loaded on demand so it never blocks the initial chunk.
    let previousState: AppStateStatus = AppState.currentState;
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const userId = useAuthStore.getState().session?.user?.id;
      const learningMode = useRoadmapStore.getState().learningMode ?? 'unknown';

      if (nextState === 'active') {
        void import('../lib/analytics').then(({ flushAnalyticsQueue, track }) => {
          void flushAnalyticsQueue();
          if (userId) {
            void track('session_started', { user_id: userId, learning_mode: learningMode });
          }
        });
      } else if (previousState === 'active' && (nextState === 'inactive' || nextState === 'background')) {
        if (userId) {
          void import('../lib/analytics').then(({ track }) =>
            track('session_ended', { user_id: userId, learning_mode: learningMode }),
          );
        }
      }
      previousState = nextState;
    };
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    let authUnsubscribe: (() => void) | undefined;
    try {
      const client = getSupabaseClient();
      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        // Token refreshes are routine and must not re-arm the first-paint gate:
        // doing so unmounted the router on every refresh (see hasBootstrapped).
        if (event !== 'TOKEN_REFRESHED' && event !== 'SIGNED_OUT') {
          setIsProfileLoading(true);
        }

        if (session?.user?.id) {
          setSession(session);
          setProgressUserId(session.user.id);
          setRoadmapUserId(session.user.id);
          await syncProfile(session.user.id);
          
          await awardLoginXP();
        } else {
          setSession(null);
          setProgressUserId(null);
          setRoadmapUserId(null);
          setIsProfileLoading(false);
        }
      });
      authUnsubscribe = () => subscription.unsubscribe();
    } catch (err) {
      logSupabaseError('auth', 'select', err);
      setIsProfileLoading(false);
    }

    return () => {
      cancelIdleTask();
      appStateSubscription.remove();
      authUnsubscribe?.();
    };

  }, []);

  useEffect(() => {
    if (!isAppReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    // The setup wizard is part of onboarding, not a post-onboarding route.
    // Without this, router.replace('/setup-wizard') from onboarding is bounced
    // straight back here and the personalization steps are unreachable.
    const inSetupWizard = segments[0] === 'setup-wizard';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (!onboardingComplete) {
      if (!inOnboarding && !inSetupWizard) router.replace('/onboarding');
    } else if (inAuthGroup || inOnboarding || inSetupWizard) {
      // Logic for Unified Command Center
      router.replace('/');
    }
  }, [isAppReady, session, onboardingComplete, learningMode, segments]);

  useEffect(() => {
    if (fontsSettled) {
      SplashScreen.hideAsync();
    }
  }, [fontsSettled]);

  // One-time, non-blocking warning: Polymath RAG needs the embedding model
  // pulled locally. Never blocks usage — just informs once per session.
  useEffect(() => {
    if (embeddingWarningChecked) return;
    embeddingWarningChecked = true;
    const { aiMode, useLocalLLM, ollamaUrl } = useSettingsStore.getState();
    const localOn = aiMode === 'local' || useLocalLLM;
    if (!localOn) return;
    void import('../lib/ollamaModels')
      .then(({ checkOllamaModelAvailability }) => checkOllamaModelAvailability(ollamaUrl))
      .then((status) => {
        if (status.embedding !== 'available') {
          setShowEmbeddingWarning(true);
        }
      });
  }, []);

  if (!isAppReady) {
    return <AppSkeleton />;
  }

  // The redirect effect below moves unauthenticated visitors to /(auth)/login.
  // Do not mount the tab navigator for that one transient frame: it costs a
  // separate home-chunk task on `/` and is never a screen the visitor asked for.
  if (!session && segments[0] !== '(auth)') {
    return <AppSkeleton />;
  }

  return (
    <GlobalErrorBoundary>
      <ToastProvider>
        <StatusBar style={isDarkChrome ? 'light' : 'dark'} />
      {/* Offline mode banner */}
      {isOfflineMode && (
        <View className="absolute top-0 left-0 right-0 z-50 px-5 pt-14">
          <View className="bg-legacy-amber-bright/10 border border-legacy-amber-bright/20 rounded-2xl px-4 py-3 flex-row items-center">
            <Ionicons name="cloud-offline" size={14} color={LEGACY_COLORS.amber} />
            <Text className="text-legacy-amber-bright font-bold font-syne text-[10px] uppercase tracking-widest flex-1 ml-2">
              {t('s315')}
            </Text>
          </View>
        </View>
      )}
      {showEmbeddingWarning && !isOfflineMode && !profileError && (
        <View className="absolute top-0 left-0 right-0 z-50 px-5 pt-14">
          <View className="bg-legacy-amber-bright/10 border border-legacy-amber-bright/20 rounded-2xl px-4 py-3 flex-row items-center justify-between">
            <Text className="text-legacy-amber-bright font-bold font-syne text-[10px] uppercase tracking-widest flex-1 pr-3">
              {t('s204')}
            </Text>
            <TouchableOpacity onPress={() => setShowEmbeddingWarning(false)}>
              <Ionicons name="close" size={16} color={LEGACY_COLORS.amber} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      {session?.user?.id && profileError && (
        <View className="absolute top-0 left-0 right-0 z-50 px-5 pt-14">
          <View className="bg-legacy-red500/10 border border-legacy-red500/20 rounded-2xl px-4 py-3 flex-row items-center justify-between">
            <Text className="text-legacy-red500 font-bold font-syne text-[10px] uppercase tracking-widest flex-1 pr-3">
              {profileError}
            </Text>
            <TouchableOpacity
              onPress={() => syncProfile(session.user.id)}
              className="bg-legacy-red500 px-3 py-2 rounded-xl"
            >
              <Text className="text-white font-bold font-syne text-xs">{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="high-school" options={{ animation: 'fade' }} />
        <Stack.Screen name="university" options={{ animation: 'fade' }} />
        <Stack.Screen name="self-directed" options={{ animation: 'fade' }} />
        <Stack.Screen name="ai-literacy" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="explore" options={{ animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
      </ToastProvider>
    </GlobalErrorBoundary>
  );
}
