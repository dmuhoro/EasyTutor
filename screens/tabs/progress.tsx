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
import { useCanonicalLearnerState } from '../../hooks/useCanonicalLearnerState';
import { t } from '../../src/locales';
import { COLORS } from '../../src/design/tokens';

export default function ProgressTab() {
  const router = useRouter();
  const {
    studyStreak, xpTotal, topicsStudied, wrongAnswers,
    getLevel,
  } = useProgressStore();
  const { user } = useAuthStore();
  const { roadmaps, getRoadmapProgress } = useRoadmapStore();
  const canonical = useCanonicalLearnerState();

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
      <SafeAreaView className="flex-1 bg-surface-bg items-center justify-center">
        <ActivityIndicator color={COLORS.primary.DEFAULT} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="mb-8">
        <Text className="text-text-secondary text-lg font-dmsans uppercase tracking-wider">{t('yourProgress')}</Text>
        <Text className="text-text-primary text-4xl font-dmsans-bold mb-2">{user?.email?.split('@')[0] ?? 'Student'}</Text>
        <Text className="text-text-secondary text-base font-dmsans">
          {t('level')} {level} • {studyStreak} {t('cq')} {totalTopics} {t('conceptsMastered')}
        </Text>
        <Text
          accessibilityLabel={`canonical-mastery-${Math.round(canonical.masteryConfidence * 100)}`}
          className="mt-1 text-xs font-mono text-text-secondary"
        >
          {t('mastery')}: {Math.round(canonical.masteryConfidence * 100)}%
        </Text>
      </View>

      {/* Stat cards */}
      <View className="flex-row flex-wrap gap-4 mb-8">
        {[
          { label: t('totalXP'), value: xpTotal.toString(), icon: <Ionicons name="sparkles" size={24} color={COLORS.primary.DEFAULT} />, tint: COLORS.brand[50] },
          { label: t('streak'), value: `${studyStreak} days`, icon: <Ionicons name="flame" size={24} color={COLORS.warning.DEFAULT} />, tint: COLORS.warning.container },
          { label: t('ah'), value: totalTopics.toString(), icon: <Ionicons name="school" size={24} color={COLORS.success.DEFAULT} />, tint: COLORS.brand[50] },
          { label: t('roadmaps'), value: roadmaps.length.toString(), icon: <Ionicons name="map" size={24} color={COLORS.text.secondary} />, tint: COLORS.surface.subtle },
        ].map((stat) => (
          <View key={stat.label} className="flex-1 min-w-[120px] bg-surface-card p-5 rounded-2xl border border-surface-border">
            <View className="w-10 h-10 rounded-lg flex-row items-center justify-center mb-3" style={{ backgroundColor: stat.tint }}>
              {stat.icon}
            </View>
            <Text className="text-text-primary text-2xl font-dmsans-bold">{stat.value}</Text>
            <Text className="text-text-secondary text-xs font-dmsans uppercase tracking-wider">{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent roadmaps */}
      <View className="mb-8">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-text-primary text-xl font-dmsans-bold">{t('recentStudyPaths')}</Text>
          <TouchableOpacity onPress={() => router.push('/roadmaps/create')} accessibilityRole="button" aria-label={t('lr')}>
            <Text className="text-primary font-dmsans-bold">{t('ky')}</Text>
          </TouchableOpacity>
        </View>
        {recentRoadmaps.length === 0 ? (
          <View className="bg-surface-card p-6 rounded-2xl border border-surface-border items-center">
            <Ionicons name="map-outline" size={32} color={COLORS.text.secondary} className="mb-4" />
            <Text className="text-text-secondary text-center font-dmsans">{t('noStudyPathsYet')}</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-4">
            {recentRoadmaps.map((roadmap) => (
              <View key={roadmap.id} className="w-64 mr-4 bg-surface-card p-5 rounded-2xl border border-surface-border">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 rounded-lg flex-row items-center justify-center mr-3 bg-surface-subtle">
                    <Ionicons name="map" size={16} color={COLORS.primary.DEFAULT} />
                  </View>
                  <Text className="text-text-primary font-dmsans-bold text-base" numberOfLines={1}>{roadmap.topic}</Text>
                </View>
                <View className="w-full bg-surface-border h-1 rounded-full overflow-hidden mb-3">
                  <View className="bg-primary h-full rounded-full" style={{ width: `${getRoadmapProgress(roadmap.id)}%` }} />
                </View>
                <Text className="text-text-secondary text-xs font-dmsans">{getRoadmapProgress(roadmap.id)}{t('qq')}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Wrong answers summary */}
      {totalWrong > 0 && (
        <View className="mb-8 bg-surface-card p-5 rounded-2xl border border-surface-border">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-text-primary font-dmsans-bold text-lg">{t('reviewMissedConcepts')}</Text>
            <TouchableOpacity onPress={() => router.push('/quiz')} accessibilityRole="button" aria-label={t('mt')}>
              <Text className="text-primary font-dmsans-bold">{t('nh')}{totalWrong})</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-text-secondary text-base font-dmsans">
            {t('kx')} {totalWrong} {t('bj')}{totalWrong !== 1 ? 's' : ''} {t('do')}
          </Text>
        </View>
      )}

      <View className="h-24" />
    </ScrollView>
  );
}
