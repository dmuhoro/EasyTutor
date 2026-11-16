import React, { Suspense } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteFallback } from '../components/RouteFallback';

const CommandCenter = React.lazy(() => import('../components/CommandCenter').then((mod) => ({ default: mod.CommandCenter })));

export default function IndexScreen() {
  const { session, isLoading: authLoading } = useAuthStore();
  const { onboardingComplete, learningMode } = useRoadmapStore();

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0f12', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4f7cff" />
      </View>
    );
  }

  // 1. If no session → redirect to (auth)/login (Section 4)
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // 2. If session AND onboarding_complete = FALSE → redirect to /onboarding
  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  // 3. If session AND onboarding_complete = TRUE → Show CommandCenter (lazy)
  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <Suspense fallback={<RouteFallback />}>
        <CommandCenter />
      </Suspense>
    </SafeAreaView>
  );
}
