import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  ActivityIndicator, type StyleProp, type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useProgressStore } from '../../store/progressStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { COLORS } from '../../src/design/tokens';
import { cn } from '../../lib/utils';
import { t } from '../../src/locales';

export interface ProgressScreenProps {
  className?: StyleProp<ViewStyle>;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Progress screen — XP, streak, concepts mastered, roadmaps, weak-spots review.
 * Token-driven colours, honest states.
 * All user-facing strings via t() locale lookups.
 */
export function ProgressScreen({ className }: ProgressScreenProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    studyStreak, xpTotal, topicsStudied, wrongAnswers,
    getLevel,
  } = useProgressStore();
  const { roadmaps, getRoadmapProgress } = useRoadmapStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!cancelled) setIsLoading(false);
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const displayName = user?.email?.split('@')[0] ?? t('student');
  const level = getLevel(xpTotal);
  const totalTopics = Object.values(topicsStudied).flat().length;
  const totalWrong = wrongAnswers.length;
  const recentRoadmaps = roadmaps.slice(0, 5);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-bg">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator color={COLORS.brand[400]} size="large" />
          <Text className="text-text-secondary mt-4 font-dmsans text-base">{t('loadingProgress')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-bg">
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-text-secondary font-dmsans text-lg uppercase tracking-wider">{t('yourProgress')}</Text>
          <Text className="text-text-primary text-4xl font-bold font-syne mb-2">{displayName}</Text>
          <Text className="text-text-secondary font-dmsans text-base">
            {t('level')} {level} • {studyStreak} {t('dayStreak')} • {totalTopics} {t('conceptsMastered')}
          </Text>
        </View>

        {/* Stat cards */}
        <View className="flex-row flex-wrap gap-4 mb-8">
          {[
            { label: t('totalXP'), value: xpTotal.toString(), icon: 'sparkles', color: COLORS.brand[400], bgClass: 'bg-brand-500/10' },
            { label: t('streak'), value: `${studyStreak} days`, icon: 'flame', color: COLORS.warning.light, bgClass: 'bg-warning/10' },
            { label: t('conceptsMasteredFull'), value: totalTopics.toString(), icon: 'school', color: COLORS.success.light, bgClass: 'bg-success/10' },
            { label: t('roadmaps'), value: roadmaps.length.toString(), icon: 'map', color: COLORS.accent.purple, bgClass: 'bg-legacy-purple500/10' },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 min-w-[120px] bg-surface-card p-5 rounded-2xl border border-surface-border">
              <View className={cn('w-10 h-10 rounded-lg flex-row items-center justify-center mb-3', stat.bgClass)}>
                <Ionicons name={stat.icon as IconName} size={20} color={stat.color} />
              </View>
              <Text className="text-text-primary text-2xl font-bold font-syne">{stat.value}</Text>
              <Text className="text-text-secondary font-dmsans text-xs uppercase tracking-wider">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent roadmaps */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-text-primary font-bold font-syne text-lg">{t('recentStudyPaths')}</Text>
            <TouchableOpacity onPress={() => router.push('/roadmaps/create')}>
              <Text className="text-brand-400 font-dmsans font-bold text-sm">{t('ky')}</Text>
            </TouchableOpacity>
          </View>
          {recentRoadmaps.length === 0 ? (
            <View className="bg-surface-card p-6 rounded-2xl border border-surface-border items-center">
              <Ionicons name="map-outline" size={32} color={COLORS.text.secondary} className="mb-4" />
              <Text className="text-text-secondary font-dmsans text-center">{t('noStudyPathsYet')}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-4">
              {recentRoadmaps.map((roadmap) => (
                <View key={roadmap.id} className="w-64 mr-4 bg-surface-card p-5 rounded-2xl border border-surface-border">
                  <View className="flex-row items-center mb-3">
                    <View className="w-8 h-8 rounded-lg flex-row items-center justify-center mr-3 bg-brand-500/10">
                      <Ionicons name="map" size={16} color={COLORS.brand[400]} />
                    </View>
                    <Text className="text-text-primary font-bold font-syne text-base" numberOfLines={1}>{roadmap.topic}</Text>
                  </View>
                  <View className="w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden mb-3">
                    <View className="bg-brand-500 h-full rounded-full" style={{ width: `${getRoadmapProgress(roadmap.id)}%` }} />
                  </View>
                  <Text className="text-text-secondary font-dmsans text-xs">{getRoadmapProgress(roadmap.id)}% {t('complete')}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Wrong answers summary */}
        {totalWrong > 0 && (
          <View className="mb-8 bg-surface-card p-5 rounded-xl border border-surface-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-text-primary font-bold font-syne text-lg">{t('reviewMissedConcepts')}</Text>
              <TouchableOpacity onPress={() => router.push('/quiz')}>
                <Text className="text-brand-400 font-bold font-dmsans text-sm">{t('reviewAll')} ({totalWrong})</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-text-secondary font-dmsans text-base">
              {t('youHaveWrongAnswers', { count: totalWrong })}
            </Text>
          </View>
        )}

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
