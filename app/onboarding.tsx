import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoadmapStore, LearningMode } from "../store/roadmapStore";
import { useAuthStore } from "../store/authStore";
import * as Haptics from '../lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { track } from '../lib/analytics';
import { getAuthenticatedUser, getSupabaseClient, logSupabaseError } from '../lib/supabaseOps';

export default function Onboarding() {
  const router = useRouter();
  const { user } = useAuthStore();
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

    try {
      const client = getSupabaseClient();
      const authUser = await getAuthenticatedUser();
      const { error } = await client
        .from('profiles')
        .upsert({
          id: authUser.id,
          email: authUser.email,
          learning_mode: selectedMode,
          onboarding_complete: true
        });

      if (error) {
        logSupabaseError('profiles', 'upsert', error);
        throw error;
      }

      // 2. Update Zustand store (always works)
      setLearningMode(selectedMode);
      setOnboardingComplete(true);
      
      track('portal_selected', {
        user_id: user.id,
        learning_mode: selectedMode,
        selected_mode: selectedMode,
        source: 'onboarding',
      });

      // 3. Show Success Moment
      setShowSuccess(true);
      
      // 4. Delayed Navigation
      setTimeout(() => {
        if (selectedMode === 'high_school') router.replace('/(high_school)');
        else if (selectedMode === 'university') router.replace('/(university)');
        else if (selectedMode === 'self_directed') router.replace('/(self_directed)');
      }, 2500);
      
    } catch (err: any) {
      console.error('[ERROR] [PROFILE] onboarding submission failed', err);
      setShowSuccess(false);
    } finally {
      setLoading(false);
    }
  };

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
