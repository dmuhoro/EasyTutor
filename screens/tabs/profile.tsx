import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useProgressStore } from '../../store/progressStore';

export default function ProfileTab() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { studyStreak, xpTotal, getLevel } = useProgressStore();

  const displayName = user?.email?.split('@')[0] ?? 'Student';
  const email = user?.email ?? '';
  const level = getLevel(xpTotal);

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View className="mb-8 items-center">
          <View className="w-20 h-20 rounded-full bg-[#4f7cff]/20 flex-row items-center justify-center mb-4 border border-[#4f7cff]/30">
            <Text className="text-white text-3xl font-bold font-syne">
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-white text-2xl font-bold font-syne">{displayName}</Text>
          <Text className="text-[#8a8fa3] text-base font-dmsans mt-1">{email}</Text>
          <Text className="text-[#4f7cff] text-sm font-bold font-dmsans mt-2">
            Level {level}
          </Text>
        </View>

        {/* Stats */}
        <View className="flex-row gap-4 mb-8">
          {[
            { label: 'Study Streak', value: `${studyStreak} days`, icon: <Ionicons name="flame" size={20} color="#f59e0b" /> },
            { label: 'Total XP', value: xpTotal.toString(), icon: <Ionicons name="sparkles" size={20} color="#4f7cff" /> },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 bg-[#161920] p-5 rounded-2xl border border-[#2a2f3d]">
              <View className="w-10 h-10 rounded-lg flex-row items-center justify-center mb-3 bg-[#0d0f12]">
                {stat.icon}
              </View>
              <Text className="text-white text-2xl font-bold font-syne">{stat.value}</Text>
              <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase tracking-wider">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="space-y-3 mb-8">
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
            accessibilityRole="button"
            aria-label="Open settings"
            className="bg-[#161920] p-5 rounded-2xl border border-[#2a2f3d] flex-row items-center justify-between"
          >
            <View className="flex-1">
              <Text className="text-white font-bold font-syne text-lg">Settings</Text>
              <Text className="text-[#8a8fa3] text-sm font-dmsans mt-1">Manage your account and preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#4f7cff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/onboarding')}
            activeOpacity={0.7}
            accessibilityRole="button"
            aria-label="Re-run onboarding"
            className="bg-[#161920] p-5 rounded-2xl border border-[#2a2f3d] flex-row items-center justify-between"
          >
            <View className="flex-1">
              <Text className="text-white font-bold font-syne text-lg">Onboarding</Text>
              <Text className="text-[#8a8fa3] text-sm font-dmsans mt-1">Update your learning preferences</Text>
            </View>
            <Ionicons name="school" size={20} color="#4f7cff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={signOut}
            activeOpacity={0.7}
            accessibilityRole="button"
            aria-label="Sign out"
            className="bg-[#161920] p-5 rounded-2xl border border-[#ef4444]/30 flex-row items-center justify-between"
          >
            <View className="flex-1">
              <Text className="text-ef4444 font-bold font-syne text-lg">Sign Out</Text>
              <Text className="text-[#8a8fa3] text-sm font-dmsans mt-1">Log out of your account</Text>
            </View>
            <Ionicons name="log-out" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
