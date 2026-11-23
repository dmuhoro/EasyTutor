import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView,
  type StyleProp, type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useProgressStore, type WrongAnswerRecord } from '../../store/progressStore';
import { useQuizQuestionGeneration } from '../../hooks/useOrchestration';
import { Timer } from '../../components/ui/Timer';
import { QuizOption } from '../../components/ui/QuizOption';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { COLORS } from '../../src/design/tokens';
import { t } from '../../src/locales';

export interface PracticeScreenProps {
  className?: StyleProp<ViewStyle>;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

/** Runtime shape of `result.pipeline.output` from the governed quiz pipeline. */
interface GovernedQuestionOutput {
  question?: string;
  options?: string[];
  correct?: number;
  correctIndex?: number;
  explanation?: string;
  notCovered?: boolean;
}

/**
 * Practice and mock exam screen — shown step by step.
 * Questions come from the governed learning pipeline; every result is written
 * back through the progress store's portal. QuizOption for answers, Timer for
 * timed mode, honest states. Token-driven colours, 44px+ touch targets.
 * All user-facing strings via t() locale lookups.
 */
export function PracticeScreen({ className }: PracticeScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    topic?: string;
    subjectId?: string;
    timed?: string;
    total?: string;
  }>();
  const { addQuizScore, recordWrongAnswer } = useProgressStore();
  const { generateQuizQuestion } = useQuizQuestionGeneration();

  const totalQuestions = params.total ? Math.max(1, parseInt(params.total, 10)) : 5;
  const timedMode = params.timed === 'true';

