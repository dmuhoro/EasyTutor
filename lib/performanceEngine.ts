import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from './analytics';
import { recordLearningTrendSnapshot, type LearningTrendOverview, type LearningTrendSnapshot } from './trendEngine';
import { supabase } from './supabase';
import { logSupabaseError } from './supabaseOps';
import type {
  FluencyLevel,
  PerformanceProfile,
  PerformanceSessionInput,
  PerformanceSessionSummary,
} from './performanceTypes';

export type {
  FluencyLevel,
  PerformanceProfile,
  PerformanceSessionInput,
  PerformanceSessionSummary,
} from './performanceTypes';

export interface RecordedPerformanceProfile {
  session: PerformanceSessionSummary;
  previousProfile: PerformanceProfile | null;
  profile: PerformanceProfile;
  fluencyLevelChanged: boolean;
  trendSnapshot: LearningTrendSnapshot;
  trendOverview: LearningTrendOverview;
}

const PERFORMANCE_CACHE_PREFIX = 'performance_profile_cache_v1';

const performanceCacheKey = (
  userId: string | undefined,
  subject: string,
  topic: string,
): string => `${PERFORMANCE_CACHE_PREFIX}:${userId ?? 'anon'}:${subject}:${topic}`;

const performanceCachePrefix = (userId: string | undefined): string =>
  `${PERFORMANCE_CACHE_PREFIX}:${userId ?? 'anon'}:`;

const sanitizeResponseTimes = (responseTimesMs: number[]): number[] =>
  responseTimesMs
    .filter((time) => Number.isFinite(time) && time >= 0)
    .map((time) => Math.round(time));

const average = (values: number[]): number =>
  values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

export const getResponseFactor = (averageResponseTimeMs: number): number => {
  const averageResponseTimeSeconds = averageResponseTimeMs / 1000;

  if (averageResponseTimeSeconds <= 10) return 100;
  if (averageResponseTimeSeconds <= 20) return 80;
  if (averageResponseTimeSeconds <= 30) return 60;
  return 40;
};

export const getFluencyLevel = (fluencyScore: number): FluencyLevel => {
  if (fluencyScore <= 40) return 'Emerging';
  if (fluencyScore <= 60) return 'Developing';
  if (fluencyScore <= 80) return 'Proficient';
  return 'Fluent';
};

export const calculateConfidenceScore = (accuracyScore: number, averageResponseTimeMs: number): number => {
  const responseFactor = getResponseFactor(averageResponseTimeMs);
  return Math.max(0, Math.min(100, Math.round((accuracyScore * 0.7) + (responseFactor * 0.3))));
};

export const buildPerformanceSessionSummary = (
  input: PerformanceSessionInput,
): PerformanceSessionSummary => {
  const responseTimesMs = sanitizeResponseTimes(input.responseTimesMs);
  const averageResponseTimeMs = average(responseTimesMs);
  const fastestResponseTimeMs = responseTimesMs.length > 0 ? Math.min(...responseTimesMs) : 0;
  const slowestResponseTimeMs = responseTimesMs.length > 0 ? Math.max(...responseTimesMs) : 0;
  const accuracyScore = input.totalQuestions > 0
    ? Math.round((input.correctAnswers / input.totalQuestions) * 100)
    : 0;
  const confidenceScore = calculateConfidenceScore(accuracyScore, averageResponseTimeMs);
  const fluencyScore = confidenceScore;

  return {
    accuracy_score: accuracyScore,
    average_response_time_ms: averageResponseTimeMs,
    fastest_response_time_ms: fastestResponseTimeMs,
    slowest_response_time_ms: slowestResponseTimeMs,
    confidence_score: confidenceScore,
    fluency_score: fluencyScore,
    fluency_level: getFluencyLevel(fluencyScore),
  };
};

