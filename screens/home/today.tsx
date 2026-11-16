import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  ActivityIndicator, type StyleProp, type ViewStyle,
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
import { COLORS } from '../../src/design/tokens';

export interface HomeScreenProps {
  className?: StyleProp<ViewStyle>;
}

/**
 * Home "Today" screen — one clear next action per screen.
 * Phone-first, thumb-reachable, token-driven colours.
 * Honest states: loading, empty, error, offline.
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

  const displayName = user?.email?.split('@')[0] ?? 'Student';
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
    if (!lastOpenedDate) return 'Welcome back,';
    const diffDays = Math.floor(
      (Date.now() - new Date(lastOpenedDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return 'Welcome back';
    if (diffDays === 1) return 'Great to see you again';
    return 'Welcome back';
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
          title="Something went wrong"
          message={loadError.message}
          actionLabel="Try again"
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
            <Text className="text-text-secondary font-dmsans text-lg">{greeting()}</Text>
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
              You're offline. Changes will sync when you reconnect.
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
                  Continuing {nextRoadmap.topic}
                </Text>
              </View>
              <Text className="text-text-inverse text-3xl font-bold font-syne mb-3" numberOfLines={2}>
                {nextRoadmap.topic}
              </Text>
              <Button variant="inverse" size="lg" fullWidth>
                Continue Learning
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
                Welcome to EasyTutor
              </Text>
              <Text className="text-text-secondary font-dmsans text-base text-center mb-6 max-w-[280px]">
                Your AI-powered study companion. Create your first roadmap to begin.
              </Text>
              <Button size="lg" fullWidth>
                Start your first study plan
              </Button>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-surface-card p-5 rounded-2xl border border-surface-border">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-secondary font-dmsans text-xs uppercase tracking-wider">
                Level
              </Text>
              <Badge variant="brand" size="sm">{level}</Badge>
            </View>
            <Text className="text-text-primary text-3xl font-bold font-syne">{xpTotal}</Text>
            <Text className="text-text-secondary font-dmsans text-sm">Total XP</Text>
          </View>
          <View className="flex-1 bg-surface-card p-5 rounded-2xl border border-surface-border">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-secondary font-dmsans text-xs uppercase tracking-wider">
                Streak
              </Text>
              <Badge variant="warning" size="sm">{studyStreak}</Badge>
            </View>
            <Text className="text-text-primary text-3xl font-bold font-syne">{studyStreak}</Text>
            <Text className="text-text-secondary font-dmsans text-sm">Days</Text>
          </View>
          <View className="flex-1 bg-surface-card p-5 rounded-2xl border border-surface-border">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-secondary font-dmsans text-xs uppercase tracking-wider">
                Concepts
              </Text>
              <Badge variant="success" size="sm">{totalTopicsStudied}</Badge>
            </View>
            <Text className="text-text-primary text-3xl font-bold font-syne">{roadmaps.length}</Text>
            <Text className="text-text-secondary font-dmsans text-sm">Roadmaps</Text>
          </View>
        </View>

        {/* Weak spots */}
        {weakSpots.length > 0 && (
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <CardTitle>Review Weak Spots</CardTitle>
              <TouchableOpacity onPress={() => router.push('/quiz')}>
                <Text className="text-brand-400 font-dmsans font-bold text-sm">View All</Text>
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
                    <Text className="text-text-secondary text-xs font-dmsans mt-1">
                      {ws.count} missed
                    </Text>
                  </View>
                  <Text className="text-brand-400 font-bold font-dmsans text-sm">
                    Review
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Subjects */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-5">
            <CardTitle>Subjects</CardTitle>
            <TouchableOpacity>
              <Text className="text-brand-400 font-dmsans font-bold text-sm">View All</Text>
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
                    {completedInSubject}/{topicCount} Topics
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
