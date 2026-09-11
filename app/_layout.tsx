import { useEffect, useState } from 'react';
import { AppState, AppStateStatus, View, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Syne_700Bold } from '@expo-google-fonts/syne';
import { DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Ionicons } from '@expo/vector-icons';
import { isSupabaseAvailable } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useProgressStore } from '../store/progressStore';
import { LearningMode, useRoadmapStore } from '../store/roadmapStore';
import { track, flushAnalyticsQueue } from '../lib/analytics';
import { GlobalErrorBoundary } from '../components/GlobalErrorBoundary';
import { initializeKnowledge, syncToRemote } from '../data/knowledgeStore';
import { retryFailedSyncs } from '../services/syncEngine';
import { logEvent, setLogContext } from '../lib/logEvent';
import { normalizeProfile } from '../lib/normalize';
import { getAuthenticatedUser, getSupabaseClient, logSupabaseError } from '../lib/supabaseOps';
import '../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Syne_700Bold,
    DMSans_400Regular,
    DMSans_700Bold,
  });

  const { session, setSession, isLoading: authLoading } = useAuthStore();
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(!isSupabaseAvailable());
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

  const isAppReady = fontsLoaded && !authLoading && !isProfileLoading;
  const isKnownLearningMode = (mode: string): mode is LearningMode =>
    mode === 'high_school' || mode === 'university' || mode === 'self_directed';

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
      const client = getSupabaseClient();
      const authUser = await getAuthenticatedUser();
      console.log('[PROFILE] Sync start:', userId);
      setLogContext({ userId: authUser.id });

      const profile = await retry(async () => {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (error) {
          logSupabaseError('profiles', 'select', error);
          console.error('[PROFILE FETCH ERROR]', error);
          throw error;
        }

        if (!data) {
          console.warn('[PROFILE] Missing. Creating...');
          const { error: insertError } = await client
            .from('profiles')
            .insert({
              id: authUser.id,
              email: authUser.email ?? '',
              learning_mode: null,
              onboarding_complete: false,
            });

          if (insertError) {
            logSupabaseError('profiles', 'insert', insertError);
            console.error('[PROFILE CREATE ERROR]', insertError);
            throw insertError;
          }

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
    // Initialize knowledge base (always works offline)
    initializeKnowledge();
    void logEvent('INFO', 'app_start', { offlineMode: !isSupabaseAvailable() });

    void (async () => {
      try {
        await retryFailedSyncs();
        await syncToRemote();
      } catch (err) {
        await logEvent('WARN', 'startup_sync_failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    // Flush offline analytics queue on foreground — fire-and-forget
    let previousState: AppStateStatus = AppState.currentState;
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const userId = useAuthStore.getState().session?.user?.id;
      const learningMode = useRoadmapStore.getState().learningMode ?? 'unknown';

      if (nextState === 'active') {
        void flushAnalyticsQueue();
        if (userId) {
          void track('session_started', { user_id: userId, learning_mode: learningMode });
        }
      } else if (previousState === 'active' && (nextState === 'inactive' || nextState === 'background')) {
        if (userId) {
          void track('session_ended', { user_id: userId, learning_mode: learningMode });
        }
      }
      previousState = nextState;
    };
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    let authUnsubscribe: (() => void) | undefined;
    try {
      const client = getSupabaseClient();
      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        console.log('[AUTH]', event);
        setIsProfileLoading(true);
        
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
      appStateSubscription.remove();
      authUnsubscribe?.();
    };

  }, []);

  useEffect(() => {
    if (!isAppReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (!onboardingComplete) {
      if (!inOnboarding) router.replace('/onboarding');
    } else {
      // Logic for Unified Command Center
      if (inAuthGroup || inOnboarding) {
        router.replace('/');
      }
    }
  }, [isAppReady, session, onboardingComplete, learningMode, segments]);

  useEffect(() => {
    if (isAppReady || fontError) {
      SplashScreen.hideAsync();
    }
  }, [isAppReady, fontError]);

  if (!isAppReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0f12', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#4f7cff', fontSize: 24, fontWeight: 'bold' }}>EasyTutor</Text>
      </View>
    );
  }

  return (
    <GlobalErrorBoundary>
      <StatusBar style="light" />
      {/* Offline mode banner */}
      {isOfflineMode && (
        <View className="absolute top-0 left-0 right-0 z-50 px-5 pt-14">
          <View className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-2xl px-4 py-3 flex-row items-center">
            <Ionicons name="cloud-offline" size={14} color="#f59e0b" />
            <Text className="text-[#f59e0b] font-bold font-syne text-[10px] uppercase tracking-widest flex-1 ml-2">
              Offline Mode - Data saved locally
            </Text>
          </View>
        </View>
      )}
      {session?.user?.id && profileError && (
        <View className="absolute top-0 left-0 right-0 z-50 px-5 pt-14">
          <View className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-2xl px-4 py-3 flex-row items-center justify-between">
            <Text className="text-[#ef4444] font-bold font-syne text-[10px] uppercase tracking-widest flex-1 pr-3">
              {profileError}
            </Text>
            <TouchableOpacity
              onPress={() => syncProfile(session.user.id)}
              className="bg-[#ef4444] px-3 py-2 rounded-xl"
            >
              <Text className="text-white font-bold font-syne text-xs">Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(high_school)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(university)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(self_directed)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(ai_literacy)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="explore" options={{ animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </GlobalErrorBoundary>
  );
}
