// Canonical, subject-independent learner-state projection.
// Higher-level runtime may persist and sync underlying records; this projection
// derives user-facing progress/truth from validated journey and evidence inputs.
// The subject-independent journey state machine lives here too, so Mathematics
// and Physics share one runtime module with no extra login-route chunk wrapper.

import { evaluateMastery } from './mastery';
import { findGaps } from './prerequisites';
import { reviewPriority } from './retention';
import type { EvidenceDimension } from './types';

export interface CanonicalLearningEvidenceSummary {
  dimension: string;
  weight: number;
  independent: boolean;
  hints: number;
}

export interface CanonicalLearnerStateInput {
  learnerId: string | null;
  subjectId: string;
  targetSkill: string | null;
  strengths: string[];
  gaps: string[];
  untested: string[];
  missingPrerequisites: string[];
  recommendationAction: string | null;
  recommendationReason: string | null;
  masteryConfidence: number;
  reviewDue: boolean;
  evidence: CanonicalLearningEvidenceSummary[];
  pendingSyncCount: number;
  stateVersion?: number;
}

export interface CanonicalLearnerState {
  learnerId: string | null;
  subjectId: string;
  targetSkill: string | null;
  strengths: readonly string[];
  gaps: readonly string[];
  untested: readonly string[];
  missingPrerequisites: readonly string[];
  recommendationAction: string | null;
  recommendationReason: string | null;
  masteryConfidence: number;
  reviewDue: boolean;
  evidenceCount: number;
  syncState: 'local' | 'pending' | 'synced';
  stateVersion: number;
}

export interface CanonicalJourneyInput {
  learnerId: string | null;
  subjectId: string;
  journey: JourneyState;
  evidence: CanonicalLearningEvidenceSummary[];
  pendingSyncCount: number;
  stateVersion?: number;
}

/** Project any subject's journey into the one canonical learner-facing state. */
export function projectJourneyCanonicalState(input: CanonicalJourneyInput): CanonicalLearnerState {
  const { journey } = input;
  return projectCanonicalLearnerState({
    learnerId: input.learnerId,
    subjectId: input.subjectId,
    targetSkill: journey.targetSkill,
    strengths: journey.strengths,
    gaps: journey.gaps,
    untested: journey.untested,
    missingPrerequisites: journey.missingPrereqs,
    recommendationAction: journey.recommendation.action,
    recommendationReason: journey.recommendation.reason,
    masteryConfidence: journey.masteryConfidence,
    reviewDue: journey.reviewDue,
    evidence: input.evidence,
    pendingSyncCount: input.pendingSyncCount,
    stateVersion: input.stateVersion,
  });
}

export function projectCanonicalLearnerState(input: CanonicalLearnerStateInput): CanonicalLearnerState {
  const syncState: CanonicalLearnerState['syncState'] =
    input.pendingSyncCount > 0 ? 'pending' : input.evidence.length > 0 ? 'synced' : 'local';

  return {
    learnerId: input.learnerId,
    subjectId: input.subjectId,
    targetSkill: input.targetSkill,
    strengths: [...input.strengths],
    gaps: [...input.gaps],
    untested: [...input.untested],
    missingPrerequisites: [...input.missingPrerequisites],
    recommendationAction: input.recommendationAction,
    recommendationReason: input.recommendationReason,
    masteryConfidence: Math.max(0, Math.min(1, input.masteryConfidence || 0)),
    reviewDue: Boolean(input.reviewDue),
    evidenceCount: input.evidence.length,
    syncState,
    stateVersion: input.stateVersion ?? 1,
  };
}

// ---------- Subject-independent journey state machine ----------

export interface JourneyEvidence {
  dimension: EvidenceDimension;
  weight: number;
  independent: boolean;
  hints: number;
}

export type JourneyAction =
  | 'learn-prerequisite' | 'guided-learning' | 'practice'
  | 'application' | 'transfer' | 'review' | 'continue';

export interface JourneyRecommendation {
  action: JourneyAction;
  skillId: string;
  reason: string;
}

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

export interface DiagnosticItemLike {
  id: string;
  skillId: string;
}

export interface DiagnosticResponseLike {
  itemId: string;
  answer: string;
  hints: number;
  independent: boolean;
}

export interface DiagnosticScore {
  strengths: string[];
  gaps: string[];
  untested: string[];
}

export interface SubjectJourneyInput<T extends DiagnosticItemLike, R extends DiagnosticResponseLike> {
  target: string;
  items: T[];
  responses: R[];
  score: (items: T[], responses: R[]) => DiagnosticScore;
  edges: readonly { from: string; to: string }[];
  evidence: JourneyEvidence[];
  now?: Date;
}

/**
 * Deterministic evidence → mastery → prerequisites → recommendation projection.
 * No subject-specific branch is allowed here: a second subject proves the same
 * state machine by supplying its own fixtures (E12).
 */
export function runSubjectJourney<T extends DiagnosticItemLike, R extends DiagnosticResponseLike>(
  input: SubjectJourneyInput<T, R>,
): JourneyState {
  const { target, items, responses, score, edges, evidence, now } = input;
  const scored = score(items, responses);
  const known = new Set<string>(scored.strengths);
  const missingPrereqs = findGaps(target, known, edges);
  const mastery = evaluateMastery(evidence);
  const review = reviewPriority({
    skillId: target,
    lastReviewedAt: null,
    confidence: mastery.confidence,
    attempts: evidence.length,
  }, now ?? new Date());

  let action: JourneyAction;
  let reason: string;
  if (missingPrereqs.length > 0) {
    action = 'learn-prerequisite';
    reason = `Prerequisite ${missingPrereqs[0]} is not yet demonstrated.`;
  } else if (mastery.level === 'not_assessed') {
    action = 'guided-learning';
    reason = 'No practice evidence yet; start guided learning.';
  } else if (mastery.confidence < 0.5) {
    action = 'practice';
    reason = 'Early evidence; more practice is needed.';
  } else if (evidence.some((item) => item.dimension === 'transfer')) {
    action = 'review';
    reason = 'Mastery evidence exists; schedule retrieval review.';
  } else {
    action = 'transfer';
    reason = 'Proficient practice evidence; attempt an unfamiliar application.';
  }
  const recommendation: JourneyRecommendation = {
    action,
    skillId: action === 'learn-prerequisite' ? missingPrereqs[0] : target,
    reason,
  };

  return {
    targetSkill: target,
    strengths: scored.strengths,
    gaps: scored.gaps,
    untested: scored.untested,
    missingPrereqs,
    recommendation,
    masteryConfidence: mastery.confidence,
    reviewDue: review.due,
  };
}
