import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { logSupabaseError } from './supabaseOps';
import type {
  FluencyLevel,
  PerformanceProfile,
  PerformanceSessionInput,
  PerformanceSessionSummary,
} from './performanceTypes';

export type TrendWindow = 'daily' | 'weekly' | 'monthly';
export type TrendMetricKey =
  | 'confidence_score'
  | 'accuracy_score'
  | 'fluency_score'
  | 'response_speed_score';

export type TrendDirection = 'improving' | 'declining' | 'stagnant';

export interface LearningTrendSnapshot {
  user_id?: string;
  subject: string;
  topic: string;
  accuracy_score: number;
  confidence_score: number;
  fluency_score: number;
  fluency_level: FluencyLevel;
  average_response_time_ms: number;
  fastest_response_time_ms: number;
  slowest_response_time_ms: number;
  response_speed_score: number;
  session_completed: boolean;
  session_count: number;
  total_questions_answered: number;
  total_correct_answers: number;
  completed_at: string;
}

export interface TrendMetricSummary {
  key: TrendMetricKey;
  label: string;
  current_value: number;
  previous_value: number;
  delta_value: number;
  improvement_percent: number;
  decline_percent: number;
  direction: TrendDirection;
  is_stagnant: boolean;
}

export interface TrendWindowSummary {
  window: TrendWindow;
  label: string;
  period_start: string;
  period_end: string;
  snapshot_count: number;
  session_completion_count: number;
  session_completion_change: number;
  session_completion_change_percent: number;
  average_response_time_ms: number;
  metrics: Record<TrendMetricKey, TrendMetricSummary>;
  best_performing_metric: TrendMetricKey;
  most_improved_metric: TrendMetricKey;
  most_concerning_metric: TrendMetricKey;
  stagnation_detected: boolean;
  stagnation_streak_days: number;
  trend_summary: string;
  reinforcement_message: string;
}

export interface LearningTrendOverview {
  user_id?: string;
  latest_snapshot: LearningTrendSnapshot | null;
  daily: TrendWindowSummary | null;
  weekly: TrendWindowSummary | null;
  monthly: TrendWindowSummary | null;
  best_performing_metric: TrendMetricKey | null;
  most_improved_metric: TrendMetricKey | null;
  most_concerning_metric: TrendMetricKey | null;
  stagnation_streak_days: number;
  trend_summary: string;
  reinforcement_message: string;
  generated_at: string;
}

const TREND_SNAPSHOTS_CACHE_PREFIX = 'learning_trend_snapshots_cache_v1';
const TREND_OVERVIEW_CACHE_PREFIX = 'learning_trend_overview_cache_v1';
const TREND_TABLE = 'learning_trend_snapshots';
const TREND_CACHE_LIMIT = 240;
const STAGNATION_THRESHOLD = 3;

const METRIC_LABELS: Record<TrendMetricKey, string> = {
  confidence_score: 'Confidence',
  accuracy_score: 'Accuracy',
  fluency_score: 'Fluency',
  response_speed_score: 'Response speed',
};

const METRIC_WINDOW_WORDS: Record<TrendWindow, string> = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
};

const average = (values: number[]): number =>
  values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const getResponseSpeedScore = (averageResponseTimeMs: number): number => {
  const averageResponseTimeSeconds = averageResponseTimeMs / 1000;

  if (averageResponseTimeSeconds <= 10) return 100;
  if (averageResponseTimeSeconds <= 20) return 80;
  if (averageResponseTimeSeconds <= 30) return 60;
  return 40;
};

const trendSnapshotsCacheKey = (userId: string | undefined): string =>
  `${TREND_SNAPSHOTS_CACHE_PREFIX}:${userId ?? 'anon'}`;

const trendOverviewCacheKey = (userId: string | undefined): string =>
  `${TREND_OVERVIEW_CACHE_PREFIX}:${userId ?? 'anon'}`;

const normalizeDate = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

const toIsoDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const toMonthKey = (date: Date): string => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const getWeekStart = (date: Date): Date => {
  const normalized = normalizeDate(date);
  const day = normalized.getUTCDay() === 0 ? 7 : normalized.getUTCDay();
  normalized.setUTCDate(normalized.getUTCDate() - (day - 1));
  return normalized;
};

const getWindowKey = (date: Date, window: TrendWindow): string => {
  if (window === 'daily') return toIsoDateKey(date);
  if (window === 'weekly') return toIsoDateKey(getWeekStart(date));
  return toMonthKey(date);
};

const getWindowLabel = (window: TrendWindow, start: Date, end: Date): string => {
  if (window === 'daily') {
    return start.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  if (window === 'weekly') {
    return `${start.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`;
  }

  return start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const getWindowEnd = (start: Date, window: TrendWindow): Date => {
  const end = new Date(start);
  if (window === 'daily') {
    return end;
  }
  if (window === 'weekly') {
    end.setUTCDate(end.getUTCDate() + 6);
    return end;
  }
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  return end;
};

const parseSnapshots = (raw: string | null): LearningTrendSnapshot[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LearningTrendSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadSnapshotsFromLocalCache = async (userId: string | undefined): Promise<LearningTrendSnapshot[] | null> => {
  try {
    const cached = await AsyncStorage.getItem(trendSnapshotsCacheKey(userId));
    if (!cached) return null;
    return parseSnapshots(cached);
  } catch {
    return null;
  }
};

const persistSnapshotsToLocalCache = async (
  userId: string | undefined,
  snapshots: LearningTrendSnapshot[],
): Promise<void> => {
  try {
    await AsyncStorage.setItem(trendSnapshotsCacheKey(userId), JSON.stringify(snapshots.slice(-TREND_CACHE_LIMIT)));
  } catch {
    // Local cache is best-effort.
  }
};

const persistOverviewToLocalCache = async (
  userId: string | undefined,
  overview: LearningTrendOverview,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(trendOverviewCacheKey(userId), JSON.stringify(overview));
  } catch {
    // Local cache is best-effort.
  }
};

const persistSnapshotRemotely = async (snapshot: LearningTrendSnapshot): Promise<void> => {
  if (!snapshot.user_id || !supabase) {
    return;
  }

  try {
    const { error } = await supabase.from(TREND_TABLE).insert({
      user_id: snapshot.user_id,
      subject: snapshot.subject,
      topic: snapshot.topic,
      accuracy_score: snapshot.accuracy_score,
      confidence_score: snapshot.confidence_score,
      fluency_score: snapshot.fluency_score,
      fluency_level: snapshot.fluency_level,
      average_response_time_ms: snapshot.average_response_time_ms,
      fastest_response_time_ms: snapshot.fastest_response_time_ms,
      slowest_response_time_ms: snapshot.slowest_response_time_ms,
      response_speed_score: snapshot.response_speed_score,
      session_completed: snapshot.session_completed,
      session_count: snapshot.session_count,
      total_questions_answered: snapshot.total_questions_answered,
      total_correct_answers: snapshot.total_correct_answers,
      completed_at: snapshot.completed_at,
    });

    if (error) {
      logSupabaseError(TREND_TABLE, 'insert', error);
    }
  } catch (error) {
    logSupabaseError(TREND_TABLE, 'insert', error);
  }
};

const fetchSnapshotsFromSupabase = async (userId: string): Promise<LearningTrendSnapshot[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from(TREND_TABLE)
      .select(
        'user_id, subject, topic, accuracy_score, confidence_score, fluency_score, fluency_level, average_response_time_ms, fastest_response_time_ms, slowest_response_time_ms, response_speed_score, session_completed, session_count, total_questions_answered, total_correct_answers, completed_at',
      )
      .eq('user_id', userId)
      .order('completed_at', { ascending: true });

    if (error) {
      logSupabaseError(TREND_TABLE, 'select', error);
      return [];
    }

    return (data ?? []) as LearningTrendSnapshot[];
  } catch (error) {
    logSupabaseError(TREND_TABLE, 'select', error);
    return [];
  }
};

const loadSnapshots = async (userId: string | undefined): Promise<LearningTrendSnapshot[]> => {
  const localSnapshots = await loadSnapshotsFromLocalCache(userId);
  if (localSnapshots && localSnapshots.length > 0) {
    return localSnapshots;
  }

  if (!userId) {
    return localSnapshots ?? [];
  }

  const remoteSnapshots = await fetchSnapshotsFromSupabase(userId);
  if (remoteSnapshots.length > 0) {
    await persistSnapshotsToLocalCache(userId, remoteSnapshots);
  }

  return remoteSnapshots;
};

const compareMetric = (
  key: TrendMetricKey,
  currentValue: number,
  previousValue: number,
): TrendMetricSummary => {
  const deltaValue = Math.round(currentValue - previousValue);
  const improvementPercent = deltaValue > 0
    ? (previousValue <= 0 ? 100 : Math.round((deltaValue / previousValue) * 100))
    : 0;
  const declinePercent = deltaValue < 0
    ? (currentValue <= 0 ? 100 : Math.round((Math.abs(deltaValue) / Math.abs(previousValue || currentValue || 1)) * 100))
    : 0;
  const isStagnant = Math.abs(deltaValue) <= STAGNATION_THRESHOLD;

  return {
    key,
    label: METRIC_LABELS[key],
    current_value: clampScore(currentValue),
    previous_value: clampScore(previousValue),
    delta_value: deltaValue,
    improvement_percent: improvementPercent,
    decline_percent: declinePercent,
    direction: deltaValue > STAGNATION_THRESHOLD ? 'improving' : deltaValue < -STAGNATION_THRESHOLD ? 'declining' : 'stagnant',
    is_stagnant: isStagnant,
  };
};

const summariseGroup = (
  currentSnapshots: LearningTrendSnapshot[],
  previousSnapshots: LearningTrendSnapshot[],
  window: TrendWindow,
  periodStart: Date,
  periodEnd: Date,
  stagnationStreakDays: number,
): TrendWindowSummary => {
  const currentAverageResponseTime = average(currentSnapshots.map((snapshot) => snapshot.average_response_time_ms));
  const previousAverageResponseTime = average(previousSnapshots.map((snapshot) => snapshot.average_response_time_ms));
  const currentConfidence = average(currentSnapshots.map((snapshot) => snapshot.confidence_score));
  const previousConfidence = average(previousSnapshots.map((snapshot) => snapshot.confidence_score));
  const currentAccuracy = average(currentSnapshots.map((snapshot) => snapshot.accuracy_score));
  const previousAccuracy = average(previousSnapshots.map((snapshot) => snapshot.accuracy_score));
  const currentFluency = average(currentSnapshots.map((snapshot) => snapshot.fluency_score));
  const previousFluency = average(previousSnapshots.map((snapshot) => snapshot.fluency_score));
  const currentResponseSpeed = average(currentSnapshots.map((snapshot) => snapshot.response_speed_score));
  const previousResponseSpeed = average(previousSnapshots.map((snapshot) => snapshot.response_speed_score));
  const sessionCompletionCount = currentSnapshots.length;
  const previousSessionCompletionCount = previousSnapshots.length;
  const sessionCompletionChange = sessionCompletionCount - previousSessionCompletionCount;
  const sessionCompletionChangePercent = sessionCompletionChange > 0
    ? (previousSessionCompletionCount <= 0 ? 100 : Math.round((sessionCompletionChange / previousSessionCompletionCount) * 100))
    : sessionCompletionChange < 0
      ? (sessionCompletionCount <= 0 ? 100 : Math.round((Math.abs(sessionCompletionChange) / Math.max(previousSessionCompletionCount, 1)) * 100))
      : 0;

  const metrics = {
    confidence_score: compareMetric('confidence_score', currentConfidence, previousConfidence),
    accuracy_score: compareMetric('accuracy_score', currentAccuracy, previousAccuracy),
    fluency_score: compareMetric('fluency_score', currentFluency, previousFluency),
    response_speed_score: compareMetric('response_speed_score', currentResponseSpeed, previousResponseSpeed),
  };

  const metricEntries = Object.values(metrics);
  const bestPerformingMetric = metricEntries.reduce((best, metric) => (
    metric.current_value > best.current_value ? metric : best
  ), metricEntries[0]).key;
  const mostImprovedMetric = metricEntries.reduce((best, metric) => (
    metric.delta_value > best.delta_value ? metric : best
  ), metricEntries[0]).key;
  const mostConcerningMetric = metricEntries.reduce((worst, metric) => (
    metric.delta_value < worst.delta_value ? metric : worst
  ), metricEntries[0]).key;
  const stagnationDetected = metricEntries.every((metric) => metric.is_stagnant) && Math.abs(sessionCompletionChange) <= 1;

  const windowWord = METRIC_WINDOW_WORDS[window];
  const trendSummary = stagnationDetected && stagnationStreakDays >= 10
    ? `${METRIC_LABELS[mostConcerningMetric]} has plateaued for ${stagnationStreakDays} days.`
    : metrics[mostImprovedMetric].delta_value >= 0
      ? `${METRIC_LABELS[mostImprovedMetric]} increased by ${Math.max(0, metrics[mostImprovedMetric].improvement_percent)}% ${windowWord}.`
      : `${METRIC_LABELS[mostConcerningMetric]} is under pressure ${windowWord}.`;

  const reinforcementMessage = stagnationDetected
    ? 'You are not losing ground, even when the numbers pause. Keep the routine alive.'
    : bestPerformingMetric === 'confidence_score'
      ? 'Confidence is building. Keep practicing the same patterns to make it stick.'
      : bestPerformingMetric === 'accuracy_score'
        ? 'Accuracy is strong. A little more repetition will make it automatic.'
        : bestPerformingMetric === 'fluency_score'
          ? 'Your fluency is improving. Keep going to turn knowledge into speed.'
          : 'Your response speed is sharpening. The next session can make it even smoother.';

  return {
    window,
    label: getWindowLabel(window, periodStart, periodEnd),
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    snapshot_count: currentSnapshots.length,
    session_completion_count: sessionCompletionCount,
    session_completion_change: sessionCompletionChange,
    session_completion_change_percent: sessionCompletionChangePercent,
    average_response_time_ms: currentAverageResponseTime,
    metrics,
    best_performing_metric: bestPerformingMetric,
    most_improved_metric: mostImprovedMetric,
    most_concerning_metric: mostConcerningMetric,
    stagnation_detected: stagnationDetected,
    stagnation_streak_days: stagnationStreakDays,
    trend_summary: trendSummary,
    reinforcement_message: reinforcementMessage,
  };
};

const buildWindowSummaries = (
  snapshots: LearningTrendSnapshot[],
): {
  latestSnapshot: LearningTrendSnapshot | null;
  daily: TrendWindowSummary | null;
  weekly: TrendWindowSummary | null;
  monthly: TrendWindowSummary | null;
  stagnationStreakDays: number;
  bestPerformingMetric: TrendMetricKey | null;
  mostImprovedMetric: TrendMetricKey | null;
  mostConcerningMetric: TrendMetricKey | null;
  trendSummary: string;
  reinforcementMessage: string;
} => {
  if (snapshots.length === 0) {
    return {
      latestSnapshot: null,
      daily: null,
      weekly: null,
      monthly: null,
      stagnationStreakDays: 0,
      bestPerformingMetric: null,
      mostImprovedMetric: null,
      mostConcerningMetric: null,
      trendSummary: 'Complete a practice session to unlock your progress over time.',
      reinforcementMessage: 'Every completed session creates a stronger learning trail.',
    };
  }

  const sortedSnapshots = snapshots
    .slice()
    .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());

  const bucketed = {
    daily: bucketSnapshots(sortedSnapshots, 'daily'),
    weekly: bucketSnapshots(sortedSnapshots, 'weekly'),
    monthly: bucketSnapshots(sortedSnapshots, 'monthly'),
  };

  const latestDaily = bucketed.daily[bucketed.daily.length - 1] ?? null;
  const previousDaily = bucketed.daily[bucketed.daily.length - 2] ?? null;
  const latestWeekly = bucketed.weekly[bucketed.weekly.length - 1] ?? null;
  const previousWeekly = bucketed.weekly[bucketed.weekly.length - 2] ?? null;
  const latestMonthly = bucketed.monthly[bucketed.monthly.length - 1] ?? null;
  const previousMonthly = bucketed.monthly[bucketed.monthly.length - 2] ?? null;

  const dailyStagnationStreakDays = calculateStagnationStreak(bucketed.daily);

  const dailySummary = latestDaily
    ? summariseGroup(
        latestDaily.snapshots,
        previousDaily?.snapshots ?? [],
        'daily',
        latestDaily.periodStart,
        latestDaily.periodEnd,
        dailyStagnationStreakDays,
      )
    : null;
  const weeklySummary = latestWeekly
    ? summariseGroup(
        latestWeekly.snapshots,
        previousWeekly?.snapshots ?? [],
        'weekly',
        latestWeekly.periodStart,
        latestWeekly.periodEnd,
        dailyStagnationStreakDays,
      )
    : null;
  const monthlySummary = latestMonthly
    ? summariseGroup(
        latestMonthly.snapshots,
        previousMonthly?.snapshots ?? [],
        'monthly',
        latestMonthly.periodStart,
        latestMonthly.periodEnd,
        dailyStagnationStreakDays,
      )
    : null;

  const focusSummary = weeklySummary ?? dailySummary ?? monthlySummary;
  const bestPerformingMetric = focusSummary?.best_performing_metric ?? null;
  const mostImprovedMetric = focusSummary?.most_improved_metric ?? null;
  const mostConcerningMetric = focusSummary?.most_concerning_metric ?? null;
  const trendSummary = focusSummary?.trend_summary ?? 'Keep going - your learning trail is just getting started.';
  const reinforcementMessage = focusSummary?.reinforcement_message ?? 'Every session strengthens your learning trajectory.';

  return {
    latestSnapshot: sortedSnapshots[sortedSnapshots.length - 1] ?? null,
    daily: dailySummary,
    weekly: weeklySummary,
    monthly: monthlySummary,
    stagnationStreakDays: dailyStagnationStreakDays,
    bestPerformingMetric,
    mostImprovedMetric,
    mostConcerningMetric,
    trendSummary,
    reinforcementMessage,
  };
};

