import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { getStreakData, computeMomentum, StreakData, MomentumScore } from '../../lib/streaks';
import { getRecommendedTopics } from '../../lib/recommendations';

export default function MomentumDashboardScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<StreakData>({ current_streak: 0, longest_streak: 0, last_activity_date: '' });
  const [momentum, setMomentum] = useState<MomentumScore | null>(null);
  const [nextAction, setNextAction] = useState<string>('Start a practice session!');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const streakData = await getStreakData();
      setStreak(streakData);

      const momentumData = await computeMomentum(user?.id);
      setMomentum(momentumData);

      // Determine recommended next action
      const subjects = ['Mathematics', 'Biology', 'Physics', 'Chemistry'];
      let foundRecommendation = false;
      for (const sub of subjects) {
        const topics = await getRecommendedTopics(user?.id || '', sub);
        if (topics.length > 0) {
          setNextAction(`Practice ${topics[0]} in ${sub}`);
          foundRecommendation = true;
          break;
        }
      }
      if (!foundRecommendation) {
        setNextAction('Start a practice session to build momentum!');
      }
    } catch (err) {
      console.error('Failed to load momentum data:', err);
    }
    setLoading(false);
  }, [user?.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const categoryColors: Record<string, string> = {
    Starting: '#EF4444',
    Building: '#F59E0B',
    Consistent: '#3B82F6',
    Elite: '#10B981',
  };

  const categoryEmoji: Record<string, string> = {
    Starting: '🌱',
    Building: '🔨',
    Consistent: '🔥',
    Elite: '🏆',
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Learning Momentum</Text>

      {/* Momentum Score */}
      <View style={[styles.heroCard, { borderLeftColor: categoryColors[momentum?.category || 'Starting'] }]}>
        <Text style={styles.heroEmoji}>{categoryEmoji[momentum?.category || 'Starting']}</Text>
        <Text style={styles.heroScore}>{momentum?.score ?? 0}</Text>
        <Text style={[styles.heroCategory, { color: categoryColors[momentum?.category || 'Starting'] }]}>
          {momentum?.category || 'Starting'}
        </Text>
        <Text style={styles.heroLabel}>Momentum Score</Text>
      </View>

      {/* Streak */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Streak</Text>
        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.cardEmoji}>🔥</Text>
            <Text style={styles.cardValue}>{streak.current_streak}</Text>
            <Text style={styles.cardLabel}>Current</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardEmoji}>⭐</Text>
            <Text style={styles.cardValue}>{streak.longest_streak}</Text>
            <Text style={styles.cardLabel}>Longest</Text>
          </View>
        </View>
      </View>

      {/* Mastery Growth */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mastery Growth</Text>
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>📈</Text>
          <Text style={styles.cardValue}>{momentum?.masteryGrowth ?? 0}%</Text>
          <Text style={styles.cardLabel}>Average Mastery</Text>
        </View>
      </View>

      {/* Practice Frequency */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Practice Frequency</Text>
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>📝</Text>
          <Text style={styles.cardValue}>{momentum?.practiceFrequency ?? 0}</Text>
          <Text style={styles.cardLabel}>Sessions (Last 7 Days)</Text>
        </View>
      </View>

      {/* Next Action */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended Next Action</Text>
        <View style={[styles.card, styles.actionCard]}>
          <Text style={styles.cardEmoji}>🎯</Text>
          <Text style={styles.actionText}>{nextAction}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111827',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  heroEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  heroScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111827',
  },
  heroCategory: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  heroLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
});
