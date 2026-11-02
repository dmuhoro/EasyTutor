// Canonical, subject-independent learner-state projection.
// Higher-level runtime may persist and sync underlying records; this projection
// derives user-facing progress/truth from validated journey and evidence inputs.

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
