/**
 * M1 T8 — full-chain Mathematics journey, restored from commit 2ec396a and
 * adapted to the current authenticated store API (`activateLearner`,
 * `beginDiagnostic`, `submitAnswer`). The authenticated evidence-flow suite in
 * `mathLearnerJourney.integration.test.ts` remains intact alongside it.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';
import { useMathJourneyStore } from '../../store/mathJourneyStore';
import {
  drain,
  outboxForLearner,
  type EvidenceRecord,
  type EvidenceWriter,
} from '../../src/domain/evidence/evidenceService';
import { evaluateMastery, type Evidence } from '../../src/domain/learning/mastery';
import { findGaps } from '../../src/domain/learning/prerequisites';
import { MATH_PREREQ_EDGES as EDGES } from '../../src/domain/mathematics/skillGraph';
import { runMathJourney } from '../../src/domain/mathematics/learningJourney';

const LEARNER_A = '11111111-1111-4111-8111-111111111111';
const LEARNER_B = '22222222-2222-4222-8222-222222222222';

class DeterministicWriter implements EvidenceWriter {
  readonly written: EvidenceRecord[] = [];
  fail = false;

  async write(record: EvidenceRecord) {
    if (this.fail) throw new Error('network: socket closed');
    this.written.push(record);
    return { ok: true as const, duplicate: false };
  }

  reset() {
    this.written.length = 0;
    this.fail = false;
  }
}

const writer = new DeterministicWriter();

function signIn(learnerId: string) {
  useAuthStore.getState().setSession({
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_at: 9999999999,
    expires_in: 9999999999,
    token_type: 'bearer',
    user: {
      id: learnerId,
      email: 'learner@example.test',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00Z',
    },
  });
}

function completeJourney(learnerId: string, answers: Array<{ skill: string; answer: string; hints?: number }>) {
  signIn(learnerId);
  const store = useMathJourneyStore.getState();
  store.activateLearner(learnerId);

  for (const { skill, answer, hints } of answers) {
    expect(store.beginDiagnostic(skill)).toBe(true);
    expect(useMathJourneyStore.getState().submitAnswer(answer, hints ?? 0)).toBe(true);
  }

  return useMathJourneyStore.getState();
}

const twoSkillJourney = [
  { skill: 'fractions', answer: '3/4' },
  { skill: 'equations', answer: '5' },
];

describe('Mathematics learner journey — full chain', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem('easytutor-math-journey');
    useMathJourneyStore.getState().reset();
    useAuthStore.getState().setSession(null);
    writer.reset();
  });

  it('completes the full journey: authenticate → learn → practice → project → recommend', () => {
    const afterPractice = completeJourney(LEARNER_A, twoSkillJourney);

    expect(afterPractice.learnerId).toBe(LEARNER_A);
    expect(afterPractice.diagnostic).toHaveLength(2);
    expect(afterPractice.evidence).toHaveLength(2);
    expect(afterPractice.outbox.length).toBeGreaterThan(0);
    expect(afterPractice.masteryConfidence).toBeGreaterThan(0);
    expect(afterPractice.recommendation).toBeTruthy();
    expect(afterPractice.canonical).toMatchObject({
      learnerId: LEARNER_A,
      subjectId: 'mathematics',
      evidenceCount: 2,
      syncState: 'pending',
    });
    expect(afterPractice.canonical?.recommendationAction).toBeTruthy();
    expect(afterPractice.canonical?.recommendationReason).toBeTruthy();
  });

  it('evidence belongs to the authenticated learner only', () => {
    const state = completeJourney(LEARNER_A, twoSkillJourney);
    expect(state.outbox.length).toBeGreaterThan(0);
    state.outbox.forEach((record) => expect(record.userId).toBe(LEARNER_A));
    expect(outboxForLearner(state.outbox, LEARNER_A)).toHaveLength(state.outbox.length);
    expect(outboxForLearner(state.outbox, LEARNER_B)).toHaveLength(0);
    expect(outboxForLearner(state.outbox, null)).toHaveLength(0);
  });

  it('mastery changes only when valid evidence supports it', () => {
    signIn(LEARNER_A);
    const store = useMathJourneyStore.getState();
    store.activateLearner(LEARNER_A);
    expect(store.beginDiagnostic('fractions')).toBe(true);
    expect(useMathJourneyStore.getState().canonical?.masteryConfidence).toBe(0);

    expect(useMathJourneyStore.getState().submitAnswer('not a fraction')).toBe(true);
    expect(useMathJourneyStore.getState().canonical?.evidenceCount).toBe(1);

    expect(useMathJourneyStore.getState().beginDiagnostic('equations')).toBe(true);
    expect(useMathJourneyStore.getState().submitAnswer('5')).toBe(true);
    const state = useMathJourneyStore.getState();
    expect(state.evidence).toHaveLength(2);
    expect(state.canonical?.evidenceCount).toBe(2);
    expect(state.masteryConfidence).toBeGreaterThan(0);
  });

  it('prerequisite gaps are calculated correctly', () => {
    expect(findGaps('equations', new Set(), EDGES)).toContain('arithmetic');
    expect(findGaps('equations', new Set(), EDGES)).toContain('fractions');
    const partial = findGaps('equations', new Set(['arithmetic']), EDGES);
    expect(partial).not.toContain('arithmetic');
    expect(partial).toContain('fractions');
    const allKnown = new Set(EDGES.map((edge) => edge.from));
    expect(findGaps('equations', allKnown, EDGES)).toHaveLength(0);
  });

  it('recommendations are traceable to canonical learner state', () => {
    const state = completeJourney(LEARNER_A, [{ skill: 'fractions', answer: 'wrong' }]);
    const canonical = state.canonical;
    expect(canonical).not.toBeNull();

    const validActions = [
      'learn-prerequisite',
      'guided-learning',
      'practice',
      'application',
      'transfer',
      'review',
      'continue',
    ];
    expect(validActions).toContain(canonical?.recommendationAction ?? '');
    expect(typeof canonical?.recommendationReason).toBe('string');
    expect(canonical?.recommendationReason?.length ?? 0).toBeGreaterThan(0);
    if ((canonical?.missingPrerequisites.length ?? 0) > 0) {
      expect(canonical?.recommendationAction).toBe('learn-prerequisite');
    }
  });

  it('progress survives learner switching (per-learner persisted state)', () => {
    completeJourney(LEARNER_A, twoSkillJourney);
    const beforeReload = useMathJourneyStore.getState();
    const masteryA = beforeReload.canonical?.masteryConfidence;

    signIn(LEARNER_B);
    useMathJourneyStore.getState().activateLearner(LEARNER_B);
    expect(useMathJourneyStore.getState().canonical).toBeNull();

    signIn(LEARNER_A);
    useMathJourneyStore.getState().activateLearner(LEARNER_A);
    const afterReload = useMathJourneyStore.getState();
    expect(afterReload.evidence).toHaveLength(beforeReload.evidence.length);
    expect(afterReload.outbox).toHaveLength(beforeReload.outbox.length);
    expect(afterReload.canonical?.evidenceCount).toBe(2);
    expect(afterReload.canonical?.masteryConfidence).toBe(masteryA);
  });

  it('offline/retry scenario: evidence survives writer failure and can be retried', async () => {
    completeJourney(LEARNER_A, twoSkillJourney);
    writer.fail = true;
    await useMathJourneyStore.getState().syncPending(writer);

    const afterFailure = useMathJourneyStore.getState();
    expect(afterFailure.outbox.filter((record) => record.syncState === 'synced')).toHaveLength(0);
    expect(afterFailure.outbox.filter((record) => record.syncState !== 'synced').length).toBeGreaterThan(0);

    writer.fail = false;
    await useMathJourneyStore.getState().syncPending(writer, new Date(Date.now() + 10_000));
    const syncedNow = useMathJourneyStore.getState().outbox.filter((record) => record.syncState === 'synced');
    expect(syncedNow.length).toBeGreaterThan(0);
  });

  it('drain marks synced only after backend confirms', async () => {
    completeJourney(LEARNER_A, twoSkillJourney);
    const pending = useMathJourneyStore.getState().outbox.filter((record) => record.syncState !== 'synced');
    expect(pending.length).toBeGreaterThan(0);
    const result = await drain(pending, writer);
    expect(result.every((record) => record.syncState === 'synced')).toBe(true);
  });
});

describe('Mathematics learner journey — mastery determinism', () => {
  const now = new Date('2026-11-19T00:00:00Z');

  it('identical evidence produces identical mastery', () => {
    const evidence: Evidence[] = [
      { dimension: 'application', weight: 0.8, independent: true, hints: 0 },
      { dimension: 'transfer', weight: 0.9, independent: true, hints: 0 },
    ];
    expect(evaluateMastery(evidence)).toEqual(evaluateMastery(evidence));
  });

  it('independent evidence scores higher than hinted evidence', () => {
    const independent: Evidence[] = [
      { dimension: 'application', weight: 0.8, independent: true, hints: 0 },
    ];
    const hinted: Evidence[] = [
      { dimension: 'application', weight: 0.8, independent: false, hints: 3 },
    ];
    expect(evaluateMastery(independent).confidence).toBeGreaterThan(evaluateMastery(hinted).confidence);
  });

  it('no evidence → not_assessed with zero confidence', () => {
    expect(evaluateMastery([])).toMatchObject({ level: 'not_assessed', confidence: 0, reason: 'no evidence' });
  });

  it('runMathJourney is deterministic for identical inputs', () => {
    const diagnostic = [{ itemId: 'q1', answer: '4', hints: 0, independent: false }];
    const evidence = [{ dimension: 'application' as const, weight: 0.8, independent: true, hints: 0 }];
    expect(runMathJourney('equations', diagnostic, evidence, now))
      .toEqual(runMathJourney('equations', diagnostic, evidence, now));
  });
});
