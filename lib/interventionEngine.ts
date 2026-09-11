// lib/interventionEngine.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { logSupabaseError } from './supabaseOps';
import { getSubjectMastery, MasteryRecord } from './mastery';
import { getAllPerformanceProfiles, PerformanceProfile } from './performanceEngine';
import { getLearningTrendOverview, type LearningTrendSnapshot } from './trendEngine';
import { getRetentionStore, RetentionProfile } from './spacedRepetitionEngine';
import { predictWeaknesses, WeaknessPrediction } from './weaknessPredictionEngine';

/** Types of actionable interventions */
export type InterventionType =
  | 'review_topic'
  | 'active_recall'
  | 'spaced_repetition'
  | 'teach_back'
  | 'confidence_rebuild'
  | 'practice_questions'
  | 'mixed_topic_reinforcement'
  | 'targeted_remediation';

/** Core intervention object */
export interface Intervention {
  topicId: string;
  subjectId: string;
  type: InterventionType;
  priorityScore: number; // 0-100 higher = more urgent
  plan: string; // short human‑readable plan
  expectedOutcome: string;
  estimatedImprovement: number; // % increase in mastery estimate
  rationale: string;
}

/** Helper to generate raw interventions based on raw signals */
export function generateInterventions(params: {
  mastery: MasteryRecord[];
  performance: PerformanceProfile[];
  retention: RetentionProfile[];
  trend: LearningTrendSnapshot | null;
  weakness: WeaknessPrediction[];
}): Intervention[] {
  // Very simple heuristic: map each weakness to an intervention type
  const interventions: Intervention[] = [];
  for (const w of params.weakness) {
    let type: InterventionType;
    if (w.severity === 'CRITICAL') type = 'targeted_remediation';
    else if (w.severity === 'HIGH') type = 'review_topic';
    else if (w.severity === 'MEDIUM') type = 'mixed_topic_reinforcement';
    else type = 'practice_questions';

    interventions.push({
      topicId: w.topicId,
      subjectId: w.subjectId,
      type,
      priorityScore: w.riskScore,
      plan: `Execute a ${type.replace('_', ' ')} for ${w.topicId}`,
      expectedOutcome: `Improved mastery and reduced risk`,
      estimatedImprovement: w.riskScore * 0.4, // rough estimate
      rationale: w.reason,
    });
  }
  return interventions;
}

/** Prioritize interventions – higher priorityScore first, break ties with estimatedImprovement */
export function prioritizeInterventions(candidates: Intervention[]): Intervention[] {
  return candidates.slice().sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return b.estimatedImprovement - a.estimatedImprovement;
  });
}

/** Estimate learning impact – placeholder linear scaling */
export function estimateLearningImpact(intervention: Intervention): number {
  // Simple model: impact proportional to priorityScore and type weight
  const typeWeight: Record<InterventionType, number> = {
    review_topic: 1,
    active_recall: 1.1,
    spaced_repetition: 1.2,
    teach_back: 1.3,
    confidence_rebuild: 1.1,
    practice_questions: 0.9,
    mixed_topic_reinforcement: 1.0,
    targeted_remediation: 1.4,
  };
  return Math.round(intervention.priorityScore * typeWeight[intervention.type]);
}

/** Build a concrete action plan string */
export function buildActionPlan(intervention: Intervention): string {
  return `\n---\n**Intervention:** ${intervention.type.replace('_', ' ')}\n**Topic:** ${intervention.topicId}\n**Plan:** ${intervention.plan}\n**Expected outcome:** ${intervention.expectedOutcome}\n**Estimated improvement:** ${intervention.estimatedImprovement}%\n**Rationale:** ${intervention.rationale}\n---\n`;
}

/** Rank next best actions – returns top N */
export function rankNextBestActions(interventions: Intervention[], topN: number = 3): Intervention[] {
  const prioritized = prioritizeInterventions(interventions);
  return prioritized.slice(0, topN);
}

/** Persistence store for interventions */
export type InterventionStore = {
  fetchAll: () => Promise<Intervention[]>;
  save: (i: Intervention) => Promise<void>;
};

const INTERVENTION_CACHE_PREFIX = 'intervention_cache_v1';

export const getInterventionStore = (userId: string | undefined): InterventionStore => ({
  fetchAll: async () => {
    const prefix = `${INTERVENTION_CACHE_PREFIX}:${userId ?? 'anon'}:`;
    try {
      const keys = await AsyncStorage.getAllKeys();
      const iKeys = keys.filter(k => k.startsWith(prefix));
      const records = await Promise.all(iKeys.map(k => AsyncStorage.getItem(k)));
      const local = records.map(r => (r ? (JSON.parse(r) as Intervention) : null)).filter((i): i is Intervention => i !== null);
      if (local.length) return local;
    } catch { /* best-effort: fall through to fallback */ }
    if (!userId) return [];
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.from('learning_interventions').select('*').eq('user_id', userId);
      if (error) { logSupabaseError('learning_interventions', 'select', error); return []; }
      const db = (data ?? []) as Intervention[];
      for (const i of db) {
        const key = `${INTERVENTION_CACHE_PREFIX}:${userId}:${i.topicId}`;
        await AsyncStorage.setItem(key, JSON.stringify(i));
      }
      return db;
    } catch { return []; }
  },
  save: async (intervention: Intervention) => {
    const key = `${INTERVENTION_CACHE_PREFIX}:${userId ?? 'anon'}:${intervention.topicId}`;
    try { await AsyncStorage.setItem(key, JSON.stringify(intervention)); } catch { /* best-effort: fall through to fallback */ }
    if (!userId) return;
    if (!supabase) return;
    try {
      const { error } = await supabase.from('learning_interventions').upsert(intervention as any, { onConflict: 'topicId' });
      if (error) logSupabaseError('learning_interventions', 'upsert', error);
    } catch { /* best-effort: fall through to fallback */ }
  },
});

/** Main entry – compute next best actions for a user */
export async function computeNextBestActions(userId: string): Promise<Intervention[]> {
  const [mastery, performance, trend, weakness, retentionStore] = await Promise.all([
    getSubjectMastery(userId, ''),
    getAllPerformanceProfiles(userId),
    getLearningTrendOverview(userId),
    predictWeaknesses(userId),
    getRetentionStore(userId),
  ]);

  const retentions = await retentionStore.fetchAll();

  const rawInterventions = generateInterventions({
    mastery,
    performance,
    retention: retentions,
    trend: trend.latest_snapshot ?? null,
    weakness,
  });

  const top = rankNextBestActions(rawInterventions, 3);

  // Persist them
  const store = getInterventionStore(userId);
  for (const i of top) await store.save(i);

  return top;
}
