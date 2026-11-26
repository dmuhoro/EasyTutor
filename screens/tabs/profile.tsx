import { t } from '../../src/locales';
import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useProgressStore } from '../../store/progressStore';
import { COLORS } from '../../src/design/tokens';

export default function ProfileTab() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { studyStreak, xpTotal, getLevel } = useProgressStore();

  const displayName = user?.email?.split('@')[0] ?? 'Student';
  const email = user?.email ?? '';
  const level = getLevel(xpTotal);

  return (
    <SafeAreaView className="flex-1 bg-surface-bg" edges={['top']}>
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View className="mb-8 items-center">
          <View className="w-20 h-20 rounded-full flex-row items-center justify-center mb-4 border" style={{ backgroundColor: COLORS.brand[50], borderColor: COLORS.surface.border }}>
            <Text className="text-3xl font-dmsans-bold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-text-primary text-2xl font-dmsans-bold">{displayName}</Text>
          <Text className="text-text-secondary text-base font-dmsans mt-1">{email}</Text>
          <Text className="text-primary text-sm font-dmsans-bold mt-2">
            {t('level')} {level}
          </Text>
        </View>

        {/* Stats */}
        <View className="flex-row gap-4 mb-8">
          {[
            { label: t('studyStreak'), value: `${studyStreak} days`, icon: <Ionicons name="flame" size={20} color={COLORS.warning.DEFAULT} /> },
            { label: t('totalXP'), value: xpTotal.toString(), icon: <Ionicons name="sparkles" size={20} color={COLORS.primary.DEFAULT} /> },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 bg-surface-card p-5 rounded-2xl border border-surface-border">
              <View className="w-10 h-10 rounded-lg flex-row items-center justify-center mb-3 bg-surface-subtle">
                {stat.icon}
              </View>
              <Text className="text-text-primary text-2xl font-dmsans-bold">{stat.value}</Text>
              <Text className="text-text-secondary text-xs font-dmsans uppercase tracking-wider">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="space-y-3 mb-8">
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
            accessibilityRole="button"
            aria-label={t('s365')}
            className="bg-surface-card p-5 rounded-2xl border border-surface-border flex-row items-center justify-between"
          >
            <View className="flex-1">
              <Text className="text-text-primary font-dmsans-bold text-lg">{t('settings')}</Text>
              <Text className="text-text-secondary text-sm font-dmsans mt-1">{t('s453')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary.DEFAULT} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/onboarding')}
            activeOpacity={0.7}
            accessibilityRole="button"
            aria-label={t('reRunOnboarding')}
            className="bg-surface-card p-5 rounded-2xl border border-surface-border flex-row items-center justify-between"
          >
            <View className="flex-1">
              <Text className="text-text-primary font-dmsans-bold text-lg">{t('onboarding')}</Text>
              <Text className="text-text-secondary text-sm font-dmsans mt-1">{t('updateLearningPreferences')}</Text>
            </View>
            <Ionicons name="school" size={20} color={COLORS.primary.DEFAULT} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={signOut}
            activeOpacity={0.7}
            accessibilityRole="button"
            aria-label={t('s130')}
            className="bg-surface-card p-5 rounded-2xl border border-error flex-row items-center justify-between"
          >
            <View className="flex-1">
              <Text className="text-error font-dmsans-bold text-lg">{t('signOut')}</Text>
              <Text className="text-text-secondary text-sm font-dmsans mt-1">{t('logOut')}</Text>
            </View>
            <Ionicons name="log-out" size={20} color={COLORS.error.DEFAULT} />
          </TouchableOpacity>
        </View>

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
