// Mastery evaluation from evidence (deterministic, explainable)

import { type EvidenceDimension } from './types';

export interface Evidence { dimension: EvidenceDimension; weight: number; independent: boolean; hints: number; }

export type MasteryLevel = 'not_assessed' | 'emerging' | 'developing' | 'proficient' | 'advanced';

export interface MasteryResult { level: MasteryLevel; confidence: number; reason: string; }

const DIM_WEIGHT: Record<EvidenceDimension, number> = {
  recall: 0.15, understanding: 0.2, application: 0.3, analysis: 0.35,
  reasoning: 0.4, evaluation: 0.45, creation: 0.5, transfer: 0.6, retention: 0.25,
};

export function evaluateMastery(evidence: Evidence[]): MasteryResult {
  if (evidence.length === 0) return { level: 'not_assessed', confidence: 0, reason: 'no evidence' };
  let score = 0; let indep = 0; let transfer = false;
  for (const e of evidence) {
    const base = DIM_WEIGHT[e.dimension] * e.weight;
    const hintPenalty = e.independent ? 1 : Math.max(0.3, 1 - e.hints * 0.15);
    score += base * hintPenalty;
    if (e.independent) indep++;
    if (e.dimension === 'transfer') transfer = true;
  }
  const norm = Math.min(1, score / evidence.length + (indep / evidence.length) * 0.2);
  const confidence = Math.min(1, norm);
  if (confidence < 0.25) return { level: 'emerging', confidence, reason: 'limited early evidence' };
  if (confidence < 0.5) return { level: 'developing', confidence, reason: 'partial consistent capability' };
  if (confidence < 0.6 || !transfer) return { level: 'proficient', confidence, reason: transfer ? 'consistent capability' : 'proficient but no transfer yet' };
  return { level: 'advanced', confidence, reason: 'deep/independent/transfer evidence' };
}
