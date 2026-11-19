import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import { supabaseEvidenceWriter } from '../src/infrastructure/evidence';
import {
  createEvidence,
  drain,
  enqueue,
  isUuid,
  type EvidenceRecord,
  type EvidenceWriter,
} from '../src/domain/evidence/evidenceService';
import { MATH_DIAGNOSTIC_BANK, type MathDiagnosticResponse } from '../src/domain/mathematics/diagnosticBank';
import { runMathJourney, type JourneyEvidence } from '../src/domain/mathematics/learningJourney';
import {
  projectCanonicalLearnerState,
  type CanonicalLearnerState,
  type CanonicalLearningEvidenceSummary,
} from '../src/domain/learning/canonicalLearnerState';

export type DiagnosticAnswer = MathDiagnosticResponse;
export type PracticeEvidence = JourneyEvidence;

interface LearnerJourneySnapshot {
  learnerId: string;
  targetSkill: string | null;
  diagnostic: DiagnosticAnswer[];
  evidence: PracticeEvidence[];
  recommendation: string | null;
  masteryConfidence: number;
  reviewDue: boolean;
  canonical: CanonicalLearnerState | null;
  outbox: EvidenceRecord[];
}

interface MathJourneyState extends Omit<LearnerJourneySnapshot, 'learnerId'> {
  learnerId: string | null;
  learners: Record<string, LearnerJourneySnapshot>;
  lastError: string | null;
  activateLearner: (learnerId: string) => void;
  beginDiagnostic: (targetSkill: string) => boolean;
  submitAnswer: (answer: string, hints?: number) => boolean;
  syncPending: (writer?: EvidenceWriter, now?: Date) => Promise<void>;
  reset: () => void;
}

const EMPTY_STATE = {
  targetSkill: null,
  diagnostic: [],
  evidence: [],
  recommendation: null,
  masteryConfidence: 0,
  reviewDue: false,
  canonical: null,
  outbox: [],
} satisfies Omit<LearnerJourneySnapshot, 'learnerId'>;

function projectSnapshot(
  learnerId: string,
  targetSkill: string,
  diagnostic: DiagnosticAnswer[],
  evidence: PracticeEvidence[],
  outbox: EvidenceRecord[],
): LearnerJourneySnapshot {
  const journey = runMathJourney(targetSkill, diagnostic, evidence);
  const canonicalEvidence: CanonicalLearningEvidenceSummary[] = evidence.map((item) => ({
    dimension: item.dimension,
    weight: item.weight,
    independent: item.independent,
    hints: item.hints,
  }));
  const canonical = projectCanonicalLearnerState({
    learnerId,
    subjectId: 'mathematics',
    targetSkill,
    strengths: journey.strengths,
    gaps: journey.gaps,
    untested: journey.untested,
    missingPrerequisites: journey.missingPrereqs,
    recommendationAction: journey.recommendation.action,
    recommendationReason: journey.recommendation.reason,
    masteryConfidence: journey.masteryConfidence,
    reviewDue: journey.reviewDue,
    evidence: canonicalEvidence,
    pendingSyncCount: outbox.filter((record) => record.syncState !== 'synced').length,
  });

  return {
    learnerId,
    targetSkill,
    diagnostic,
    evidence,
    recommendation: journey.recommendation.action,
    masteryConfidence: journey.masteryConfidence,
    reviewDue: journey.reviewDue,
    canonical,
    outbox,
  };
}

function snapshotFromState(state: MathJourneyState, learnerId: string): LearnerJourneySnapshot {
  return state.learners[learnerId] ?? { learnerId, ...EMPTY_STATE };
}

function publishSnapshot(
  set: (partial: Partial<MathJourneyState>) => void,
  state: MathJourneyState,
  snapshot: LearnerJourneySnapshot,
): void {
  const learners = { ...state.learners, [snapshot.learnerId]: snapshot };
  if (useAuthStore.getState().user?.id === snapshot.learnerId) {
    set({ ...snapshot, learners, lastError: null });
  } else {
    set({ learners });
  }
}

function authenticatedLearnerId(set: (partial: Partial<MathJourneyState>) => void): string | null {
  const learnerId = useAuthStore.getState().user?.id ?? null;
  if (!learnerId || !isUuid(learnerId)) {
    set({ lastError: 'Sign in to record Mathematics progress.' });
    return null;
  }
  return learnerId;
}

