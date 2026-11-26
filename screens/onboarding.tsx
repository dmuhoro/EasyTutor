import { LEGACY_COLORS } from '../src/design/legacyPalette';
import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoadmapStore, LearningMode } from "../store/roadmapStore";
import { useAuthStore } from "../store/authStore";
import * as Haptics from '../lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';

export default function Onboarding() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isOffline, syncPendingAuth } = useAuthStore();
  const { setLearningMode, setOnboardingComplete } = useRoadmapStore();

  const [selectedMode, setSelectedMode] = useState<LearningMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const MODES: { id: LearningMode; title: string; subtitle: string; icon: any; color: string }[] = [
    {
      id: 'high_school',
      title: 'High School Student',
      subtitle: 'KCSE & CBC curriculum, Kenya syllabus',
      icon: 'school-outline',
      color: LEGACY_COLORS.blueRibbon
    },
    {
      id: 'university',
      title: 'University / College',
      subtitle: 'Degree-level subjects, local universities',
      icon: 'library-outline',
      color: LEGACY_COLORS.purple500Bright
    },
    {
      id: 'self_directed',
      title: 'Self-Directed Learner',
      subtitle: 'Learn anything, your way, no curriculum',
      icon: 'compass-outline',
      color: LEGACY_COLORS.green500
    },
  ];

  const handleSelect = (mode: LearningMode) => {
    Haptics.impactAsync('light');
    setSelectedMode(mode);
  };

  const handleGetStarted = async () => {
    if (!selectedMode || !user) return;

    setLoading(true);
    Haptics.notificationAsync('success');

    // Route to the setup wizard to complete personalization (country, level,
    // track, goal, schedule, preferences). The wizard persists the profile and
    // marks onboarding complete; onboarding itself just hands off the chosen
    // learning mode. Keep the mode stored locally so it survives the handoff.
    setLearningMode(selectedMode);
    router.replace({
      pathname: '/setup-wizard',
      params: { level: selectedMode },
    });
    setLoading(false);
  };

  // Sync any queued onboarding/profile write when the connection returns.
  React.useEffect(() => {
    if (!isOffline) {
      void syncPendingAuth();
    }
  }, [isOffline, syncPendingAuth]);

  return (
    <LinearGradient
      colors={[LEGACY_COLORS.nightCanvas, LEGACY_COLORS.nightSurface, LEGACY_COLORS.nightCanvas]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1 px-6 py-10">
        <View className="mb-12">
          <Text className="text-legacy-blue-ribbon font-bold font-syne text-sm uppercase tracking-widest mb-2">Welcome to EasyTutor</Text>
          <Text className="text-white text-4xl font-bold font-syne mb-4">Choose your learning path</Text>
          <Text className="text-legacy-night-text-muted text-lg font-dmsans">
            Select how you want to learn today. You can always change this later in settings.
          </Text>
        </View>

        <View className="flex-1">
          {MODES.map((mode) => {
            const isSelected = selectedMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                onPress={() => handleSelect(mode.id)}
                activeOpacity={0.8}
                className={`mb-6 p-6 rounded-[32px] border-2 flex-row items-center ${isSelected ? 'bg-legacy-night-surface border-legacy-blue-ribbon shadow-xl shadow-legacy-blue-ribbon/20' : 'bg-legacy-night-surface/50 border-legacy-night-border'}`}
              >
                <View
                  className={`w-14 h-14 rounded-2xl items-center justify-center mr-5 ${isSelected ? 'bg-legacy-blue-ribbon' : 'bg-legacy-night-border'}`}
                >
                  <Ionicons name={mode.icon} size={28} color={isSelected ? 'white' : LEGACY_COLORS.nightTextMuted} />
                </View>
                <View className="flex-1">
                  <Text className={`text-xl font-bold font-syne mb-1 ${isSelected ? 'text-white' : 'text-legacy-night-text-muted'}`}>{mode.title}</Text>
                  <Text className="text-legacy-night-text-secondary text-sm font-dmsans">{mode.subtitle}</Text>
                </View>
                {isSelected && (
                  <View className="bg-legacy-blue-ribbon rounded-full p-1">
                    <Ionicons name="checkmark" size={16} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {isOffline && (
          <View className="my-4 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 flex-row items-center gap-3">
            <Ionicons name="wifi-outline" size={18} color={LEGACY_COLORS.amberBright} />
            <Text className="text-amber-400 text-xs font-dmsans font-bold">
              Offline — onboarding will sync when you reconnect
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleGetStarted}
          disabled={!selectedMode || loading}
          className={`py-5 rounded-2xl flex-row items-center justify-center ${selectedMode && !loading ? 'bg-legacy-blue-ribbon shadow-lg shadow-legacy-blue-ribbon/40' : 'bg-legacy-night-surface opacity-50'}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold font-syne text-lg uppercase tracking-widest">Get Started</Text>
          )}
        </TouchableOpacity>

        {/* Decorative Glow */}
        <View className="absolute -top-40 -right-40 w-80 h-80 bg-legacy-blue-ribbon/5 rounded-full blur-[100px]" />
      </SafeAreaView>

      {showSuccess && (
        <View className="absolute inset-0 bg-legacy-night-canvas items-center justify-center z-50 px-8">
          <LinearGradient
             colors={[LEGACY_COLORS.blueRibbon, LEGACY_COLORS.purple500Bright]}
             className="w-24 h-24 rounded-[32px] items-center justify-center mb-8 shadow-2xl shadow-legacy-blue-ribbon/40"
          >
             <Ionicons name="sparkles" size={48} color="white" />
          </LinearGradient>
          <Text className="text-white text-4xl font-bold font-syne text-center mb-4">You're all set!</Text>
          <Text className="text-legacy-night-text-muted text-xl font-dmsans text-center leading-8">
            Welcome to your learning journey. Let's build your first AI roadmap.
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}
