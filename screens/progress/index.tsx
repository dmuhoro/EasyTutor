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

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface ProgressScreenProps {
  className?: StyleProp<ViewStyle>;
}

/**
 * Progress screen — XP, streak, concepts mastered, roadmaps, weak-spots review.
 * Token-driven colours, honest states.
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

  const displayName = user?.email?.split('@')[0] ?? 'Student';
  const level = getLevel(xpTotal);
  const totalTopics = Object.values(topicsStudied).flat().length;
  const totalWrong = wrongAnswers.length;
  const recentRoadmaps = roadmaps.slice(0, 5);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-bg">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator color={COLORS.brand[400]} size="large" />
          <Text className="text-text-secondary mt-4 font-dmsans text-base">Loading your progress…</Text>
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
          <Text className="text-text-secondary font-dmsans text-lg uppercase tracking-wider">Your Progress</Text>
          <Text className="text-text-primary text-4xl font-bold font-syne mb-2">{displayName}</Text>
          <Text className="text-text-secondary font-dmsans text-base">
            Level {level} • {studyStreak} day streak • {totalTopics} concepts mastered
          </Text>
        </View>

        {/* Stat cards */}
        <View className="flex-row flex-wrap gap-4 mb-8">
          {[
            { label: 'Total XP', value: xpTotal.toString(), icon: 'sparkles', color: COLORS.brand[400], bgClass: 'bg-brand-500/10' },
            { label: 'Streak', value: `${studyStreak} days`, icon: 'flame', color: COLORS.warning.light, bgClass: 'bg-warning/10' },
            { label: 'Concepts', value: totalTopics.toString(), icon: 'school', color: COLORS.success.light, bgClass: 'bg-success/10' },
            { label: 'Roadmaps', value: roadmaps.length.toString(), icon: 'map', color: COLORS.accent.purple, bgClass: 'bg-[#8b5cf6]/10' },
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
            <Text className="text-text-primary font-bold font-syne text-lg">Recent Study Paths</Text>
            <TouchableOpacity onPress={() => router.push('/roadmaps/create')}>
              <Text className="text-brand-400 font-dmsans font-bold text-sm">+ New</Text>
            </TouchableOpacity>
          </View>
          {recentRoadmaps.length === 0 ? (
            <View className="bg-surface-card p-6 rounded-2xl border border-surface-border items-center">
              <Ionicons name="map-outline" size={32} color={COLORS.text.secondary} className="mb-4" />
              <Text className="text-text-secondary font-dmsans text-center">No study paths yet. Create your first roadmap.</Text>
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
                  <Text className="text-text-secondary font-dmsans text-xs">{getRoadmapProgress(roadmap.id)}% complete</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Wrong answers summary */}
        {totalWrong > 0 && (
          <View className="mb-8 bg-surface-card p-5 rounded-xl border border-surface-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-text-primary font-bold font-syne text-lg">Review Missed Concepts</Text>
              <TouchableOpacity onPress={() => router.push('/quiz')}>
                <Text className="text-brand-400 font-bold font-dmsans text-sm">Review All ({totalWrong})</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-text-secondary font-dmsans text-base">
              You have {totalWrong} question{totalWrong !== 1 ? 's' : ''} to review. Revisit them with the AI tutor to turn weak spots into strengths.
            </Text>
          </View>
        )}

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
