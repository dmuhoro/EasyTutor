import React, { useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { QuizEngine } from '../../components/QuizEngine';
import { QuestionBankItem, savePracticeSession } from '../../lib/questionBank';
import { track } from '../../lib/analytics';
import { useAuthStore } from '../../store/authStore';
import { updateMastery } from '../../lib/mastery';
import { recordPracticeMomentum } from '../../lib/streaks';
import {
  buildAdaptiveQuestionSet,
  DifficultyLevel,
  getRecommendedDifficulty,
  resolveTopicMasteryPercent,
  trackAdaptiveDifficultyChanged,
  trackAdaptiveSessionStarted,
} from '../../lib/adaptiveDifficulty';
import {
  PerformanceSessionSummary,
} from '../../lib/performanceEngine';
import type { LearningTrendOverview } from '../../lib/trendEngine';

type SessionInsight = {
  masteryPercent: number;
  performance: PerformanceSessionSummary | null;
};

const formatTime = (milliseconds: number): string => {
  if (milliseconds <= 0) return '0.0s';

  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
};

export default function PracticeSessionScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const subject = params.subject as string;
  const topic = params.topic as string;

  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionPrimary, setSessionPrimary] = useState<DifficultyLevel>('medium');
  const [showInsight, setShowInsight] = useState(false);
  const [sessionInsight, setSessionInsight] = useState<SessionInsight | null>(null);
  const [performanceInsight, setPerformanceInsight] = useState<PerformanceSessionSummary | null>(null);
  const [trendInsight, setTrendInsight] = useState<LearningTrendOverview | null>(null);
  const [hasCompletedSession, setHasCompletedSession] = useState(false);

  useEffect(() => {
    void loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    const adaptive = await buildAdaptiveQuestionSet(user?.id, subject, topic, 10);
    setQuestions(adaptive.questions);
    setSessionPrimary(adaptive.primary);

    trackAdaptiveSessionStarted({
      user_id: user?.id,
      subject,
      topic,
      mastery_percent: adaptive.masteryPercent,
      primary_difficulty: adaptive.primary,
      question_count: adaptive.questions.length,
    });

    setLoading(false);
  };

  const handleFinish = async (score: number, total: number) => {
    const sessionTopic = topic && topic !== 'all' ? topic : 'Mixed Topics';
    const beforeMastery = await resolveTopicMasteryPercent(user?.id, subject, topic);
    const beforeProfile = getRecommendedDifficulty(beforeMastery);

    track('practice_completed', {
      subject,
      topic,
      difficulty: sessionPrimary,
      score,
      total,
      adaptive: true,
    });

    await savePracticeSession({
      user_id: user?.id,
      subject,
      topic: sessionTopic,
      difficulty: sessionPrimary,
      score,
    });

    await updateMastery(user?.id, subject, sessionTopic, score, total);
    await recordPracticeMomentum(user?.id);

    const afterMastery = await resolveTopicMasteryPercent(user?.id, subject, topic);
    const afterProfile = getRecommendedDifficulty(afterMastery);

    trackAdaptiveDifficultyChanged({
      user_id: user?.id,
      subject,
      topic,
      previous_primary: beforeProfile.primary,
      next_primary: afterProfile.primary,
      previous_mastery: beforeMastery,
      next_mastery: afterMastery,
    });

    setSessionInsight((current) => ({
      masteryPercent: afterMastery,
      performance: current?.performance ?? null,
    }));
    setHasCompletedSession(true);
  };

  const handlePerformanceComputed = (summary: PerformanceSessionSummary) => {
    setPerformanceInsight(summary);
    setSessionInsight((current) => ({
      masteryPercent: current?.masteryPercent ?? 0,
      performance: summary,
    }));
  };

  const handleTrendComputed = (overview: LearningTrendOverview | null) => {
    setTrendInsight(overview);
  };

  const handleQuizContinue = () => {
    if (hasCompletedSession) {
      setShowInsight(true);
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (showInsight && sessionInsight) {
    const summaryPerformance = sessionInsight.performance ?? performanceInsight;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.insightContent}>
        <Text style={styles.insightTitle}>Session Complete</Text>
        <Text style={styles.insightSubtitle}>Mastery snapshot: {sessionInsight.masteryPercent}%</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Accuracy</Text>
          <Text style={styles.cardValue}>{summaryPerformance ? `${summaryPerformance.accuracy_score}%` : '0%'}</Text>
          <Text style={styles.cardHint}>Correct answers out of total questions</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Avg Response Time</Text>
          <Text style={styles.cardValue}>{summaryPerformance ? formatTime(summaryPerformance.average_response_time_ms) : '0.0s'}</Text>
          <Text style={styles.cardHint}>Average time per question</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Confidence</Text>
          <Text style={styles.cardValue}>{summaryPerformance ? `${summaryPerformance.confidence_score}%` : '0%'}</Text>
          <Text style={styles.cardHint}>Accuracy and speed combined</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Fluency Level</Text>
          <Text style={styles.cardValue}>{summaryPerformance?.fluency_level ?? 'Emerging'}</Text>
          <Text style={styles.cardHint}>From performance score and pace</Text>
        </View>

        {trendInsight && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Progress Over Time</Text>
            <Text style={styles.cardValue}>
              {trendInsight.weekly?.trend_summary ?? trendInsight.trend_summary}
            </Text>
            <Text style={styles.cardHint}>
              {trendInsight.weekly
                ? `${trendInsight.weekly.session_completion_count} sessions this week · ${trendInsight.weekly.reinforcement_message}`
                : trendInsight.reinforcement_message}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => router.push('/(shared)/learning-dashboard')}
        >
          <Text style={styles.dashboardButtonText}>Open Learning Dashboard</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <QuizEngine
        subjectName={subject}
        topicName={topic === 'all' ? 'Mixed Topics' : topic}
        totalQuestions={questions.length}
        customQuestions={questions.map((q) => ({
          question: q.question,
          options: q.options,
          correct: q.options.indexOf(q.correct_answer) >= 0 ? q.options.indexOf(q.correct_answer) : 0,
          explanation: q.explanation || '',
        }))}
        onFinish={handleFinish}
        onPerformanceComputed={handlePerformanceComputed}
        onTrendComputed={handleTrendComputed}
        onContinue={handleQuizContinue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0f12',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0f12',
  },
  insightContent: {
    padding: 20,
    paddingTop: 48,
  },
  insightTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  insightSubtitle: {
    color: '#9eb8ff',
    fontSize: 16,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#161920',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2f3d',
  },
  cardLabel: {
    color: '#8a8fa3',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardHint: {
    color: '#cfd6ec',
    fontSize: 14,
  },
  doneButton: {
    backgroundColor: '#4f7cff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  dashboardButton: {
    backgroundColor: '#121823',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#35508d',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dashboardButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
