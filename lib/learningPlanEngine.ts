// lib/learningPlanEngine.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { logSupabaseError } from './supabaseOps';
import { getSubjectMastery, MasteryRecord } from './mastery';
import { getAllPerformanceProfiles, PerformanceProfile } from './performanceEngine';
import { getLearningTrendOverview, type LearningTrendSnapshot } from './trendEngine';
import { getRetentionStore, RetentionProfile } from './spacedRepetitionEngine';
import { predictWeaknesses, WeaknessPrediction } from './weaknessPredictionEngine';
import { generateInterventions, rankNextBestActions } from './interventionEngine';
import { buildPortalScopedQuery } from '../src/infrastructure/database/governedQueries';
import { executeGovernedWrite } from '../src/infrastructure/database/governedWrites';
import { portalFromMode } from '../store/roadmapStore';
import { useRoadmapStore } from '../store/roadmapStore';

/** Core plan types */
export interface DailyLearningTask {
  topicId: string;
  subjectId: string;
  action: string; // human readable description
  estimatedDurationMins: number;
  priorityScore: number; // 0-100
  rationale: string;
}

export interface WeeklyLearningPlan {
  weekStart: string; // ISO date
  tasks: DailyLearningTask[];
  totalEstimatedMinutes: number;
  expectedImprovement: number; // % increase in overall mastery estimate
  overallRationale: string;
}

export interface StudyPriority {
  focusArea: string; // e.g., "Mastery", "Confidence", "Retention"
  weight: number; // 0-100 higher = more emphasis
  rationale: string;
}

export interface RecoveryPlan {
  topicsNeedingRecovery: string[]; // topic IDs
  recommendedActivities: string[]; // e.g., "light review", "spaced repetition"
  estimatedTimeMins: number;
}

export interface ReinforcementPlan {
  topicsToReinforce: string[];
  activities: string[];
  totalTimeMins: number;
}

export interface LearningPlan {
  dailyTasks: DailyLearningTask[];
  weeklyPlan: WeeklyLearningPlan;
  studyPriorities: StudyPriority[];
  recoveryPlan?: RecoveryPlan;
  reinforcementPlan?: ReinforcementPlan;
}

/** Generate a full learning plan for a user */
export async function generateLearningPlan(userId: string): Promise<LearningPlan> {
  // Gather all needed signals
  const [mastery, performance, trend, weakness, retentionStore] = await Promise.all([
    getSubjectMastery(userId, ''),
    getAllPerformanceProfiles(userId),
    getLearningTrendOverview(userId),
    predictWeaknesses(userId),
    getRetentionStore(userId),
  ]);

  const retentions = await retentionStore.fetchAll();

  // 1️⃣ Generate interventions (already ranked)
  const rawInterventions = generateInterventions({
    mastery,
    performance,
    retention: retentions,
    trend: trend.latest_snapshot ?? null,
    weakness,
  });
  const topInterventions = rankNextBestActions(rawInterventions);

  // 2️⃣ Map top interventions to daily tasks
  const dailyTasks: DailyLearningTask[] = topInterventions.map((i, idx) => ({
    topicId: i.topicId,
    subjectId: i.subjectId,
    action: i.type.replace('_', ' '),
    estimatedDurationMins: Math.max(10, Math.round(i.estimatedImprovement * 0.5)),
    priorityScore: i.priorityScore,
    rationale: i.rationale,
  }));

  // 3️⃣ Compute weekly aggregation
  const totalEstimatedMinutes = dailyTasks.reduce((s, t) => s + t.estimatedDurationMins, 0);
  const expectedImprovement = dailyTasks.reduce((s, t) => s + t.priorityScore, 0) / dailyTasks.length || 0;
  const weeklyPlan: WeeklyLearningPlan = {
    weekStart: new Date().toISOString().split('T')[0],
    tasks: dailyTasks,
    totalEstimatedMinutes,
    expectedImprovement: Math.round(expectedImprovement),
    overallRationale: 'Combined interventions aim to address highest‑risk topics and improve mastery efficiently.',
  };

  // 4️⃣ Study priorities – simple heuristic based on risk distribution
  const studyPriorities: StudyPriority[] = [
    { focusArea: 'Mastery', weight: 40, rationale: 'Core knowledge gaps' },
    { focusArea: 'Confidence', weight: 30, rationale: 'Low confidence scores' },
    { focusArea: 'Retention', weight: 30, rationale: 'Upcoming review windows' },
  ];

  // 5️⃣ Recovery & reinforcement – placeholder based on weakness severity
  const highRisk = weakness.filter(w => w.severity === 'CRITICAL' || w.severity === 'HIGH');
  const recoveryPlan: RecoveryPlan | undefined = highRisk.length
    ? {
        topicsNeedingRecovery: highRisk.map(w => w.topicId),
        recommendedActivities: ['targeted remediation', 'active recall'],
        estimatedTimeMins: highRisk.length * 20,
      }
    : undefined;

  const reinforcementPlan: ReinforcementPlan | undefined = weakness.length
    ? {
        topicsToReinforce: weakness.map(w => w.topicId),
        activities: ['spaced repetition', 'mixed‑topic reinforcement'],
        totalTimeMins: weakness.length * 15,
      }
    : undefined;

  return {
    dailyTasks,
    weeklyPlan,
    studyPriorities,
    recoveryPlan,
    reinforcementPlan,
  };
}

