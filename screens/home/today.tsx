import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  type StyleProp, type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAuthStore } from '../../store/authStore';
import { useProgressStore } from '../../store/progressStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { SUBJECTS } from '../../lib/subjects';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Card, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { t } from '../../src/locales';
import { COLORS } from '../../src/design/tokens';
import { cn } from '../../lib/utils';

export interface HomeScreenProps {
  className?: StyleProp<ViewStyle>;
}

/**
 * Home "Today" screen — one clear next action per screen.
 * Phone-first, thumb-reachable, token-driven colours.
 * Honest states: loading, empty, error, offline.
 * All user-facing strings via t() locale lookups.
 */
export function HomeScreen({ className }: HomeScreenProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    studyStreak, xpTotal, topicsStudied, wrongAnswers,
    getLevel, lastOpenedDate,
  } = useProgressStore();
  const { roadmaps, getRoadmapProgress } = useRoadmapStore();
  const { isConnected } = useNetInfo();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        if (!cancelled) setIsLoading(false);
      } catch (err) {
        if (!cancelled) setLoadError(err as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const displayName = user?.email?.split('@')[0] ?? t('student');
  const totalTopicsStudied = Object.values(topicsStudied).flat().length;
  const level = getLevel(xpTotal);
  const incompleteRoadmaps = roadmaps.filter(r => getRoadmapProgress(r.id) < 100);
  const nextRoadmap = incompleteRoadmaps[0];
  const hasRoadmaps = roadmaps.length > 0;

  const weakSpots = Object.values(
    wrongAnswers.reduce(
      (acc: Record<string, { topic: string; count: number }>, w) => {
        if (!acc[w.topic]) acc[w.topic] = { topic: w.topic, count: 0 };
        acc[w.topic].count += 1;
        return acc;
      },
      {}
    )
  ).sort((a: any, b: any) => b.count - a.count).slice(0, 3);

  const greeting = () => {
    if (!lastOpenedDate) return t('welcomeBack');
    const diffDays = Math.floor(
      (Date.now() - new Date(lastOpenedDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return t('welcomeBack');
    if (diffDays === 1) return t('greatToSeeYouAgain');
    return t('welcomeBack');
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-bg">
        <View className="flex-1 items-center justify-center px-6">
          <Skeleton width={120} height={120} rounded="full" />
          <View className="mt-4 flex-col items-center gap-1">
            <Skeleton width="40%" height={16} rounded="md" />
            <Skeleton width="60%" height={16} rounded="md" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView className="flex-1 bg-surface-bg">
        <EmptyState
          icon="alert-circle"
          title={t('somethingWentWrong')}
          message={loadError.message}
          actionLabel={t('tryAgain')}
          onAction={() => { setIsLoading(true); setLoadError(null); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-bg">
      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="mb-8 mt-2 flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="text-text-secondary font-dmsans text-lg uppercase tracking-wider">{greeting()}</Text>
            <Text className="text-text-primary text-4xl font-bold font-syne tracking-tight capitalize">
              {displayName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            className="bg-surface-card p-3 rounded-2xl border border-surface-border"
          >
            <Ionicons name="person" size={22} color={COLORS.brand[400]} />
          </TouchableOpacity>
        </View>

        {/* Offline indicator */}
        {!isConnected && (
          <View className="mb-6 bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 flex-row items-center gap-3">
            <Ionicons name="cloud-offline" size={18} color={COLORS.warning.light} />
            <Text className="text-warning-light font-dmsans text-sm font-medium">
              {t('offline')}
            </Text>
          </View>
        )}

        {/* One clear next action */}
        <View className="mb-8">
          {nextRoadmap ? (
            <TouchableOpacity
              onPress={() => router.push(`/roadmaps/${nextRoadmap.id}`)}
              className="bg-brand-500 rounded-3xl p-6 shadow-2xl shadow-brand-500/30 overflow-hidden"
              activeOpacity={0.9}
            >
              <View className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8" />
              <View className="flex-row items-center mb-3">
                <Badge variant="brand" size="sm">Day {getRoadmapProgress(nextRoadmap.id)}%</Badge>
                <Text className="text-text-secondary/80 font-dmsans text-xs ml-2">
                  {t('continuing')} {nextRoadmap.topic}
                </Text>
              </View>
              <Text className="text-text-inverse text-3xl font-bold font-syne mb-3" numberOfLines={2}>
                {nextRoadmap.title || t('continueYourLesson')}
              </Text>
              <Button variant="inverse" size="lg" fullWidth>
                {t('continueLearning')}
              </Button>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/roadmaps/create')}
              className="bg-surface-card rounded-3xl p-6 border-2 border-dashed border-surface-border"
              activeOpacity={0.9}
            >
              <View className="w-16 h-16 bg-brand-500/10 rounded-full items-center justify-center mb-5">
                <Ionicons name="sparkles" size={32} color={COLORS.brand[400]} />
              </View>
              <Text className="text-text-primary text-2xl font-bold font-syne text-center mb-2">
                {t('welcomeToEasyTutor')}
              </Text>
              <Text className="text-text-secondary font-dmsans text-base text-center mb-6 max-w-[280px]">
                {t('yourAIPoweredStudyCompanion')}
              </Text>
              <Button size="lg" fullWidth>
                {t('createFirstPlan')}
              </Button>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View className="flex-row flex-wrap gap-4 mb-8">
          {[
            { label: t('totalXP'), value: xpTotal.toString(), icon: 'sparkles', color: COLORS.brand[400], bgClass: 'bg-brand-500/10' },
            { label: t('streak'), value: `${studyStreak} days`, icon: 'flame', color: COLORS.warning.light, bgClass: 'bg-warning/10' },
            { label: t('conceptsMasteredFull'), value: totalTopicsStudied.toString(), icon: 'school', color: COLORS.success.light, bgClass: 'bg-success/10' },
            { label: t('roadmaps'), value: roadmaps.length.toString(), icon: 'map', color: COLORS.accent.purple, bgClass: 'bg-[#8b5cf6]/10' },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 min-w-[120px] bg-surface-card p-5 rounded-2xl border border-surface-border">
              <View className={cn('w-10 h-10 rounded-lg flex-row items-center justify-center mb-3', stat.bgClass)}>
                <Ionicons name={stat.icon as React.ComponentProps<typeof Ionicons>['name']} size={20} color={stat.color} />
              </View>
              <Text className="text-text-primary text-2xl font-bold font-syne">{stat.value}</Text>
              <Text className="text-text-secondary font-dmsans text-xs uppercase tracking-wider">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Weak spots */}
        {weakSpots.length > 0 && (
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <CardTitle>{t('reviewWeakSpots')}</CardTitle>
              <TouchableOpacity onPress={() => router.push('/quiz')}>
                <Text className="text-brand-400 font-dmsans font-bold text-sm">{t('viewAll')}</Text>
              </TouchableOpacity>
            </View>
            <View className="space-y-3">
              {weakSpots.map((ws) => (
                <TouchableOpacity
                  key={ws.topic}
                  onPress={() => router.push('/study')}
                  className="bg-surface-card p-4 rounded-xl border border-surface-border flex-row items-center justify-between"
                >
                  <View className="flex-1 mr-4">
                    <Text className="text-text-primary font-bold font-syne text-lg" numberOfLines={1}>
                      {ws.topic}
                    </Text>
                    <Text className="text-text-secondary font-dmsans text-xs mt-1">
                      {ws.count} {t('missed')}
                    </Text>
                  </View>
                  <Text className="text-brand-400 font-bold font-dmsans text-sm">
                    {t('review')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Subjects */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-5">
            <CardTitle>{t('subjects')}</CardTitle>
            <TouchableOpacity>
              <Text className="text-brand-400 font-dmsans font-bold text-sm">{t('viewAll')}</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row gap-4">
            {SUBJECTS.map((subject) => {
              const topicCount = subject.topics.length;
              const completedInSubject = (topicsStudied[subject.id] || []).length;
              const progress = topicCount > 0 ? (completedInSubject / topicCount) * 100 : 0;

              return (
                <TouchableOpacity
                  key={subject.id}
                  onPress={() => router.push('/study')}
                  className="w-[48%] bg-surface-card rounded-2xl p-4 border border-surface-border"
                  activeOpacity={0.8}
                >
                  <View className="w-10 h-10 bg-brand-500/10 rounded-lg items-center justify-center mb-3">
                    <Ionicons name="book" size={20} color={COLORS.brand[400]} />
                  </View>
                  <Text className="text-text-primary font-bold font-syne text-lg mb-1" numberOfLines={1}>
                    {subject.name}
                  </Text>
                  <Text className="text-text-muted font-dmsans text-xs">
                    {completedInSubject}/{topicCount} {t('topics')}
                  </Text>
                  <View className="w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden mt-2">
                    <View
                      className="bg-brand-500 h-full rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
