import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRoadmapStore } from '../store/roadmapStore';
import { useProgressStore } from '../store/progressStore';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Meter } from './ui/Meter';
import { COLORS } from '../src/design/tokens';

export const CommandCenter = () => {
  const router = useRouter();
  const { roadmaps, checkedTasks } = useRoadmapStore();
  const { studyStreak, xpTotal } = useProgressStore();

  const hsMissions = roadmaps.filter((r) => r.learningMode === 'high_school');
  const uniMissions = roadmaps.filter((r) => r.learningMode === 'university');
  const selfMissions = roadmaps.filter((r) => r.learningMode === 'self_directed');

  const calculateProgress = (roadmapId: string) => {
    const roadmap = roadmaps.find((r) => r.id === roadmapId);
    if (!roadmap) return 0;
    const total = roadmap.days.reduce((acc, d) => acc + d.tasks.length, 0);
    const done = Object.values(checkedTasks[roadmapId] || {}).reduce((acc, dt) => acc + dt.length, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const overallProgress = roadmaps.length
    ? Math.round(
        roadmaps.reduce((acc, r) => acc + calculateProgress(r.id), 0) / roadmaps.length,
      )
    : 0;

  const sectors = [
    {
      key: 'high_school',
      title: 'High School Portal',
      icon: 'school' as const,
      color: COLORS.brand[500],
      missions: hsMissions,
      href: '/(high_school)',
    },
    {
      key: 'university',
      title: 'University Portal',
      icon: 'library' as const,
      color: COLORS.accent.purple,
      missions: uniMissions,
      href: '/(university)',
    },
    {
      key: 'self_directed',
      title: 'Knowledge Explorer',
      icon: 'compass' as const,
      color: COLORS.success.DEFAULT,
      missions: selfMissions,
      href: '/(self_directed)',
    },
  ];

  return (
    <ScrollView className="flex-1 bg-surface-bg" showsVerticalScrollIndicator={false}>
      <View className="px-6 pt-12 pb-8">
        {/* Hero */}
        <View className="flex-row justify-between items-start mb-8">
          <View className="flex-1 pr-4">
            <Text className="text-text-secondary font-dmsans text-sm uppercase tracking-widest mb-1">
              Elite Learner Identity
            </Text>
            <Text className="text-text-primary text-3xl font-bold font-syne">Command Center</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push('/profile')}
            className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 items-center justify-center"
          >
            <Ionicons name="person" size={24} color={COLORS.brand[500]} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View className="flex-row mb-6">
          <Card className="flex-1 mr-2 p-4">
            <Ionicons name="flame" size={22} color={COLORS.warning.DEFAULT} />
            <Text className="text-text-primary text-2xl font-bold font-syne mt-2">
              {studyStreak}d
            </Text>
            <Text className="text-text-secondary text-[10px] font-dmsans uppercase tracking-wider">
              Streak
            </Text>
          </Card>
          <Card className="flex-1 mx-1 p-4">
            <Ionicons name="sparkles" size={22} color={COLORS.brand[500]} />
            <Text className="text-text-primary text-2xl font-bold font-syne mt-2">{xpTotal}</Text>
            <Text className="text-text-secondary text-[10px] font-dmsans uppercase tracking-wider">
              Total XP
            </Text>
          </Card>
          <Card className="flex-1 ml-2 p-4">
            <Ionicons name="map" size={22} color={COLORS.success.DEFAULT} />
            <Text className="text-text-primary text-2xl font-bold font-syne mt-2">
              {roadmaps.length}
            </Text>
            <Text className="text-text-secondary text-[10px] font-dmsans uppercase tracking-wider">
              Missions
            </Text>
          </Card>
        </View>

        {/* Overall progress */}
        <Card className="mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-primary font-syne font-bold text-lg">Overall momentum</Text>
            <Chip label={`${overallProgress}%`} variant="brand" />
          </View>
          <Meter progress={overallProgress} />
          <Text className="text-text-secondary font-dmsans text-sm mt-3">
            {roadmaps.length
              ? 'Progress across every active mission.'
              : 'Create a mission to start tracking momentum.'}
          </Text>
        </Card>

        {/* Sectors */}
        <Text className="text-text-primary text-xl font-bold font-syne mb-4">Active Sectors</Text>

        {sectors.map((sector) =>
          sector.missions.length > 0 ? (
            <Card
              key={sector.key}
              interactive
              onPress={() => router.push(sector.href)}
              className="mb-4"
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: `${sector.color}22` }}
                  >
                    <Ionicons name={sector.icon} size={20} color={sector.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-primary font-bold font-syne">{sector.title}</Text>
                    <Chip label={`${sector.missions.length} mission${sector.missions.length === 1 ? '' : 's'}`} className="mt-1" />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={sector.color} />
              </View>
              {sector.missions.slice(0, 1).map((r) => (
                <View key={r.id}>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-text-secondary text-xs">{r.topic}</Text>
                    <Text className="text-text-primary text-xs font-bold">
                      {calculateProgress(r.id)}%
                    </Text>
                  </View>
                  <Meter progress={calculateProgress(r.id)} color={sector.color} />
                </View>
              ))}
            </Card>
          ) : null,
        )}

        {roadmaps.length === 0 && (
          <Card className="mb-8 items-center py-8">
            <Ionicons name="rocket-outline" size={28} color={COLORS.brand[400]} />
            <Text className="text-text-primary font-syne font-bold mt-3">No missions yet</Text>
            <Text className="text-text-secondary font-dmsans text-sm mt-1 text-center">
              Ask the tutor for a roadmap and your sectors will appear here.
            </Text>
          </Card>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon="sparkles"
          iconPosition="left"
          onPress={() => router.push('/explore')}
        >
          Ask AI Anything
        </Button>
      </View>
    </ScrollView>
  );
};