const bucketSnapshots = (
  snapshots: LearningTrendSnapshot[],
  window: TrendWindow,
): Array<{
  key: string;
  periodStart: Date;
  periodEnd: Date;
  snapshots: LearningTrendSnapshot[];
}> => {
  const buckets = new Map<string, {
    key: string;
    periodStart: Date;
    periodEnd: Date;
    snapshots: LearningTrendSnapshot[];
  }>();

  for (const snapshot of snapshots) {
    const completedAt = new Date(snapshot.completed_at);
    const bucketDate = window === 'monthly' ? new Date(Date.UTC(completedAt.getUTCFullYear(), completedAt.getUTCMonth(), 1)) : window === 'weekly' ? getWeekStart(completedAt) : normalizeDate(completedAt);
    const key = getWindowKey(completedAt, window);

    const existing = buckets.get(key);
    if (existing) {
      existing.snapshots.push(snapshot);
      existing.periodEnd = completedAt;
      continue;
    }

    const periodEnd = getWindowEnd(bucketDate, window);
    buckets.set(key, {
      key,
      periodStart: bucketDate,
      periodEnd,
      snapshots: [snapshot],
    });
  }

  return [...buckets.values()].sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
};

const calculateStagnationStreak = (
  dailyBuckets: Array<{
    key: string;
    periodStart: Date;
    periodEnd: Date;
    snapshots: LearningTrendSnapshot[];
  }>,
): number => {
  if (dailyBuckets.length < 2) {
    return 0;
  }

  let streak = 0;
  for (let index = dailyBuckets.length - 1; index > 0; index -= 1) {
    const currentBucket = dailyBuckets[index];
    const previousBucket = dailyBuckets[index - 1];
    const daysApart = Math.round((currentBucket.periodStart.getTime() - previousBucket.periodStart.getTime()) / (1000 * 60 * 60 * 24));
    if (daysApart !== 1) {
      break;
    }

    const currentMetrics = summariseGroup(
      currentBucket.snapshots,
      previousBucket.snapshots,
      'daily',
      currentBucket.periodStart,
      currentBucket.periodEnd,
      streak,
    );

    const allStagnant = Object.values(currentMetrics.metrics).every((metric) => metric.is_stagnant);
    if (!allStagnant) {
      break;
    }

    streak += 1;
  }

  return streak > 0 ? streak + 1 : 0;
};

