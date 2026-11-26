import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useProgressStore, type WrongAnswerRecord } from '../../store/progressStore';
import { useRoadmapStore, type CustomRoadmap } from '../../store/roadmapStore';
import { useAuthStore } from '../../store/authStore';
import { getSubjectById } from '../../lib/subjects';
import { preloadQuizCache } from '../../lib/cache';
import { useCanonicalLearnerState } from '../../hooks/useCanonicalLearnerState';
import { logError } from '../../lib/logEvent';
import { scheduleIdleTask } from '../../lib/idleTask';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { COLORS } from '../../src/design/tokens';
import { Database } from '../../src/infrastructure/database';
import { portalFromMode } from '../../src/domain/learning/portal';
import { getDueReviews, getRetentionStore, type RetentionProfile } from '../../lib/spacedRepetitionEngine';
import { getRecommendedTopics } from '../../lib/recommendations';
import { t } from '../../src/locales';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

interface NextTask {
  day: number;
  title: string;
  task: string;
}

/** First unchecked task in plan order. No task means the plan is complete. */
function findNextTask(
  roadmap: CustomRoadmap,
  checkedTasks: Record<string, Record<number, string[]>>,
): NextTask | null {
  const checked = checkedTasks[roadmap.id] ?? {};
  for (const day of roadmap.days) {
    const dayChecked = checked[day.day] ?? [];
    const incomplete = day.tasks.find((task) => !dayChecked.includes(task));
    if (incomplete) return { day: day.day, title: day.title, task: incomplete };
  }
  return null;
}

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning');
  if (hour < 17) return t('goodAfternoon');
  return t('goodEvening');
}