  const subjectId = params.subjectId ?? '';
  const topicId = params.topic ?? '';
  const subjectName = subjectId ? subjectId.toUpperCase() : t('general');
  const topicName = topicId || t('practice');

  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionData, setQuestionData] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notCovered, setNotCovered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [missedQuestions, setMissedQuestions] = useState<{ question: string; selectedAnswer: string; correctAnswer: string; explanation: string }[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(timedMode ? 60 : 0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadQuestion();
    if (timedMode) {
      setTimeRemaining(60);
      setTimerActive(true);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [params.topic, params.subjectId, timedMode]);

  useEffect(() => {
    if (!timerActive || timeRemaining <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          setTimerActive(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timeRemaining]);

  const loadQuestion = async () => {
    setLoading(true);
    setError(null);
    setNotCovered(false);
    setSelectedOption(null);
    setShowExplanation(false);

    try {
      // The governed hook enforces auth/portal context, offline short-circuit,
      // a bounded deadline and cancellation; it is the live generation boundary.
      const result = await generateQuizQuestion({ subject_id: subjectId, topic_id: topicId });
      const output = result?.pipeline?.output as GovernedQuestionOutput | undefined;

      if (!output?.question || !Array.isArray(output.options) || output.options.length === 0) {
        setError(t('failedToLoadQuestion'));
        return;
      }

      // Fail closed: the pipeline flags genuinely uncovered topics so the UI
      // must never present an invented question as if it were grounded.
      if (output.notCovered === true) {
        setNotCovered(true);
        setQuestionData(null);
        return;
      }

      setQuestionData({
        question: output.question,
        options: output.options,
        correct: typeof output.correct === 'number'
          ? output.correct
          : typeof output.correctIndex === 'number' ? output.correctIndex : 0,
        explanation: output.explanation || t('thisIsFoundationalConcept'),
      });
    } catch (err) {
      // The governed hook turns provider/deadline/offline failures into an
      // explicit, user-readable reason — surface it, never a fabricated quiz.
      setError(err instanceof Error && err.message ? err.message : t('failedToLoadQuestion'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (index: number) => {
    if (showExplanation || !questionData) return;
    setTimerActive(false);
    setSelectedOption(index);
    setShowExplanation(true);

    const isCorrect = index === questionData.correct;
    if (isCorrect) {
      setScore(prev => prev + 1);
    } else {
      const wrong: WrongAnswerRecord = {
        id: `${Date.now()}_${questionIndex}`,
        question: questionData.question,
        selectedAnswer: questionData.options[index] ?? '',
        correctAnswer: questionData.options[questionData.correct] ?? '',
        explanation: questionData.explanation,
        topic: topicId,
        subjectId,
        timestamp: new Date().toISOString(),
      };
      recordWrongAnswer(wrong);
      setMissedQuestions(prev => [...prev, wrong]);
    }
  };

  const handleNextQuestion = () => {
    if (questionIndex + 1 >= totalQuestions) {
      // Governed progress write. On failure the store records
      // pendingProgressSync and the queued sync replays on reconnect.
      void addQuizScore(score, totalQuestions, topicName, subjectId, topicId)
        .catch(() => undefined);
      setIsFinished(true);
      return;
    }
    setQuestionIndex(prev => prev + 1);
    setSelectedOption(null);
    setShowExplanation(false);
    loadQuestion();
    if (timedMode) {
      setTimeRemaining(60);
      setTimerActive(true);
    }
  };

  const handleTryAgain = () => {
    setQuestionIndex(0);
    setScore(0);
    setMissedQuestions([]);
    setIsFinished(false);
    setSelectedOption(null);
    setShowExplanation(false);
    loadQuestion();
  };

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  if (isFinished) {
    const feedback = percentage >= 80 ? t('outstanding') : percentage >= 50 ? t('goodJob') : t('keepPracticing');
    const accentColor = percentage >= 80 ? COLORS.success.light : percentage >= 50 ? COLORS.warning.light : COLORS.error.light;

    return (
      <SafeAreaView className="flex-1 bg-surface-bg">
        <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="w-full rounded-3xl p-6 border border-surface-border items-center relative overflow-hidden">
            <View className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" style={{ backgroundColor: accentColor }} />
            <View className="w-24 h-24 bg-surface-bg rounded-full items-center justify-center mb-6 border-4" style={{ borderColor: accentColor }}>
              <Text className="text-text-primary text-3xl font-bold font-syne">{percentage}%</Text>
            </View>
            <Text className="text-text-primary text-4xl font-bold font-syne mb-2 text-center">{feedback}</Text>
            <Text className="text-text-secondary font-dmsans text-lg mb-4 text-center max-w-[240px]">
              {t('youAnswered', { score, total: totalQuestions })}
            </Text>

            <View className="bg-surface-elevated px-6 py-3 rounded-2xl border border-surface-border mb-6 flex-row items-center">
              <Ionicons name="sparkles" size={20} color={COLORS.brand[400]} />
              <Text className="text-text-primary font-bold font-syne text-xl ml-2">
                +{percentage >= 80 ? 20 : percentage >= 50 ? 10 : 5} {t('xp')}
              </Text>
            </View>

            {missedQuestions.length > 0 && (
              <View className="w-full mt-2 mb-6">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="alert-circle" size={18} color={COLORS.error.light} />
                  <Text className="text-text-primary font-bold font-syne text-base ml-2">
                    {t('reviewMissedConcepts')} ({missedQuestions.length})
                  </Text>
                </View>
                {missedQuestions.map((item, idx) => (
                  <View key={idx} className="bg-surface-card p-4 rounded-xl border border-surface-border mb-3">
                    <Text className="text-text-primary font-bold font-syne text-sm mb-2">{item.question}</Text>
                    <View className="mb-1">
                      <Text className="text-text-secondary text-xs font-dmsans">{t('yourAnswer')}:</Text>
                      <Text className="text-error-light font-dmsans text-xs">{item.selectedAnswer}</Text>
                    </View>
                    <View className="mb-2">
                      <Text className="text-text-secondary text-xs font-dmsans">{t('correctAnswer')}:</Text>
                      <Text className="text-success-light font-dmsans text-xs font-semibold">{item.correctAnswer}</Text>
                    </View>
                    <Text className="text-text-secondary text-xs font-dmsans italic bg-surface-elevated p-2 rounded-lg">
                      💡 {item.explanation}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity
                  onPress={() => router.push('/study')}
                  className="bg-brand-500/20 border border-brand-500/40 py-3.5 px-4 rounded-xl flex-row items-center justify-center mt-1"
                >
                  <Ionicons name="school-outline" size={18} color={COLORS.brand[400]} />
                  <Text className="text-brand-400 font-bold font-syne text-sm ml-2">
                    {t('reviewWeakPoints')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View className="w-full flex-row mt-2">
              <TouchableOpacity
                onPress={handleTryAgain}
                className="bg-surface-card flex-1 py-5 rounded-2xl flex-row items-center justify-center border border-surface-border mr-3"
              >
                <Ionicons name="refresh" size={18} color={COLORS.text.secondary} />
                <Text className="text-text-secondary font-bold font-syne text-lg ml-2">{t('retry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/progress')}
                className="bg-brand-500 flex-2 py-5 rounded-3xl flex-row items-center justify-center shadow-lg shadow-brand-500/30"
              >
                <Text className="text-text-inverse font-bold font-syne text-lg mr-2">{t('dashboard')}</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-bg">
      <View className="px-5 py-4 border-b border-surface-border">
        <View className="flex-row justify-between items-end mb-3">
          <View className="flex-1 mr-4">
            <Text className="text-text-primary text-3xl font-bold font-syne mb-1">{t('practice')}</Text>
            <View className="flex-row items-center">
              <Badge variant="neutral" size="sm">{subjectName}</Badge>
              <Text className="text-text-secondary text-xs font-dmsans ml-2" numberOfLines={1}>• {topicName}</Text>
            </View>
          </View>
          <Text className="text-text-secondary font-dmsans font-bold">
            {questionIndex + 1} / {totalQuestions}
          </Text>
          <View className="flex-row items-center gap-2">
            {timedMode && (
              <View className="flex-row items-center gap-2">
                <Ionicons name="timer-outline" size={16} color={timeRemaining <= 10 ? COLORS.error.light : COLORS.text.secondary} />
                <Text className={`font-dmsans font-bold text-xs ${timeRemaining <= 10 ? 'text-error-light' : ''}`}>
                  {Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => {
                // Router-native param update: works on web AND device (no window).
                router.setParams({ timed: timedMode ? 'false' : 'true' });
              }}
              className="px-4 py-2 rounded-xl border flex-row items-center"
              style={{ borderColor: timedMode ? COLORS.brand[400] : COLORS.surface.border, backgroundColor: timedMode ? `${COLORS.brand[500]}20` : 'transparent' }}
            >
              <Ionicons name={timedMode ? 'stopwatch' : 'timer-outline'} size={16} color={timedMode ? COLORS.brand[400] : COLORS.text.secondary} />
              <Text className={`text-[10px] font-bold font-syne ml-2 ${timedMode ? 'text-brand-400' : 'text-text-secondary'}`}>
                {timedMode ? t('timedOn') : t('timedOff')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden border border-surface-border">
          <View className="bg-brand-500 h-full rounded-full" style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }} />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center px-6">
          <Skeleton width={120} height={120} rounded="full" />
          <View className="mt-4 flex-col items-center gap-1">
            <Skeleton width="40%" height={16} rounded="md" />
            <Skeleton width="60%" height={16} rounded="md" />
          </View>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon="alert-circle"
            title={t('failedToLoadQuestionTitle')}
            message={error}
            actionLabel={t('tryAgain')}
            onAction={loadQuestion}
          />
        </View>
      ) : notCovered ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon="alert-circle"
            title={t('notInNotesYet')}
            message={t('notInNotesMessage', { topic: topicName })}
            actionLabel={t('tryAgain')}
            onAction={loadQuestion}
          />
        </View>
      ) : questionData && (
        <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
          <Text className="text-text-primary text-2xl font-bold font-syne mb-8 leading-9">
            {questionData.question}
          </Text>

          <View className="mb-6">
            {questionData.options.map((option, idx) => (
              <QuizOption
                key={idx}
                label={option}
                value={String(idx)}
                selectedValue={selectedOption !== null ? String(selectedOption) : null}
                correctValue={showExplanation ? String(questionData.correct) : null}
                onSelect={(val) => handleSelectOption(Number(val))}
                disabled={showExplanation}
              />
            ))}
          </View>

          {showExplanation && (
            <View className="bg-surface-card p-5 rounded-xl border border-surface-border mb-8">
              <View className="flex-row items-center mb-2">
                <Ionicons name="information-circle" size={20} color={COLORS.brand[400]} />
                <Text className="text-text-primary font-bold font-syne text-lg ml-2">{t('explanation')}</Text>
              </View>
              <Text className="text-text-secondary font-dmsans text-base leading-6">
                {questionData.explanation}
              </Text>
            </View>
          )}

          {showExplanation && (
            <TouchableOpacity
              onPress={handleNextQuestion}
              className="bg-brand-500 py-4 rounded-2xl flex-row items-center justify-center mb-10 shadow-lg shadow-brand-500/30"
              activeOpacity={0.8}
            >
              <Text className="text-text-inverse font-bold text-lg font-syne mr-2">
                {questionIndex + 1 >= totalQuestions ? t('finishQuiz') : t('nextQuestion')}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
