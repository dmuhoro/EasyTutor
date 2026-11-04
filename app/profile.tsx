import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useProgressStore } from '../store/progressStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { BlurView } from 'expo-blur';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { studyStreak, xpTotal, getLevel } = useProgressStore();
  const { roadmaps } = useRoadmapStore();

  const level = getLevel(xpTotal);

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 py-6 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold font-syne text-lg">My Identity</Text>
          <TouchableOpacity onPress={() => router.push('/settings')} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
            <Ionicons name="settings-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View className="items-center mt-4 mb-10 px-6">
          <View className="w-32 h-32 rounded-full border-4 border-brand-500 p-1 mb-6">
            <View className="w-full h-full rounded-full bg-[#161920] items-center justify-center overflow-hidden">
               {/* Placeholder for avatar or generated image */}
               <Ionicons name="person" size={60} color="#3a3f53" />
            </View>
            <View className="absolute bottom-0 right-0 w-10 h-10 bg-brand-500 rounded-full items-center justify-center border-4 border-[#0d0f12]">
              <Ionicons name="ribbon" size={18} color="white" />
            </View>
          </View>
          <Text className="text-white text-3xl font-bold font-syne mb-1">{user?.email?.split('@')[0] || 'Elite Learner'}</Text>
          <Text className="text-brand-500 font-bold font-syne uppercase tracking-widest text-xs">{level} Status</Text>
        </View>

        {/* Level Progress */}
        <View className="px-6 mb-10">
          <BlurView intensity={20} tint="dark" className="p-6 rounded-[32px] border border-white/5 overflow-hidden">
            <View className="flex-row justify-between items-end mb-4">
               <View>
                 <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase mb-1">Current Progress</Text>
                 <Text className="text-white text-xl font-bold font-syne">{xpTotal} XP Total</Text>
               </View>
               <Text className="text-[#8a8fa3] text-xs font-dmsans">{1000 - (xpTotal % 1000)} XP to Next Tier</Text>
            </View>
            <View className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
              <View className="h-full bg-brand-500" style={{ width: `${(xpTotal % 1000) / 10}%` }} />
            </View>
          </BlurView>
        </View>

        {/* Accomplishments Grid */}
        <View className="px-6">
          <Text className="text-white text-xl font-bold font-syne mb-6">Mastery Stats</Text>
          <View className="flex-row flex-wrap justify-between">
            <View className="w-[48%] bg-[#161920] p-6 rounded-[28px] border border-white/5 mb-4">
              <Ionicons name="calendar" size={24} color="#f59e0b" />
              <Text className="text-white text-2xl font-bold font-syne mt-3">{studyStreak}</Text>
              <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase">Day Streak</Text>
            </View>
            <View className="w-[48%] bg-[#161920] p-6 rounded-[28px] border border-white/5 mb-4">
              <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
              <Text className="text-white text-2xl font-bold font-syne mt-3">24</Text>
              <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase">Units Done</Text>
            </View>
            <View className="w-[48%] bg-[#161920] p-6 rounded-[28px] border border-white/5 mb-4">
              <Ionicons name="trophy" size={24} color="#eab308" />
              <Text className="text-white text-2xl font-bold font-syne mt-3">Gold</Text>
              <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase">Active League</Text>
            </View>
            <View className="w-[48%] bg-[#161920] p-6 rounded-[28px] border border-white/5 mb-4">
              <Ionicons name="time" size={24} color="#4f7cff" />
              <Text className="text-white text-2xl font-bold font-syne mt-3">12h</Text>
              <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase">Focus Time</Text>
            </View>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
