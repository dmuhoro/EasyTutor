import { evaluateMastery } from '../learning/mastery';
import { allPrerequisites, findGaps } from '../learning/prerequisites';
import { reviewPriority } from '../learning/retention';
import type { EvidenceDimension } from '../learning/types';
import { MATH_PREREQ_EDGES } from './skillGraph';
import { MATH_DIAGNOSTIC_BANK, scoreMathDiagnostic, type MathDiagnosticResponse } from './diagnosticBank';

export interface JourneyEvidence { dimension: EvidenceDimension; weight: number; independent: boolean; hints: number; }
export type JourneyAction = 'learn-prerequisite' | 'guided-learning' | 'practice' | 'application' | 'transfer' | 'review' | 'continue';

export interface JourneyRecommendation { action: JourneyAction; skillId: string; reason: string; }

export interface JourneyState {
  targetSkill: string;
  strengths: string[];
  gaps: string[];
  untested: string[];
  missingPrereqs: string[];
  recommendation: JourneyRecommendation;
  masteryConfidence: number;
  reviewDue: boolean;
}

export function runMathJourney(
  target: string,
  diagnosticResponses: MathDiagnosticResponse[],
  masteryEvidence: JourneyEvidence[],
  now: Date = new Date(),
): JourneyState {
  const edges = MATH_PREREQ_EDGES.map(e => ({ from: e.from, to: e.to }));
  const scored = scoreMathDiagnostic(MATH_DIAGNOSTIC_BANK, diagnosticResponses);
  const known = new Set<string>(scored.strengths);
  const missingPrereqs = findGaps(target, known, edges);
  const m = evaluateMastery(masteryEvidence);
  const review = reviewPriority({ skillId: target, lastReviewedAt: null, confidence: m.confidence, attempts: masteryEvidence.length }, now);

  let recommendation: JourneyRecommendation;
  if (missingPrereqs.length > 0) {
    recommendation = { action: 'learn-prerequisite', skillId: missingPrereqs[0], reason: `Prerequisite ${missingPrereqs[0]} is not yet demonstrated.` };
  } else if (m.level === 'not_assessed') {
    recommendation = { action: 'guided-learning', skillId: target, reason: 'No practice evidence yet; start guided learning.' };
  } else if (m.confidence < 0.5) {
    recommendation = { action: 'practice', skillId: target, reason: 'Early evidence; more practice is needed.' };
  } else if (masteryEvidence.some(e => e.dimension === 'transfer')) {
    recommendation = { action: 'review', skillId: target, reason: 'Mastery evidence exists; schedule retrieval review.' };
  } else {
    recommendation = { action: 'transfer', skillId: target, reason: 'Proficient practice evidence; attempt an unfamiliar application.' };
  }

  return {
    targetSkill: target,
    strengths: scored.strengths,
    gaps: scored.gaps,
    untested: scored.untested,
    missingPrereqs,
    recommendation,
    masteryConfidence: m.confidence,
    reviewDue: review.due,
  };
}