export function createMathJourneyStore(storage = AsyncStorage) {
  return create<MathJourneyState>()(
  persist(
    (set, get) => ({
      learnerId: null,
      ...EMPTY_STATE,
      learners: {},
      lastError: null,

      activateLearner: (learnerId) => {
        if (!isUuid(learnerId) || useAuthStore.getState().user?.id !== learnerId) {
          set({ learnerId: null, ...EMPTY_STATE, lastError: 'The active learner does not match the signed-in account.' });
          return;
        }
        const snapshot = snapshotFromState(get(), learnerId);
        set({ ...snapshot, lastError: null });
      },

      beginDiagnostic: (targetSkill) => {
        const learnerId = authenticatedLearnerId(set);
        if (!learnerId) return false;
        if (!MATH_DIAGNOSTIC_BANK.some((item) => item.skillId === targetSkill)) {
          set({ lastError: 'No Mathematics diagnostic is available for this skill.' });
          return false;
        }
        const state = get();
        const current = snapshotFromState(state, learnerId);
        // Starting another diagnostic changes the target skill but never discards
        // evidence the learner already produced — that would silently drop progress.
        const snapshot = projectSnapshot(learnerId, targetSkill, current.diagnostic, current.evidence, current.outbox);
        publishSnapshot(set, state, snapshot);
        return true;
      },

      submitAnswer: (answer, hints = 0) => {
        const learnerId = authenticatedLearnerId(set);
        if (!learnerId) return false;
        const state = get();
        const current = snapshotFromState(state, learnerId);
        if (!current.targetSkill) {
          set({ lastError: 'Start the Mathematics diagnostic before submitting an answer.' });
          return false;
        }
        if (!Number.isInteger(hints) || hints < 0) {
          set({ lastError: 'Hint count must be a non-negative whole number.' });
          return false;
        }

        const item = MATH_DIAGNOSTIC_BANK.find((candidate) => candidate.skillId === current.targetSkill);
        if (!item) {
          set({ lastError: 'No Mathematics diagnostic is available for this skill.' });
          return false;
        }
        if (current.diagnostic.some((response) => response.itemId === item.id)) {
          set({ lastError: 'This diagnostic answer has already been recorded.' });
          return false;
        }
        const response: DiagnosticAnswer = {
          itemId: item.id,
          answer: answer.trim(),
          hints,
          independent: hints === 0,
        };
        const isCorrect = response.answer.toLowerCase() === item.answer.toLowerCase();
        const practiceEvidence: PracticeEvidence = {
          dimension: item.dimension,
          weight: isCorrect ? 1 : 0,
          independent: response.independent,
          hints,
        };
        const eventId = `math:${learnerId}:${item.id}:attempt:${current.outbox.length + 1}`;
        let record: EvidenceRecord;
        try {
          record = createEvidence({
            userId: learnerId,
            clientEventId: eventId,
            subjectId: 'mathematics',
            skillId: item.skillId,
            activityId: 'diagnostic',
            itemId: item.id,
            itemVersion: item.version,
            assessmentVersion: 1,
            dimension: item.dimension,
            response: response.answer,
            score: practiceEvidence.weight,
            independent: response.independent,
            hints,
            provenance: 'learner_action',
          });
        } catch (error) {
          set({ lastError: error instanceof Error ? error.message : 'Unable to validate this answer.' });
          return false;
        }

        const diagnostic = [...current.diagnostic, response];
        const evidence = [...current.evidence, practiceEvidence];
        const outbox = enqueue(current.outbox, record);
        publishSnapshot(set, state, projectSnapshot(learnerId, current.targetSkill, diagnostic, evidence, outbox));
        return true;
      },

      syncPending: async (writer = supabaseEvidenceWriter, now = new Date()) => {
        const learnerId = authenticatedLearnerId(set);
        if (!learnerId) return;
        const state = get();
        const current = snapshotFromState(state, learnerId);
        if (!current.outbox.some((record) => record.syncState !== 'synced')) return;

        const updateQueue = (outbox: EvidenceRecord[]) => {
          const latestState = get();
          const latest = snapshotFromState(latestState, learnerId);
          publishSnapshot(set, latestState, projectSnapshot(
            learnerId,
            latest.targetSkill ?? 'fractions',
            latest.diagnostic,
            latest.evidence,
            outbox,
          ));
        };

        const outbox = await drain(current.outbox, writer, { now, onProgress: updateQueue });
        updateQueue(outbox);
        const failed = outbox.find((record) => record.syncState === 'failed');
        if (failed && useAuthStore.getState().user?.id === learnerId) {
          set({ lastError: failed.lastError ?? 'Some Mathematics evidence could not be synced.' });
        }
      },

      reset: () => set({ learnerId: null, ...EMPTY_STATE, learners: {}, lastError: null }),
    }),
    {
      name: 'easytutor-math-journey',
      version: 1,
      storage: createJSONStorage(() => storage),
      migrate: (persisted: unknown) => {
        if (!persisted || typeof persisted !== 'object') return persisted as MathJourneyState;
        const previous = persisted as Partial<MathJourneyState>;
        const learners = { ...(previous.learners ?? {}) };
        if (previous.learnerId && !learners[previous.learnerId]) {
          learners[previous.learnerId] = {
            learnerId: previous.learnerId,
            targetSkill: previous.targetSkill ?? null,
            diagnostic: previous.diagnostic ?? [],
            evidence: previous.evidence ?? [],
            recommendation: previous.recommendation ?? null,
            masteryConfidence: previous.masteryConfidence ?? 0,
            reviewDue: previous.reviewDue ?? false,
            canonical: previous.canonical ?? null,
            outbox: previous.outbox ?? [],
          };
        }
        return { ...previous, learners } as MathJourneyState;
      },
    },
    ),
  );
}

export const useMathJourneyStore = createMathJourneyStore();
