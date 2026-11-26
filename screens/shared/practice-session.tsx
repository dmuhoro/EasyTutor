import { t } from '../../src/locales';
import { LEGACY_COLORS } from '../../src/design/legacyPalette';
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
        <ActivityIndicator size="large" color={LEGACY_COLORS.indigo600} />
      </View>
    );
  }

  if (showInsight && sessionInsight) {
    const summaryPerformance = sessionInsight.performance ?? performanceInsight;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.insightContent}>
        <Text style={styles.insightTitle}>{t('cr')}</Text>
        <Text style={styles.insightSubtitle}>{t('ff')} {sessionInsight.masteryPercent}%</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('kp')}</Text>
          <Text style={styles.cardValue}>{summaryPerformance ? `${summaryPerformance.accuracy_score}%` : '0%'}</Text>
          <Text style={styles.cardHint}>{t('ol')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('qp')}</Text>
          <Text style={styles.cardValue}>{summaryPerformance ? formatTime(summaryPerformance.average_response_time_ms) : '0.0s'}</Text>
          <Text style={styles.cardHint}>{t('nn')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('fr')}</Text>
          <Text style={styles.cardValue}>{summaryPerformance ? `${summaryPerformance.confidence_score}%` : '0%'}</Text>
          <Text style={styles.cardHint}>{t('cj')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('ml')}</Text>
          <Text style={styles.cardValue}>{summaryPerformance?.fluency_level ?? 'Emerging'}</Text>
          <Text style={styles.cardHint}>{t('pt')}</Text>
        </View>

        {trendInsight && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('cs')}</Text>
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
          <Text style={styles.dashboardButtonText}>{t('gu')}</Text>
          <Ionicons name="arrow-forward" size={18} color={LEGACY_COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
          <Text style={styles.doneButtonText}>{t('ap')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <QuizEngine
        subjectName={subject}
        topicName={topic === 'all' ? t('ei') : topic}
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
    backgroundColor: LEGACY_COLORS.nightCanvas,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LEGACY_COLORS.nightCanvas,
  },
  insightContent: {
    padding: 20,
    paddingTop: 48,
  },
  insightTitle: {
    color: LEGACY_COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  insightSubtitle: {
    color: LEGACY_COLORS.blueRibbon200,
    fontSize: 16,
    marginBottom: 24,
  },
  card: {
    backgroundColor: LEGACY_COLORS.nightSurface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: LEGACY_COLORS.nightBorder,
  },
  cardLabel: {
    color: LEGACY_COLORS.nightTextMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardValue: {
    color: LEGACY_COLORS.white,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardHint: {
    color: LEGACY_COLORS.nightTextBright,
    fontSize: 14,
  },
  doneButton: {
    backgroundColor: LEGACY_COLORS.blueRibbon,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  dashboardButton: {
    backgroundColor: LEGACY_COLORS.nightPanel,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: LEGACY_COLORS.blue800,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dashboardButtonText: {
    color: LEGACY_COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  doneButtonText: {
    color: LEGACY_COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
