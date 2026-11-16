import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useProgressStore } from '../../store/progressStore';
import { useAuthStore } from '../../store/authStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { getMasteryDistribution, getXPTrend, getStreak } from '../../lib/dashboard';

export default function ProgressTab() {
  const router = useRouter();
  const {
    studyStreak, xpTotal, topicsStudied, wrongAnswers,
    getLevel,
  } = useProgressStore();
  const { user } = useAuthStore();
  const { roadmaps, getRoadmapProgress } = useRoadmapStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        if (user?.id) {
          await getMasteryDistribution(user.id);
          await getXPTrend(user.id);
          await getStreak(user.id);
        }
      } catch {
        // silent — progress degrades gracefully
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [user?.id]);

  const totalTopics = Object.values(topicsStudied).flat().length;
  const totalWrong = wrongAnswers.length;
  const level = getLevel(xpTotal);
  const recentRoadmaps = roadmaps.slice(0, 5);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0d0f12] items-center justify-center">
        <ActivityIndicator color="#4f7cff" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="mb-8">
        <Text className="text-[#8a8fa3] text-lg font-dmsans uppercase tracking-wider">Your Progress</Text>
        <Text className="text-white text-4xl font-bold font-syne mb-2">{user?.email?.split('@')[0] ?? 'Student'}</Text>
        <Text className="text-[#8a8fa3] text-base font-dmsans">
          Level {level} • {studyStreak} day streak • {totalTopics} concepts mastered
        </Text>
      </View>

      {/* Stat cards */}
      <View className="flex-row flex-wrap gap-4 mb-8">
        {[
          { label: 'Total XP', value: xpTotal.toString(), icon: <Ionicons name="sparkles" size={24} color="#4f7cff" />, color: '#4f7cff' },
          { label: 'Streak', value: `${studyStreak} days`, icon: <Ionicons name="flame" size={24} color="#f59e0b" />, color: '#f59e0b' },
          { label: 'Concepts', value: totalTopics.toString(), icon: <Ionicons name="school" size={24} color="#22c55e" />, color: '#22c55e' },
          { label: 'Roadmaps', value: roadmaps.length.toString(), icon: <Ionicons name="map" size={24} color="#a855f7" />, color: '#a855f7' },
        ].map((stat) => (
          <View key={stat.label} className="flex-1 min-w-[120px] bg-[#161920] p-5 rounded-2xl border border-[#2a2f3d]">
            <View className={`w-10 h-10 rounded-lg flex-row items-center justify-center mb-3 bg-${stat.color}/10`}>
              {stat.icon}
            </View>
            <Text className="text-white text-2xl font-bold font-syne">{stat.value}</Text>
            <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase tracking-wider">{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent roadmaps */}
      <View className="mb-8">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-xl font-bold font-syne">Recent Study Paths</Text>
          <TouchableOpacity onPress={() => router.push('/roadmaps/create')} accessibilityRole="button" aria-label="Create new roadmap">
            <Text className="text-[#4f7cff] font-bold font-dmsans">+ New</Text>
          </TouchableOpacity>
        </View>
        {recentRoadmaps.length === 0 ? (
          <View className="bg-[#161920] p-6 rounded-2xl border border-[#2a2f3d] items-center">
            <Ionicons name="map-outline" size={32} color="#8a8fa3" className="mb-4" />
            <Text className="text-[#8a8fa3] text-center font-dmsans">No study paths yet. Create your first roadmap.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-4">
            {recentRoadmaps.map((roadmap) => (
              <View key={roadmap.id} className="w-64 mr-4 bg-[#161920] p-5 rounded-2xl border border-[#2a2f3d]">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 rounded-lg flex-row items-center justify-center mr-3 bg-[#4f7cff]/10">
                    <Ionicons name="map" size={16} color="#4f7cff" />
                  </View>
                  <Text className="text-white font-bold font-syne text-base" numberOfLines={1}>{roadmap.topic}</Text>
                </View>
                <View className="w-full bg-[#2a2f3d] h-1 rounded-full overflow-hidden mb-3">
                  <View className="bg-[#4f7cff] h-full rounded-full" style={{ width: `${getRoadmapProgress(roadmap.id)}%` }} />
                </View>
                <Text className="text-[#8a8fa3] text-xs font-dmsans">{getRoadmapProgress(roadmap.id)}% complete</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Wrong answers summary */}
      {totalWrong > 0 && (
        <View className="mb-8 bg-[#161920] p-5 rounded-2xl border border-[#2a2f3d]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white font-bold font-syne text-lg">Review Missed Concepts</Text>
            <TouchableOpacity onPress={() => router.push('/quiz')} accessibilityRole="button" aria-label="Review all missed concepts">
              <Text className="text-[#4f7cff] font-bold font-dmsans">Review All ({totalWrong})</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-[#8a8fa3] text-base font-dmsans">
            You have {totalWrong} question{totalWrong !== 1 ? 's' : ''} to review. Revisit them with the AI tutor to turn weak spots into strengths.
          </Text>
        </View>
      )}

      <View className="h-24" />
    </ScrollView>
  );
}
