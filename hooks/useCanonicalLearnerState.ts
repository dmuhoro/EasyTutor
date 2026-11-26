import { useMemo } from 'react';
import {
  projectCanonicalLearnerState,
  type CanonicalLearnerState,
  type CanonicalLearningEvidenceSummary,
} from '../src/domain/learning/canonicalLearnerState';
import { evaluateMastery } from '../src/domain/learning/mastery';
import { useAuthStore } from '../store/authStore';
import { useProgressStore } from '../store/progressStore';
import { useRoadmapStore } from '../store/roadmapStore';

interface ScreenRoadmap {
  id: string;
  topic: string;
  subjectId?: string;
  createdAt: string;
  lastOpenedAt?: string;
}

interface ScreenScore {
  score: number;
  total: number;
}

export interface ScreenCanonicalInput {
  learnerId: string | null;
  subjectId: string;
  targetSkill: string | null;
  strengths: string[];
  gaps: string[];
  scores: readonly ScreenScore[];
  pendingSyncCount: number;
}

/** Most recently opened plan, with creation time as the deterministic tiebreak. */
export function selectActiveRoadmap(
  roadmaps: readonly ScreenRoadmap[],
): ScreenRoadmap | null {
  return [...roadmaps].sort(
    (a, b) =>
      new Date(b.lastOpenedAt ?? b.createdAt).getTime() -
      new Date(a.lastOpenedAt ?? a.createdAt).getTime(),
  )[0] ?? null;
}

/**
 * Pure projection used by the real screens. Quiz scores become application
 * evidence; missed topics not already mastered become gaps. No store is
 * mutated and no network call is made here.
 */
export function projectScreenCanonicalState(input: ScreenCanonicalInput): CanonicalLearnerState {
  const evidence = input.scores
    .filter((item) => Number.isFinite(item.total) && item.total > 0 && Number.isFinite(item.score))
    .map((item) => ({
      dimension: 'application' as const,
      weight: Math.max(0, Math.min(1, item.score / item.total)),
      independent: true,
      hints: 0,
    }));
  const mastery = evaluateMastery(evidence);
  const canonicalEvidence: CanonicalLearningEvidenceSummary[] = evidence.map((item) => ({
    dimension: item.dimension,
    weight: item.weight,
    independent: item.independent,
    hints: item.hints,
  }));

  return projectCanonicalLearnerState({
    learnerId: input.learnerId,
    subjectId: input.subjectId,
    targetSkill: input.targetSkill,
    strengths: input.strengths,
    gaps: input.gaps,
    untested: [],
    missingPrerequisites: [],
    recommendationAction: input.gaps.length > 0 ? 'practice' : null,
    recommendationReason: input.gaps.length > 0 ? 'Review missed topics before moving on.' : null,
    masteryConfidence: mastery.confidence,
    reviewDue: input.gaps.length > 0,
    evidence: canonicalEvidence,
    pendingSyncCount: input.pendingSyncCount,
  });
}

/**
 * The one canonical state consumed by Home and You. It reads only governed
 * stores and pure domain code so the screens never call Supabase directly.
 */
export function useCanonicalLearnerState(): CanonicalLearnerState {
  const learnerId = useAuthStore((state) => state.user?.id ?? null);
  const progress = useProgressStore();
  const roadmapState = useRoadmapStore();

  return useMemo(() => {
    const active = selectActiveRoadmap(roadmapState.roadmaps);
    const mastered = new Set(Object.values(progress.topicsStudied ?? {}).flat());
    const gaps = [...new Set((progress.wrongAnswers ?? []).map((answer) => answer.topic))].filter(
      (topic) => !mastered.has(topic),
    );

    return projectScreenCanonicalState({
      learnerId,
      subjectId: active?.subjectId ?? 'unassigned',
      targetSkill: active?.topic ?? progress.wrongAnswers?.[0]?.topic ?? null,
      strengths: [...mastered],
      gaps,
      scores: progress.quizScores ?? [],
      pendingSyncCount: progress.pendingProgressSync ? 1 : 0,
    });
  }, [
    learnerId,
    progress.pendingProgressSync,
    progress.quizScores,
    progress.topicsStudied,
    progress.wrongAnswers,
    roadmapState.roadmaps,
  ]);
}
