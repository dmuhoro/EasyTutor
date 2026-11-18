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
      color: '#4f7cff'
    },
    {
      id: 'university',
      title: 'University / College',
      subtitle: 'Degree-level subjects, local universities',
      icon: 'library-outline',
      color: '#a855f7'
    },
    {
      id: 'self_directed',
      title: 'Self-Directed Learner',
      subtitle: 'Learn anything, your way, no curriculum',
      icon: 'compass-outline',
      color: '#22c55e'
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
      colors={['#0d0f12', '#161920', '#0d0f12']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1 px-6 py-10">
        <View className="mb-12">
          <Text className="text-[#4f7cff] font-bold font-syne text-sm uppercase tracking-widest mb-2">Welcome to EasyTutor</Text>
          <Text className="text-white text-4xl font-bold font-syne mb-4">Choose your learning path</Text>
          <Text className="text-[#8a8fa3] text-lg font-dmsans">
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
                className={`mb-6 p-6 rounded-[32px] border-2 flex-row items-center ${isSelected ? 'bg-[#161920] border-[#4f7cff] shadow-xl shadow-[#4f7cff]/20' : 'bg-[#161920]/50 border-[#2a2f3d]'}`}
              >
                <View 
                  className={`w-14 h-14 rounded-2xl items-center justify-center mr-5 ${isSelected ? 'bg-[#4f7cff]' : 'bg-[#2a2f3d]'}`}
                >
                  <Ionicons name={mode.icon} size={28} color={isSelected ? 'white' : '#8a8fa3'} />
                </View>
                <View className="flex-1">
                  <Text className={`text-xl font-bold font-syne mb-1 ${isSelected ? 'text-white' : 'text-[#8a8fa3]'}`}>{mode.title}</Text>
                  <Text className="text-[#5a5f73] text-sm font-dmsans">{mode.subtitle}</Text>
                </View>
                {isSelected && (
                  <View className="bg-[#4f7cff] rounded-full p-1">
                    <Ionicons name="checkmark" size={16} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {isOffline && (
          <View className="my-4 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 flex-row items-center gap-3">
            <Ionicons name="wifi-outline" size={18} color="#f59e0b" />
            <Text className="text-amber-400 text-xs font-dmsans font-bold">
              Offline — onboarding will sync when you reconnect
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleGetStarted}
          disabled={!selectedMode || loading}
          className={`py-5 rounded-2xl flex-row items-center justify-center ${selectedMode && !loading ? 'bg-[#4f7cff] shadow-lg shadow-[#4f7cff]/40' : 'bg-[#161920] opacity-50'}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold font-syne text-lg uppercase tracking-widest">Get Started</Text>
          )}
        </TouchableOpacity>

        {/* Decorative Glow */}
        <View className="absolute -top-40 -right-40 w-80 h-80 bg-[#4f7cff]/5 rounded-full blur-[100px]" />
      </SafeAreaView>

      {showSuccess && (
        <View className="absolute inset-0 bg-[#0d0f12] items-center justify-center z-50 px-8">
          <LinearGradient
             colors={['#4f7cff', '#a855f7']}
             className="w-24 h-24 rounded-[32px] items-center justify-center mb-8 shadow-2xl shadow-[#4f7cff]/40"
          >
             <Ionicons name="sparkles" size={48} color="white" />
          </LinearGradient>
          <Text className="text-white text-4xl font-bold font-syne text-center mb-4">You're all set!</Text>
          <Text className="text-[#8a8fa3] text-xl font-dmsans text-center leading-8">
            Welcome to your learning journey. Let's build your first AI roadmap.
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}