export const loadCachedLearningTrendOverview = async (
  userId: string | undefined,
): Promise<LearningTrendOverview | null> => {
  try {
    const cached = await AsyncStorage.getItem(trendOverviewCacheKey(userId));
    return cached ? (JSON.parse(cached) as LearningTrendOverview) : null;
  } catch {
    return null;
  }
};

export const getLearningTrendOverview = async (
  userId: string | undefined,
): Promise<LearningTrendOverview> => {
  const snapshots = await loadSnapshots(userId);
  if (snapshots.length === 0) {
    const cached = await loadCachedLearningTrendOverview(userId);
    if (cached) {
      return cached;
    }
  }

  const overview = buildLearningTrendOverview(userId, snapshots);
  await persistOverviewToLocalCache(userId, overview);
  return overview;
};

export const buildLearningTrendOverview = (
  userId: string | undefined,
  snapshots: LearningTrendSnapshot[],
): LearningTrendOverview => {
  const summary = buildWindowSummaries(snapshots);

  return {
    user_id: userId,
    latest_snapshot: summary.latestSnapshot,
    daily: summary.daily,
    weekly: summary.weekly,
    monthly: summary.monthly,
    best_performing_metric: summary.bestPerformingMetric,
    most_improved_metric: summary.mostImprovedMetric,
    most_concerning_metric: summary.mostConcerningMetric,
    stagnation_streak_days: summary.stagnationStreakDays,
    trend_summary: summary.trendSummary,
    reinforcement_message: summary.reinforcementMessage,
    generated_at: new Date().toISOString(),
  };
};

