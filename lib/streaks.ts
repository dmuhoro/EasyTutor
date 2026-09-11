import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from './analytics';
import { getSubjectMastery, MasteryRecord } from './mastery';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string; // ISO date string (YYYY-MM-DD)
}

export type MomentumCategory = 'Starting' | 'Building' | 'Consistent' | 'Elite';

export interface MomentumScore {
  score: number;        // 0-100
  category: MomentumCategory;
  streak: number;
  masteryGrowth: number;   // average mastery % across all subjects
  practiceFrequency: number; // sessions in last 7 days
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STREAK_CACHE_KEY = 'learning_streak';
const PRACTICE_LOG_KEY = 'practice_log'; // timestamps of completed sessions

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns an ISO date string (YYYY-MM-DD) for a given Date. */
const toDateString = (d: Date): string => d.toISOString().split('T')[0];

/** Checks whether two date strings represent consecutive calendar days. */
const isConsecutiveDay = (prev: string, curr: string): boolean => {
  const prevDate = new Date(prev + 'T00:00:00Z');
  const currDate = new Date(curr + 'T00:00:00Z');
  const diffMs = currDate.getTime() - prevDate.getTime();
  return diffMs === 86_400_000; // exactly 1 day
};

/** Checks whether two date strings represent the same calendar day. */
const isSameDay = (a: string, b: string): boolean => a === b;

/** True if streak is still alive (activity today or yesterday). */
const isStreakAlive = (lastActivityDate: string, today: string): boolean => {
  if (!lastActivityDate) return false;
  if (isSameDay(lastActivityDate, today)) return true;
  return isConsecutiveDay(lastActivityDate, today);
};

// ─────────────────────────────────────────────────────────────────────────────
// Streak Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads the current streak data from offline cache.
 * Returns a default zero-state if nothing is cached.
 */
export const getStreakData = async (): Promise<StreakData> => {
  try {
    const raw = await AsyncStorage.getItem(STREAK_CACHE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as StreakData;
      const today = toDateString(new Date());
      // Missing ≥1 day without activity breaks the visible streak until next quiz.
      if (data.last_activity_date && !isStreakAlive(data.last_activity_date, today)) {
        return { ...data, current_streak: 0 };
      }
      return data;
    }
  } catch { /* best-effort: fall through to fallback */ }
  return { current_streak: 0, longest_streak: 0, last_activity_date: '' };
};

/**
 * Updates the streak after a completed practice session.
 * Rules:
 *  - Same day activity does NOT increment twice.
 *  - Consecutive day increments the current streak.
 *  - Missing ≥ 1 day resets to 1.
 */
export const updateStreak = async (): Promise<StreakData> => {
  const today = toDateString(new Date());
  let data = await getStreakData();

  // Same day — no increment
  if (isSameDay(data.last_activity_date, today)) {
    return data;
  }

  if (isConsecutiveDay(data.last_activity_date, today)) {
    // Consecutive day — increment
    data.current_streak += 1;
  } else {
    // Gap detected (or first activity ever) — reset to 1
    data.current_streak = 1;
  }

  // Update longest
  if (data.current_streak > data.longest_streak) {
    data.longest_streak = data.current_streak;
  }

  data.last_activity_date = today;

  // Persist
  await AsyncStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(data));

  // Analytics
  track('streak_updated', {
    current_streak: data.current_streak,
    longest_streak: data.longest_streak,
  });

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Practice Frequency Log
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logs a practice session timestamp for frequency tracking.
 * Keeps only the last 30 entries to bound storage usage.
 */
export const logPracticeTimestamp = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(PRACTICE_LOG_KEY);
    const log: string[] = raw ? JSON.parse(raw) : [];
    log.push(new Date().toISOString());
    // Keep last 30
    const trimmed = log.slice(-30);
    await AsyncStorage.setItem(PRACTICE_LOG_KEY, JSON.stringify(trimmed));
  } catch { /* best-effort: fall through to fallback */ }
};

/**
 * Returns the number of practice sessions completed in the last N days.
 */
export const getPracticeFrequency = async (days: number = 7): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(PRACTICE_LOG_KEY);
    if (!raw) return 0;
    const log: string[] = JSON.parse(raw);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return log.filter(ts => new Date(ts) >= cutoff).length;
  } catch {
    return 0;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Momentum Score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Categorises a 0-100 momentum score.
 */
export const getMomentumCategory = (score: number): MomentumCategory => {
  if (score <= 25) return 'Starting';
  if (score <= 50) return 'Building';
  if (score <= 75) return 'Consistent';
  return 'Elite';
};

/**
 * Computes a 0-100 Learning Momentum score.
 *
 * Weights:
 *   - Streak       (40%): capped at 30-day streak ⇒ 40 pts
 *   - Mastery growth (30%): average mastery % ⇒ 30 pts
 *   - Practice freq (30%): sessions in last 7 days, capped at 14 ⇒ 30 pts
 */
export const computeMomentum = async (
  userId: string | undefined,
): Promise<MomentumScore> => {
  // 1. Streak component (effective streak accounts for broken days)
  const streakData = await getStreakData();
  const streakScore = Math.min(streakData.current_streak / 30, 1) * 40;

  // 2. Mastery growth component — average mastery across all subjects
  const subjects = ['Mathematics', 'Biology', 'Physics', 'Chemistry'];
  let totalMastery = 0;
  let recordCount = 0;
  for (const subject of subjects) {
    const records = await getSubjectMastery(userId, subject);
    for (const r of records) {
      totalMastery += r.mastery_percent;
      recordCount += 1;
    }
  }
  const avgMastery = recordCount > 0 ? totalMastery / recordCount : 0;
  const masteryScore = (avgMastery / 100) * 30;

  // 3. Practice frequency component
  const freq = await getPracticeFrequency(7);
  const freqScore = Math.min(freq / 14, 1) * 30;

  // Total
  const raw = Math.round(streakScore + masteryScore + freqScore);
  const score = Math.max(0, Math.min(100, raw));
  const category = getMomentumCategory(score);

  // Analytics
  track('momentum_score_updated', {
    score,
    category,
    streak: streakData.current_streak,
    mastery_growth: Math.round(avgMastery),
    practice_frequency: freq,
  });

  return {
    score,
    category,
    streak: streakData.current_streak,
    masteryGrowth: Math.round(avgMastery),
    practiceFrequency: freq,
  };
};

/**
 * Call after every completed practice session: log frequency, update streak, refresh momentum.
 */
export const recordPracticeMomentum = async (
  userId: string | undefined,
): Promise<MomentumScore> => {
  await logPracticeTimestamp();
  await updateStreak();
  return computeMomentum(userId);
};
