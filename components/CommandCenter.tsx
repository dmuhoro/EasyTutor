import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoadmapStore } from '../store/roadmapStore';
import { useProgressStore } from '../store/progressStore';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { COLORS } from '../lib/theme';

export const CommandCenter = () => {
  const router = useRouter();
  const { roadmaps, checkedTasks } = useRoadmapStore();
  const { studyStreak, xpTotal } = useProgressStore();

  const hsMissions = roadmaps.filter(r => r.learningMode === 'high_school');
  const uniMissions = roadmaps.filter(r => r.learningMode === 'university');
  const selfMissions = roadmaps.filter(r => r.learningMode === 'self_directed');

  const calculateProgress = (roadmapId: string) => {
    const roadmap = roadmaps.find(r => r.id === roadmapId);
    if (!roadmap) return 0;
    const total = roadmap.days.reduce((acc, d) => acc + d.tasks.length, 0);
    const done = Object.values(checkedTasks[roadmapId] || {}).reduce((acc, dt) => acc + dt.length, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  return (
    <ScrollView className="flex-1 bg-[#0d0f12]" showsVerticalScrollIndicator={false}>
      {/* Hero: Global Identity */}
      <View className="px-6 pt-12 pb-8">
        <View className="flex-row justify-between items-start mb-8">
          <View>
            <Text className="text-[#8a8fa3] font-dmsans text-sm uppercase tracking-widest mb-1">Elite Learner Identity</Text>
            <Text className="text-white text-3xl font-bold font-syne">Command Center</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/profile')}
            className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 items-center justify-center"
          >
            <Ionicons name="person" size={24} color="#4f7cff" />
          </TouchableOpacity>
        </View>

        {/* Global Stats Grid */}
        <View className="flex-row space-x-4 mb-10">
          <BlurView intensity={20} tint="dark" className="flex-1 p-5 rounded-[28px] border border-white/5 overflow-hidden">
            <Ionicons name="flame" size={24} color="#f59e0b" />
            <Text className="text-white text-2xl font-bold font-syne mt-3">{studyStreak}d</Text>
            <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase">Streak</Text>
          </BlurView>
          <BlurView intensity={20} tint="dark" className="flex-1 p-5 rounded-[28px] border border-white/5 overflow-hidden">
            <Ionicons name="sparkles" size={24} color="#4f7cff" />
            <Text className="text-white text-2xl font-bold font-syne mt-3">{xpTotal}</Text>
            <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase">Total XP</Text>
          </BlurView>
          <BlurView intensity={20} tint="dark" className="flex-1 p-5 rounded-[28px] border border-white/5 overflow-hidden">
            <Ionicons name="map" size={24} color="#22c55e" />
            <Text className="text-white text-2xl font-bold font-syne mt-3">{roadmaps.length}</Text>
            <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase">Missions</Text>
          </BlurView>
        </View>

        {/* Multi-Portal View */}
        <Text className="text-white text-xl font-bold font-syne mb-6">Active Sectors</Text>

        {/* High School Sector */}
        {hsMissions.length > 0 && (
          <TouchableOpacity 
            onPress={() => router.push('/(high_school)')}
            className="bg-[#161920] p-6 rounded-[32px] border border-[#3b82f6]/20 mb-4"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-blue-500/20 items-center justify-center mr-3">
                  <Ionicons name="school" size={20} color="#3b82f6" />
                </View>
                <Text className="text-white font-bold font-syne">High School Portal</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
            </View>
            {hsMissions.slice(0, 1).map(r => (
              <View key={r.id}>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-[#8a8fa3] text-xs">{r.topic}</Text>
                  <Text className="text-white text-xs font-bold">{calculateProgress(r.id)}%</Text>
                </View>
                <View className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <View className="h-full bg-[#3b82f6]" style={{ width: `${calculateProgress(r.id)}%` }} />
                </View>
              </View>
            ))}
          </TouchableOpacity>
        )}

        {/* University Sector */}
        {uniMissions.length > 0 && (
          <TouchableOpacity 
            onPress={() => router.push('/(university)')}
            className="bg-[#161920] p-6 rounded-[32px] border border-[#a855f7]/20 mb-4"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-purple-500/20 items-center justify-center mr-3">
                  <Ionicons name="library" size={20} color="#a855f7" />
                </View>
                <Text className="text-white font-bold font-syne">University Portal</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#a855f7" />
            </View>
            {uniMissions.slice(0, 1).map(r => (
              <View key={r.id}>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-[#8a8fa3] text-xs">{r.topic}</Text>
                  <Text className="text-white text-xs font-bold">{calculateProgress(r.id)}%</Text>
                </View>
                <View className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <View className="h-full bg-[#a855f7]" style={{ width: `${calculateProgress(r.id)}%` }} />
                </View>
              </View>
            ))}
          </TouchableOpacity>
        )}

        {/* Self-Directed Sector */}
        {selfMissions.length > 0 && (
          <TouchableOpacity 
            onPress={() => router.push('/(self_directed)')}
            className="bg-[#161920] p-6 rounded-[32px] border border-[#22c55e]/20 mb-10"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-green-500/20 items-center justify-center mr-3">
                  <Ionicons name="compass" size={20} color="#22c55e" />
                </View>
                <Text className="text-white font-bold font-syne">Knowledge Explorer</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#22c55e" />
            </View>
            {selfMissions.slice(0, 1).map(r => (
              <View key={r.id}>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-[#8a8fa3] text-xs">{r.topic}</Text>
                  <Text className="text-white text-xs font-bold">{calculateProgress(r.id)}%</Text>
                </View>
                <View className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <View className="h-full bg-[#22c55e]" style={{ width: `${calculateProgress(r.id)}%` }} />
                </View>
              </View>
            ))}
          </TouchableOpacity>
        )}

        {/* Modern AI Quick-Launch */}
        <TouchableOpacity 
          onPress={() => router.push('/explore')}
          className="bg-brand-500 p-6 rounded-[32px] flex-row items-center justify-center shadow-xl shadow-brand-500/40"
        >
          <Ionicons name="sparkles" size={20} color="white" className="mr-3" />
          <Text className="text-white font-bold font-syne text-lg ml-2">Ask AI Anything</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