export const recordLearningTrendSnapshot = async (
  input: PerformanceSessionInput,
  session: PerformanceSessionSummary,
  profile: PerformanceProfile,
): Promise<{
  snapshot: LearningTrendSnapshot;
  overview: LearningTrendOverview;
}> => {
  const snapshot: LearningTrendSnapshot = {
    user_id: input.userId,
    subject: input.subject,
    topic: input.topic,
    accuracy_score: session.accuracy_score,
    confidence_score: profile.confidence_score,
    fluency_score: profile.fluency_score,
    fluency_level: profile.fluency_level,
    average_response_time_ms: session.average_response_time_ms,
    fastest_response_time_ms: session.fastest_response_time_ms,
    slowest_response_time_ms: session.slowest_response_time_ms,
    response_speed_score: getResponseSpeedScore(session.average_response_time_ms),
    session_completed: true,
    session_count: profile.session_count,
    total_questions_answered: profile.total_questions_answered,
    total_correct_answers: profile.total_correct_answers,
    completed_at: profile.updated_at,
  };

  const cachedSnapshots = await loadSnapshots(input.userId);
  const nextSnapshots = [...cachedSnapshots, snapshot].slice(-TREND_CACHE_LIMIT);

  await persistSnapshotsToLocalCache(input.userId, nextSnapshots);
  await persistSnapshotRemotely(snapshot);

  const overview = buildLearningTrendOverview(input.userId, nextSnapshots);
  await persistOverviewToLocalCache(input.userId, overview);

  return { snapshot, overview };
};