export const getAllPerformanceProfiles = async (
  userId: string | undefined,
): Promise<PerformanceProfile[]> => {
  const cachePrefix = performanceCachePrefix(userId);

  try {
    const keys = await AsyncStorage.getAllKeys();
    const profileKeys = keys.filter((key) => key.startsWith(cachePrefix));

    if (profileKeys.length > 0) {
      const records = await Promise.all(
        profileKeys.map(async (key) => {
          const cached = await AsyncStorage.getItem(key);
          return cached ? (JSON.parse(cached) as PerformanceProfile) : null;
        }),
      );

      const localProfiles = records.filter((profile): profile is PerformanceProfile => profile !== null);
      if (localProfiles.length > 0) {
        return localProfiles;
      }
    }
  } catch {
    // Fall through to Supabase lookup.
  }

  if (!userId || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('performance_profiles')
      .select(
        'user_id, subject, topic, session_count, total_questions_answered, total_correct_answers, average_response_time_ms, fastest_response_time_ms, slowest_response_time_ms, accuracy_score, confidence_score, fluency_score, fluency_level, updated_at',
      )
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      logSupabaseError('performance_profiles', 'select', error);
      return [];
    }

    const profiles = (data ?? []) as PerformanceProfile[];
    for (const profile of profiles) {
      try {
        await AsyncStorage.setItem(performanceCacheKey(userId, profile.subject, profile.topic), JSON.stringify(profile));
      } catch {
        // Cache is best-effort.
      }
    }
    return profiles;
  } catch {
    return [];
  }
};

const loadCachedProfile = async (
  userId: string | undefined,
  subject: string,
  topic: string,
): Promise<PerformanceProfile | null> => {
  const key = performanceCacheKey(userId, subject, topic);

  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached) as PerformanceProfile;
    }
  } catch {
    // Fall through to Supabase lookup.
  }

  if (!userId || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('performance_profiles')
      .select(
        'user_id, subject, topic, session_count, total_questions_answered, total_correct_answers, average_response_time_ms, fastest_response_time_ms, slowest_response_time_ms, accuracy_score, confidence_score, fluency_score, fluency_level, updated_at',
      )
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('topic', topic)
      .maybeSingle();

    if (error) {
      logSupabaseError('performance_profiles', 'select', error);
      return null;
    }

    if (data) {
      const profile = data as PerformanceProfile;
      await AsyncStorage.setItem(key, JSON.stringify(profile));
      return profile;
    }
  } catch {
    // Offline or unavailable database, local cache remains the source of truth.
  }

  return null;
};

const buildStoredProfile = (
  input: PerformanceSessionInput,
  session: PerformanceSessionSummary,
  previousProfile: PerformanceProfile | null,
): PerformanceProfile => {
  const previousQuestionsAnswered = previousProfile?.total_questions_answered ?? 0;
  const previousCorrectAnswers = previousProfile?.total_correct_answers ?? 0;
  const previousAverageResponseTimeMs = previousProfile?.average_response_time_ms ?? 0;
  const previousFastestResponseTimeMs = previousProfile?.fastest_response_time_ms ?? session.fastest_response_time_ms;
  const previousSlowestResponseTimeMs = previousProfile?.slowest_response_time_ms ?? session.slowest_response_time_ms;
  const sessionQuestionsAnswered = input.totalQuestions;
  const totalQuestionsAnswered = previousQuestionsAnswered + sessionQuestionsAnswered;
  const totalCorrectAnswers = previousCorrectAnswers + input.correctAnswers;
  const weightedAverageResponseTimeMs = totalQuestionsAnswered > 0
    ? Math.round(
        ((previousAverageResponseTimeMs * previousQuestionsAnswered) + (session.average_response_time_ms * sessionQuestionsAnswered))
          / totalQuestionsAnswered,
      )
    : session.average_response_time_ms;
  const accuracyScore = totalQuestionsAnswered > 0
    ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
    : session.accuracy_score;
  const confidenceScore = calculateConfidenceScore(accuracyScore, weightedAverageResponseTimeMs);
  const fluencyScore = confidenceScore;

  return {
    user_id: input.userId,
    subject: input.subject,
    topic: input.topic,
    session_count: (previousProfile?.session_count ?? 0) + 1,
    total_questions_answered: totalQuestionsAnswered,
    total_correct_answers: totalCorrectAnswers,
    average_response_time_ms: weightedAverageResponseTimeMs,
    fastest_response_time_ms: previousProfile ? Math.min(previousFastestResponseTimeMs, session.fastest_response_time_ms) : session.fastest_response_time_ms,
    slowest_response_time_ms: previousProfile ? Math.max(previousSlowestResponseTimeMs, session.slowest_response_time_ms) : session.slowest_response_time_ms,
    accuracy_score: accuracyScore,
    confidence_score: confidenceScore,
    fluency_score: fluencyScore,
    fluency_level: getFluencyLevel(fluencyScore),
    updated_at: new Date().toISOString(),
  };
};

