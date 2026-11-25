// Single canonical projection from any subject journey to learner-facing state.
// Math and Physics both pass through this selector; no subject-specific logic lives here.

import {
  projectCanonicalLearnerState,
  type CanonicalLearnerState,
  type CanonicalLearningEvidenceSummary,
} from './canonicalLearnerState';
import type { JourneyState } from './subjectJourney';

export interface CanonicalJourneyInput {
  learnerId: string | null;
  subjectId: string;
  journey: JourneyState;
  evidence: CanonicalLearningEvidenceSummary[];
  pendingSyncCount: number;
  stateVersion?: number;
}

export function projectJourneyCanonicalState(input: CanonicalJourneyInput): CanonicalLearnerState {
  const { learnerId: l, subjectId: s, journey: j, evidence: e, pendingSyncCount: p, stateVersion: v } = input;
  return projectCanonicalLearnerState({
    learnerId: l,
    subjectId: s,
    targetSkill: j.targetSkill,
    strengths: j.strengths,
    gaps: j.gaps,
    untested: j.untested,
    missingPrerequisites: j.missingPrereqs,
    recommendationAction: j.recommendation.action,
    recommendationReason: j.recommendation.reason,
    masteryConfidence: j.masteryConfidence,
    reviewDue: j.reviewDue,
    evidence: e,
    pendingSyncCount: p,
    stateVersion: v,
  });
}