function displayNameFrom(email: string | undefined): string {
  const local = email?.split('@')[0];
  if (!local) return t('student');
  const words = local.replace(/[._-]+/g, ' ').trim();
  if (!words) return t('student');
  return words.replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Home — "Today" (sprint 21, L3 slice 1).
 *
 * Reference: `docs/design/stitch/today/` (390 px, light). One clear next action,
 * then review and momentum. Progress values come from local stores; the exam
 * countdown comes from the learner's governed profile. The reference's
 * institution and article are sample content and are not reproduced.
 */
export default function HomeTab() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isConnected } = useNetInfo();
  const {
    xpEvents,
    quizScores,
    wrongAnswers,
    updateStreak,
    syncPendingProgress,
  } = useProgressStore();
  const {
    roadmaps,
    checkedTasks,
    learningMode,
    getRoadmapProgress,
    syncQueuedTasks,
    fetchSavedRoadmaps,
  } = useRoadmapStore();
  const canonical = useCanonicalLearnerState();
  const [examDate, setExamDate] = useState<string | null>(null);
  const [dueReviews, setDueReviews] = useState<RetentionProfile[]>([]);
  const [recommendedTopics, setRecommendedTopics] = useState<string[]>([]);

  const nextRoadmap = useMemo(() => {
    const incomplete = roadmaps.filter((roadmap) => getRoadmapProgress(roadmap.id) < 100);
    const candidates = incomplete.length > 0 ? incomplete : roadmaps;
    return [...candidates].sort(
      (a, b) =>
        new Date(b.lastOpenedAt ?? b.createdAt).getTime() -
        new Date(a.lastOpenedAt ?? a.createdAt).getTime(),
    )[0];
  }, [roadmaps, checkedTasks, getRoadmapProgress]);

  // Local-first: render immediately from the stores, sync in the background.
  // Idle scheduling keeps these non-visual tasks outside the first-interaction
  // window; failures are still logged, never surfaced as a blocking error screen.
  useEffect(() => {
    return scheduleIdleTask(() => {
      const run = (context: string, task: () => unknown) => {
        try {
          void Promise.resolve(task()).catch((error) => logError(context, error));
        } catch (error) {
          logError(context, error);
        }
      };

      run('HOME_streak_failed', () => updateStreak());
      if (isConnected) {
        run('HOME_quiz_preload_failed', () => preloadQuizCache());
        run('HOME_task_sync_failed', () => syncQueuedTasks());
        run('HOME_progress_sync_failed', () => syncPendingProgress());
      }
      if (user?.id) {
        run('HOME_roadmaps_fetch_failed', () => fetchSavedRoadmaps());
        run('HOME_exam_date_fetch_failed', async () => {
          const profile = (await Database.governedQuery({
            table: 'profiles',
            columns: 'exam_date',
            portalType: portalFromMode(learningMode ?? 'high_school'),
            userId: user.id,
          }).maybeSingle()) as {
            data: { exam_date?: unknown } | null;
            error: { message: string } | null;
          };
          if (profile.error) throw new Error(profile.error.message);
          const value = profile.data?.exam_date;
          setExamDate(typeof value === 'string' ? value : null);
        });
        run('HOME_due_reviews_failed', async () => {
          const store = getRetentionStore(user.id);
          const due = await getDueReviews(store.fetchAll);
          setDueReviews(due.slice(0, 3));
        });
        // Recommendations are derived from governed mastery records for the
        // learner's active roadmap subject. With no subject there is no claim.
        run('HOME_recommendations_failed', async () => {
          const subjectId = nextRoadmap?.subjectId;
          if (!subjectId) return;
          const topics = await getRecommendedTopics(user.id, subjectId);
          setRecommendedTopics(topics.slice(0, 3));
        });
      }
    });
  }, [
    fetchSavedRoadmaps,
    isConnected,
    learningMode,
    nextRoadmap?.subjectId,
    syncPendingProgress,
    syncQueuedTasks,
    updateStreak,
    user?.id,
  ]);

  const displayName = displayNameFrom(user?.email);
  const initial = displayName.charAt(0).toUpperCase();

  const roadmapProgress = nextRoadmap ? getRoadmapProgress(nextRoadmap.id) : 0;
  const nextTask = nextRoadmap ? findNextTask(nextRoadmap, checkedTasks) : null;

  const subjectName = nextRoadmap?.subjectId
    ? getSubjectById(nextRoadmap.subjectId)?.name
    : undefined;
  const modeLabel =
    learningMode === 'high_school'
      ? t('highSchool')
      : learningMode === 'university'
        ? t('university')
        : learningMode === 'self_directed'
          ? t('selfDirected')
          : null;

  const courseLabel = subjectName ?? nextRoadmap?.topic ?? null;
  const headerContext = [courseLabel, modeLabel].filter(Boolean).join(' · ');
  const subtitle =
    courseLabel && modeLabel
      ? `${courseLabel} • ${modeLabel}`
      : (courseLabel ?? t('studyCompanion'));

  const examLabel = useMemo(() => {
    if (!examDate) return null;
    const target = new Date(`${examDate}T00:00:00`);
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((target.getTime() - today.getTime()) / 86400000);
    return days < 0 ? t('examDatePassed') : t('examInDays', { count: days });
  }, [examDate]);

  const weakSpots = useMemo(() => {
    const byTopic: Record<string, { topic: string; count: number; latest: WrongAnswerRecord }> = {};
    for (const answer of wrongAnswers ?? []) {
      const existing = byTopic[answer.topic];
      if (!existing) {
        byTopic[answer.topic] = { topic: answer.topic, count: 1, latest: answer };
        continue;
      }
      existing.count += 1;
      if (new Date(answer.timestamp).getTime() > new Date(existing.latest.timestamp).getTime()) {
        existing.latest = answer;
      }
    }
    return Object.values(byTopic)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [wrongAnswers]);

  const weekDays = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday

    const activeDates = new Set<string>();
    for (const event of xpEvents ?? []) {
      const date = new Date(event.timestamp);
      if (!Number.isNaN(date.getTime())) activeDates.add(date.toDateString());
    }
    for (const score of quizScores ?? []) {
      const date = new Date(score.date);
      if (!Number.isNaN(date.getTime())) activeDates.add(date.toDateString());
    }

    const today = new Date().toDateString();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        key: date.toISOString().slice(0, 10),
        label: DAY_LABELS[index],
        active: activeDates.has(date.toDateString()),
        isToday: date.toDateString() === today,
      };
    });
  }, [xpEvents, quizScores]);
  const activeDays = weekDays.filter((day) => day.active).length;

  const syncStatus: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    color: string;
  } = !isConnected
    ? { icon: 'cloud-offline-outline', label: t('offlineChip'), color: COLORS.warning.dark }
    : canonical.syncState === 'pending'
      ? { icon: 'cloud-upload-outline', label: t('syncing'), color: COLORS.warning.dark }
      : { icon: 'checkmark-circle', label: t('upToDate'), color: COLORS.primary.DEFAULT };

  const quickActions: {
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
  }[] = [
    { label: t('importNotes'), icon: 'reader-outline', onPress: () => router.push('/(tabs)/library') },
    { label: t('askTutor'), icon: 'chatbubble-ellipses-outline', onPress: () => router.push('/(tabs)/study') },
    { label: t('practice'), icon: 'flash-outline', onPress: () => router.push('/(tabs)/quiz') },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface-bg" edges={['top']}>
      {/* Today's header (the reference puts identity and location here). The
          tab layout hides its native header for this route. */}
      <View className="h-16 flex-row items-center justify-between px-4">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-sm bg-primary">
            <Ionicons name="book" size={18} color={COLORS.text.inverse} />
          </View>
          <View>
            <Text className="text-sm font-dmsans-bold leading-none text-text-primary">
              {t('s80')}
            </Text>
            <Text className="mt-1 text-[11px] font-mono text-text-muted">{t('home')}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/you')}
          accessibilityRole="button"
          className="min-h-[48px] flex-row items-center gap-2"
        >
          <View className="items-end">
            <Text
              className="text-xs font-dmsans-semibold leading-none text-text-primary"
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {headerContext ? (
              <Text className="mt-1 text-[11px] text-text-muted" numberOfLines={1}>
                {headerContext}
              </Text>
            ) : null}
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Ionicons name="person" size={18} color={COLORS.text.inverse} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 112 }}
      >
        <View className="gap-8">
          {/* Greeting + sync state */}
          <View className="flex-row items-start justify-between gap-3 pt-2">
            <View className="flex-1 flex-row items-start gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <Text className="text-lg font-dmsans-bold text-primary">{initial}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[22px] font-dmsans-semibold leading-snug text-text-primary">
                  {timeGreeting()}, {displayName}
                </Text>
                <Text className="mt-1 text-xs text-text-secondary" numberOfLines={2}>
                  {subtitle}
                </Text>
                <Text
                  accessibilityLabel={`canonical-mastery-${Math.round(canonical.masteryConfidence * 100)}`}
                  className="mt-1 text-[11px] font-mono text-text-muted"
                  numberOfLines={1}
                >
                  {t('mastery')}: {Math.round(canonical.masteryConfidence * 100)}%
                </Text>
              </View>
            </View>
            <View
              accessible
              accessibilityLabel={syncStatus.label}
              className="shrink-0 flex-row items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-2"
            >
              <Ionicons name={syncStatus.icon} size={16} color={syncStatus.color} />
              <Text className="text-xs font-dmsans-medium text-text-secondary">
                {syncStatus.label}
              </Text>
            </View>
          </View>

          {examLabel ? (
            <View
              accessible
              accessibilityLabel={examLabel}
              className="flex-row items-center gap-2 rounded-md bg-surface-subtle px-3 py-2"
            >
              <Ionicons name="calendar-outline" size={16} color={COLORS.warning.dark} />
              <Text className="text-xs font-dmsans-medium text-text-secondary">
                {examLabel}
              </Text>
            </View>
          ) : null}

          {/* One clear next action */}
          {nextRoadmap ? (
            <View className="rounded-lg bg-surface-card p-6 shadow-sm">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5 self-start rounded-full bg-warning-container px-2.5 py-0.5">
                    <View className="h-1.5 w-1.5 rounded-full bg-warning" />
                    <Text className="text-[11px] font-mono font-semibold uppercase tracking-wider text-warning-on-container">
                      {t('studyPlan')}
                    </Text>
                  </View>
                  <Text
                    className="pt-1 text-lg font-dmsans-semibold leading-snug text-text-primary"
                    numberOfLines={2}
                  >
                    {nextRoadmap.topic}
                  </Text>
                </View>
                <View className="h-16 w-16 items-center justify-center">
                  <ProgressRing
                    progress={roadmapProgress}
                    size={64}
                    strokeWidth={5}
                    color={COLORS.primary.DEFAULT}
                    backgroundColor={COLORS.surface.subtle}
                    showText={false}
                  />
                  <View className="absolute inset-0 items-center justify-center">
                    <Text className="text-lg font-dmsans-bold leading-none text-text-primary">
                      {Math.round(roadmapProgress)}%
                    </Text>
                    <Text className="mt-0.5 text-[9px] font-mono text-text-muted">{t('done')}</Text>
                  </View>
                </View>
              </View>

              <View className="mt-4 rounded-md bg-surface-subtle p-4">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-xs font-dmsans-medium text-text-muted">
                    {t('nextTopic')}
                  </Text>
                  <Text
                    className="flex-1 text-right text-[11px] font-mono font-semibold text-primary"
                    numberOfLines={1}
                  >
                    {nextTask ? nextTask.title : t('planComplete')}
                  </Text>
                </View>
                <Text
                  className="mt-1 text-base font-dmsans-semibold leading-snug text-text-primary"
                  numberOfLines={2}
                >
                  {nextTask ? nextTask.task : t('planCompleteBody')}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  nextTask
                    ? router.push(`/roadmaps/${nextRoadmap.id}`)
                    : router.push('/roadmaps/create')
                }
                accessibilityRole="button"
                className="mt-4 min-h-[48px] flex-row items-center justify-center gap-2 rounded-md bg-primary-light px-5 py-3"
                activeOpacity={0.9}
              >
                <Text
                  className="text-sm font-dmsans-semibold text-text-inverse"
                  numberOfLines={1}
                >
                  {nextTask
                    ? `${t('continue')}: ${nextTask.task}`
                    : t('createNewPlan')}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.text.inverse} />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="rounded-lg bg-surface-card p-6 shadow-sm">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <Ionicons name="sparkles" size={24} color={COLORS.primary.DEFAULT} />
              </View>
              <Text className="mt-4 text-[22px] font-dmsans-semibold leading-snug text-text-primary">
                {t('welcomeToEasyTutor')}
              </Text>
              <Text className="mt-2 text-sm text-text-secondary">
                {t('yourAIPoweredStudyCompanion')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/roadmaps/create')}
                accessibilityRole="button"
                className="mt-4 min-h-[48px] flex-row items-center justify-center gap-2 rounded-md bg-primary-light px-5 py-3"
                activeOpacity={0.9}
              >
                <Text className="text-sm font-dmsans-semibold text-text-inverse">
                  {t('createFirstPlan')}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.text.inverse} />
              </TouchableOpacity>
            </View>
          )}

          {/* Quick actions — all three land on live routes. */}
          <View className="flex-row gap-3">
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                activeOpacity={0.85}
                className="min-h-[82px] flex-1 items-center justify-center rounded-lg bg-surface-card p-3.5 shadow-sm"
              >
                <Ionicons name={action.icon} size={24} color={COLORS.primary.DEFAULT} />
                <Text className="mt-1 text-center text-xs font-dmsans-medium leading-tight text-text-primary">
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Due reviews — real spaced-repetition store data only. */}
          {dueReviews.length > 0 ? (
            <View className="gap-3">
              <View className="flex-row items-baseline justify-between gap-2">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="hourglass-outline" size={18} color={COLORS.primary.DEFAULT} />
                  <Text className="text-lg font-dmsans-semibold text-text-primary">
                    {t('review')}
                  </Text>
                </View>
                <Text className="text-xs font-dmsans-medium text-text-muted">
                  {t('flagged', { count: dueReviews.length })}
                </Text>
              </View>

              {dueReviews.map((review) => (
                <View key={review.id} className="rounded-lg bg-surface-subtle p-4">
                  <Text
                    className="text-base font-dmsans-semibold leading-snug text-text-primary"
                    numberOfLines={1}
                  >
                    {review.id}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Recommended topics — governed mastery output for the active subject. */}
          {recommendedTopics.length > 0 ? (
            <View className="gap-3">
              <View className="flex-row items-baseline justify-between gap-2">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="sparkles" size={18} color={COLORS.primary.DEFAULT} />
                  <Text className="text-lg font-dmsans-semibold text-text-primary">
                    {t('topics')}
                  </Text>
                </View>
                <Text className="text-xs font-dmsans-medium text-text-muted">
                  {t('flagged', { count: recommendedTopics.length })}
                </Text>
              </View>

              {recommendedTopics.map((topic) => (
                <TouchableOpacity
                  key={topic}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/study',
                      params: {
                        topic,
                        subjectId: nextRoadmap?.subjectId,
                        mode: 'Teach & Quiz',
                      },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${t('practice')} ${topic}`}
                  className="min-h-[48px] rounded-lg bg-surface-subtle p-4"
                  activeOpacity={0.85}
                >
                  <Text
                    className="text-base font-dmsans-semibold leading-snug text-text-primary"
                    numberOfLines={1}
                  >
                    {topic}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Weak spots — real wrong-answer records only. */}
          {weakSpots.length > 0 ? (
            <View className="gap-3">
              <View className="flex-row items-baseline justify-between gap-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-dmsans-semibold text-text-primary">
                    {t('weakSpots')}
                  </Text>
                  <View className="rounded-full bg-error-container px-2 py-0.5">
                    <Text className="text-xs font-dmsans-medium text-error-on-container">
                      {t('flagged', { count: weakSpots.length })}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs font-dmsans-medium text-text-muted">
                  {t('basedOnQuizAnswers')}
                </Text>
              </View>

              {weakSpots.map((spot, index) => (
                <View key={spot.topic} className="rounded-lg bg-surface-subtle p-4">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons
                      name={index === 0 ? 'alert-circle' : 'refresh-circle'}
                      size={16}
                      color={COLORS.error.DEFAULT}
                    />
                    <Text className="text-[11px] font-mono font-semibold text-error">
                      {t('missedTimes', { count: spot.count })}
                    </Text>
                  </View>
                  <Text
                    className="mt-2 text-lg font-dmsans-semibold leading-snug text-text-primary"
                    numberOfLines={2}
                  >
                    {spot.topic}
                  </Text>
                  <Text className="mt-1 text-xs text-text-secondary" numberOfLines={1}>
                    {spot.latest.question}
                  </Text>
                  <View className="mt-3 flex-row items-center justify-between gap-2">
                    <Text
                      className="flex-1 text-[11px] font-mono text-text-muted"
                      numberOfLines={1}
                    >
                      {spot.latest.correctAnswer}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/study',
                          params: {
                            topic: spot.topic,
                            subjectId: spot.latest.subjectId,
                            mode: 'Teach & Quiz',
                          },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${t('review')} ${spot.topic}`}
                      className="min-h-[48px] flex-row items-center gap-1 rounded-sm bg-surface-card px-3.5 shadow-sm"
                      activeOpacity={0.85}
                    >
                      <Text className="text-xs font-dmsans-semibold text-primary">
                        {t('review')}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={COLORS.primary.DEFAULT} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* This week — activity from persisted XP events and quiz sessions. */}
          <View className="gap-4 rounded-lg bg-surface-card p-5 shadow-sm">
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-row items-center gap-2">
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary.DEFAULT} />
                <Text className="text-lg font-dmsans-semibold text-text-primary">
                  {t('thisWeek')}
                </Text>
              </View>
              <View className="rounded bg-brand-100/50 px-2 py-0.5">
                <Text className="text-[11px] font-mono font-semibold text-primary">
                  {t('daysActive', { count: activeDays })}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between">
              {weekDays.map((day) => (
                <View key={day.key} className="flex-1 items-center gap-1.5">
                  <Text className="text-[11px] font-mono font-semibold text-text-muted">
                    {day.label}
                  </Text>
                  <View
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={`${day.label}: ${day.active ? t('done') : '—'}`}
                    className={`h-8 w-8 items-center justify-center rounded-full ${
                      day.active
                        ? 'bg-primary'
                        : day.isToday
                          ? 'border-2 border-primary bg-surface-elevated'
                          : 'bg-surface-elevated'
                    }`}
                  >
                    {day.active ? (
                      <Ionicons name="checkmark" size={16} color={COLORS.text.inverse} />
                    ) : (
                      <View className="h-1.5 w-1.5 rounded-full bg-surface-border" />
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View className="border-t border-surface-border/50 pt-3">
              <Text className="text-center text-xs text-text-secondary">
                {activeDays > 0
                  ? `${t('studyDaysThisWeek', { count: activeDays })} • ${t('everyMinuteCounts')}`
                  : t('noStudyActivity')}
              </Text>
            </View>
          </View>

          {/* Flagship content — the reference's "Workshop Reference" slot, with
              a real route instead of sample article copy. */}
          <TouchableOpacity
            onPress={() => router.push('/ai-literacy')}
            accessibilityRole="button"
            activeOpacity={0.85}
            className="min-h-[72px] flex-row items-center gap-3 rounded-lg bg-surface-card p-3 shadow-sm"
          >
            <View className="h-14 w-14 items-center justify-center rounded-md bg-brand-100">
              <Ionicons name="sparkles" size={24} color={COLORS.primary.DEFAULT} />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-mono font-medium text-primary">
                {t('flagshipLearning')}
              </Text>
              <Text className="mt-0.5 text-sm font-dmsans-semibold text-text-primary" numberOfLines={1}>
                {t('aiLiteracyTitle')}
              </Text>
              <Text className="mt-0.5 text-xs text-text-muted" numberOfLines={1}>
                {t('offlineAfterFirstLoad')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