const persistProfile = async (profile: PerformanceProfile): Promise<void> => {
  const key = performanceCacheKey(profile.user_id, profile.subject, profile.topic);

  try {
    await AsyncStorage.setItem(key, JSON.stringify(profile));
  } catch {
    // Offline persistence is best-effort.
  }

  if (!profile.user_id || !supabase) {
    return;
  }

  try {
    const { error } = await supabase.from('performance_profiles').upsert(
      {
        user_id: profile.user_id,
        subject: profile.subject,
        topic: profile.topic,
        session_count: profile.session_count,
        total_questions_answered: profile.total_questions_answered,
        total_correct_answers: profile.total_correct_answers,
        average_response_time_ms: profile.average_response_time_ms,
        fastest_response_time_ms: profile.fastest_response_time_ms,
        slowest_response_time_ms: profile.slowest_response_time_ms,
        accuracy_score: profile.accuracy_score,
        confidence_score: profile.confidence_score,
        fluency_score: profile.fluency_score,
        fluency_level: profile.fluency_level,
        updated_at: profile.updated_at,
      },
      { onConflict: 'user_id, subject, topic' },
    );

    if (error) {
      logSupabaseError('performance_profiles', 'upsert', error);
    }
  } catch {
    // Never throw from persistence helpers.
  }
};

const trackPerformanceEvents = (
  input: PerformanceSessionInput,
  session: PerformanceSessionSummary,
  profile: PerformanceProfile,
  previousProfile: PerformanceProfile | null,
): void => {
  track('performance_profile_updated', {
    user_id: input.userId,
    subject: input.subject,
    topic: input.topic,
    session_accuracy_score: session.accuracy_score,
    session_average_response_time_ms: session.average_response_time_ms,
    session_fastest_response_time_ms: session.fastest_response_time_ms,
    session_slowest_response_time_ms: session.slowest_response_time_ms,
    accuracy_score: profile.accuracy_score,
    average_response_time_ms: profile.average_response_time_ms,
    fastest_response_time_ms: profile.fastest_response_time_ms,
    slowest_response_time_ms: profile.slowest_response_time_ms,
    confidence_score: profile.confidence_score,
    fluency_score: profile.fluency_score,
    fluency_level: profile.fluency_level,
    session_count: profile.session_count,
  });

  if (previousProfile?.fluency_level !== profile.fluency_level) {
    track('fluency_level_changed', {
      user_id: input.userId,
      subject: input.subject,
      topic: input.topic,
      previous_fluency_level: previousProfile?.fluency_level ?? 'none',
      fluency_level: profile.fluency_level,
      confidence_score: profile.confidence_score,
      fluency_score: profile.fluency_score,
    });
  }
};

export const recordPerformanceSession = async (
  input: PerformanceSessionInput,
): Promise<RecordedPerformanceProfile> => {
  const session = buildPerformanceSessionSummary(input);
  const previousProfile = await loadCachedProfile(input.userId, input.subject, input.topic);
  const profile = buildStoredProfile(input, session, previousProfile);

  trackPerformanceEvents(input, session, profile, previousProfile);
  await persistProfile(profile);
  const trend = await recordLearningTrendSnapshot(input, session, profile);

  return {
    session,
    previousProfile,
    profile,
    fluencyLevelChanged: previousProfile?.fluency_level !== profile.fluency_level,
    trendSnapshot: trend.snapshot,
    trendOverview: trend.overview,
  };
};