/** Persistence for learning plans */
export type LearningPlanStore = {
  fetchAll: () => Promise<LearningPlan[]>;
  save: (plan: LearningPlan) => Promise<void>;
};

const PLAN_CACHE_PREFIX = 'learning_plan_cache_v1';

export const getLearningPlanStore = (userId: string | undefined): LearningPlanStore => ({
  fetchAll: async () => {
    const prefix = `${PLAN_CACHE_PREFIX}:${userId ?? 'anon'}:`;
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pKeys = keys.filter(k => k.startsWith(prefix));
      const records = await Promise.all(pKeys.map(k => AsyncStorage.getItem(k)));
      const local = records.map(r => (r ? (JSON.parse(r) as LearningPlan) : null)).filter((p): p is LearningPlan => p !== null);
      if (local.length) return local;
    } catch { /* best-effort: fall through to fallback */ }
    if (!userId) return [];
    if (!supabase) return [];
    try {
      const { data, error } = await buildPortalScopedQuery(supabase, {
        table: 'learning_plans',
        columns: '*',
        portalType: portalFromMode(useRoadmapStore.getState().learningMode ?? 'high_school'),
        userId
      });
      if (error) { logSupabaseError('learning_plans', 'select', error); return []; }
      const db = (data ?? []) as unknown as LearningPlan[];
      for (const lp of db) {
        const key = `${PLAN_CACHE_PREFIX}:${userId}:${lp.weeklyPlan.weekStart}`;
        await AsyncStorage.setItem(key, JSON.stringify(lp));
      }
      return db;
    } catch { return []; }
  },
  save: async (plan: LearningPlan) => {
    const key = `${PLAN_CACHE_PREFIX}:${userId ?? 'anon'}:${plan.weeklyPlan.weekStart}`;
    try { await AsyncStorage.setItem(key, JSON.stringify(plan)); } catch { /* best-effort: fall through to fallback */ }
    if (!userId) return;
    if (!supabase) return;
    try {
      await executeGovernedWrite(supabase, {
        table: 'learning_plans',
        portalType: portalFromMode(useRoadmapStore.getState().learningMode ?? 'high_school'),
        userId,
        action: 'upsert',
        matchFields: { user_id: userId, week_start: plan.weeklyPlan.weekStart },
        payload: {
          user_id: userId,
          week_start: plan.weeklyPlan.weekStart,
          ...plan
        }
      });
    } catch (error) {
      logSupabaseError('learning_plans', 'upsert', error);
    }
  },
});

/** Main entry – compute and persist learning plan for a user */
export async function computeAndPersistLearningPlan(userId: string): Promise<LearningPlan> {
  const plan = await generateLearningPlan(userId);
  const store = getLearningPlanStore(userId);
  await store.save(plan);
  return plan;
}
