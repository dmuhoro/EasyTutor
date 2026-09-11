// lib/weaknessPredictionEngine.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { logSupabaseError } from './supabaseOps';
import { getSubjectMastery, MasteryRecord } from './mastery';
import { getAllPerformanceProfiles, PerformanceProfile } from './performanceEngine';
import { getLearningTrendOverview, type LearningTrendSnapshot } from './trendEngine';
import { getRetentionStore, RetentionProfile } from './spacedRepetitionEngine';

/**
 * Weakness prediction signal for a specific topic.
 */
export type WeaknessPrediction = {
  topicId: string;
  subjectId: string;
  riskScore: number; // 0-100
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0-100 how confident the prediction is
  reason: string;
  intervention: string;
};

/** Helper to map risk score to severity */
function mapSeverity(score: number): WeaknessPrediction['severity'] {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

/** Simple risk scoring based on declines and retention */
export function calculateRiskScore(params: {
  masteryDecline: boolean;
  confidenceDecline: boolean;
  retentionFailure: boolean;
  stagnation: boolean;
}): number {
  let score = 0;
  if (params.masteryDecline) score += 30;
  if (params.confidenceDecline) score += 25;
  if (params.retentionFailure) score += 20;
  if (params.stagnation) score += 25;
  return Math.min(100, score);
}

/** Detect whether mastery is declining based on recent vs older mastery */
export function detectDecline(masteries: MasteryRecord[]): boolean {
  if (masteries.length < 2) return false;
  const sorted = masteries.sort((a, b) => new Date(a.updated_at ?? 0).getTime() - new Date(b.updated_at ?? 0).getTime());
  const latest = sorted[sorted.length - 1].mastery_percent;
  const previous = sorted[sorted.length - 2].mastery_percent;
  return latest < previous - 5; // drop more than 5%
}

/** Detect confidence decline using performance profiles */
export function detectConfidenceDecline(perfs: PerformanceProfile[]): boolean {
  if (perfs.length < 2) return false;
  const sorted = perfs.sort((a, b) => new Date(a.updated_at ?? 0).getTime() - new Date(b.updated_at ?? 0).getTime());
  const latest = sorted[sorted.length - 1].confidence_score;
  const previous = sorted[sorted.length - 2].confidence_score;
  return latest < previous - 5;
}

/** Detect retention failure: low retentionScore and approaching nextReviewDate */
export function detectKnowledgeDecay(retentions: RetentionProfile[]): boolean {
  if (retentions.length === 0) return false;
  // take the most recent retention (by nextReviewDate)
  const latest = retentions.reduce((a, b) => (new Date(a.nextReviewDate) > new Date(b.nextReviewDate) ? a : b));
  const daysUntil = (new Date(latest.nextReviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return latest.retentionScore < 50 && daysUntil <= 3;
}

/** Detect stagnation from trend snapshots */
export function detectStagnation(trend: LearningTrendSnapshot | null): boolean {
  if (!trend) return false;
  // simple heuristic: if accuracy has not improved >2% over last 3 snapshots
  // assuming trend snapshots are ordered newest first in API
  // here we just check if accuracy_score is flat
  return trend.accuracy_score < 70 && trend.session_count < 5;
}

/** Generate a human‑readable intervention suggestion */
export function generateIntervention(prediction: WeaknessPrediction): string {
  switch (prediction.severity) {
    case 'CRITICAL':
      return 'Schedule intensive review session and provide targeted remediation content.';
    case 'HIGH':
      return 'Add extra practice questions and monitor progress closely.';
    case 'MEDIUM':
      return 'Include spaced review in next study plan.';
    case 'LOW':
    default:
      return 'Continue regular practice; no immediate action required.';
  }
}

/** Main entry point: predict weaknesses for a given user */
export async function predictWeaknesses(userId: string): Promise<WeaknessPrediction[]> {
  // Fetch data from various stores (subject‑level aggregation)
  const [masteryRecords, performanceProfiles, trendOverview, retentionStore] = await Promise.all([
    getSubjectMastery(userId, ''), // empty subject to get all? We'll filter later
    getAllPerformanceProfiles(userId),
    getLearningTrendOverview(userId),
    getRetentionStore(userId),
  ]);

  // Helper to group by topicId
  const topics = new Map<string, { subjectId: string; mastery: MasteryRecord[]; perf: PerformanceProfile[]; retention: RetentionProfile[] }>();

  // Mastery records contain subject, topic
  for (const m of (masteryRecords ?? [])) {
    const key = `${m.subject}:${m.topic}`;
    if (!topics.has(key)) topics.set(key, { subjectId: m.subject, mastery: [], perf: [], retention: [] });
    topics.get(key)!.mastery.push(m as any);
  }
  // Performance profiles also contain subject, topic
  for (const p of (performanceProfiles ?? [])) {
    const key = `${p.subject}:${p.topic}`;
    if (!topics.has(key)) topics.set(key, { subjectId: p.subject, mastery: [], perf: [], retention: [] });
    topics.get(key)!.perf.push(p);
  }
  // Retention profiles have id; we assume id encodes subject/topic – for demo we match by id prefix
  const allRetention = (await retentionStore.fetchAll()) ?? [];
  for (const r of allRetention) {
    // naive matching: assume r.id format "${subjectId}:${topicId}" or includes topicId
    const parts = r.id.split(':');
    if (parts.length >= 2) {
      const subjectId = parts[0];
      const topicId = parts[1];
      const key = `${subjectId}:${topicId}`;
      if (!topics.has(key)) topics.set(key, { subjectId, mastery: [], perf: [], retention: [] });
      topics.get(key)!.retention.push(r);
    }
  }

  const predictions: WeaknessPrediction[] = [];
  for (const [key, data] of topics.entries()) {
    const [subjectId, topicId] = key.split(':');
    const masteryDecline = detectDecline(data.mastery);
    const confidenceDecline = detectConfidenceDecline(data.perf);
    const retentionFailure = detectKnowledgeDecay(data.retention);
    const stagnation = detectStagnation(trendOverview.latest_snapshot ?? null);
    const riskScore = calculateRiskScore({ masteryDecline, confidenceDecline, retentionFailure, stagnation });
    const severity = mapSeverity(riskScore);
    const confidence = 90; // placeholder confidence
    const reasons: string[] = [];
    if (masteryDecline) reasons.push('mastery decline');
    if (confidenceDecline) reasons.push('confidence drop');
    if (retentionFailure) reasons.push('knowledge decay imminent');
    if (stagnation) reasons.push('stagnant progress');
    const reason = reasons.length ? `Detected ${reasons.join(', ')}` : 'No immediate risk detected';
    const base: WeaknessPrediction = {
      topicId,
      subjectId,
      riskScore,
      severity,
      confidence,
      reason,
      intervention: '', // will fill next
    };
    base.intervention = generateIntervention(base);
    if (riskScore > 0) predictions.push(base);
  }
  return predictions;
}

/** Persistence store for weakness predictions */
export type WeaknessPredictionStore = {
  fetchAll: () => Promise<WeaknessPrediction[]>;
  save: (p: WeaknessPrediction) => Promise<void>;
};

const WEAKNESS_CACHE_PREFIX = 'weakness_prediction_cache_v1';

export const getWeaknessPredictionStore = (userId: string | undefined): WeaknessPredictionStore => ({
  fetchAll: async () => {
    const prefix = `${WEAKNESS_CACHE_PREFIX}:${userId ?? 'anon'}:`;
    try {
      const keys = await AsyncStorage.getAllKeys();
      const wKeys = keys.filter(k => k.startsWith(prefix));
      const records = await Promise.all(wKeys.map(k => AsyncStorage.getItem(k)));
      const local = records
        .map(r => (r ? (JSON.parse(r) as WeaknessPrediction) : null))
        .filter((p): p is WeaknessPrediction => p !== null);
      if (local.length > 0) return local;
    } catch { /* best-effort: fall through to fallback */ }
    if (!userId) return [];
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('learning_risk_predictions')
        .select('*')
        .eq('user_id', userId);
      if (error) { logSupabaseError('learning_risk_predictions', 'select', error); return []; }
      const db = (data ?? []) as WeaknessPrediction[];
      for (const p of db) {
        const key = `${WEAKNESS_CACHE_PREFIX}:${userId}:${p.topicId}`;
        await AsyncStorage.setItem(key, JSON.stringify(p));
      }
      return db;
    } catch (e) { console.error(e); return []; }
  },
  save: async (prediction: WeaknessPrediction) => {
    const key = `${WEAKNESS_CACHE_PREFIX}:${userId ?? 'anon'}:${prediction.topicId}`;
    try { await AsyncStorage.setItem(key, JSON.stringify(prediction)); } catch { /* best-effort: fall through to fallback */ }
    if (!userId) return;
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('learning_risk_predictions')
        .upsert(prediction as any, { onConflict: 'topicId' });
      if (error) logSupabaseError('learning_risk_predictions', 'upsert', error);
    } catch { /* best-effort: fall through to fallback */ }
  },
});

// End of Weakness Prediction Engine
