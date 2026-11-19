/**
 * Mathematics evidence-flow integration tests. These exercise the real
 * Zustand journey store and deterministic domain functions with an injected
 * writer. They do not claim browser, real Supabase, or RLS coverage.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';
import { createMathJourneyStore, useMathJourneyStore } from '../../store/mathJourneyStore';
import { outboxForLearner, type EvidenceRecord, type EvidenceWriter } from '../../src/domain/evidence/evidenceService';
import { evaluateMastery, type Evidence } from '../../src/domain/learning/mastery';
import { findGaps } from '../../src/domain/learning/prerequisites';
import { MATH_PREREQ_EDGES } from '../../src/domain/mathematics/skillGraph';
import { runMathJourney } from '../../src/domain/mathematics/learningJourney';

const LEARNER_A = '11111111-1111-4111-8111-111111111111';
const LEARNER_B = '22222222-2222-4222-8222-222222222222';

class ControlledWriter implements EvidenceWriter {
  readonly written: EvidenceRecord[] = [];
  fail = false;

  async write(record: EvidenceRecord) {
    if (this.fail) throw new Error('network: socket closed');
    this.written.push(record);
    return { ok: true as const, duplicate: false };
  }
}

const writer = new ControlledWriter();

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

function startFractions(learnerId: string) {
  signIn(learnerId);
  const store = useMathJourneyStore.getState();
  store.activateLearner(learnerId);
  expect(store.beginDiagnostic('fractions')).toBe(true);
}

function submit(answer: string, hints = 0) {
  return useMathJourneyStore.getState().submitAnswer(answer, hints);
}

describe('Mathematics learner evidence flow', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem('easytutor-math-journey');
    useMathJourneyStore.getState().reset();
    useAuthStore.getState().setSession(null);
    writer.written.length = 0;
    writer.fail = false;
  });

  it('refuses to start or submit without an authenticated learner', () => {
    const store = useMathJourneyStore.getState();
    expect(store.beginDiagnostic('fractions')).toBe(false);
    expect(useMathJourneyStore.getState().lastError).toMatch(/sign in/i);
    expect(store.submitAnswer('3/4')).toBe(false);
    expect(useMathJourneyStore.getState().outbox).toHaveLength(0);
  });

  it('derives evidence owner and score from the session and real answer key', () => {
    startFractions(LEARNER_A);
    expect(submit('3/4')).toBe(true);

    const state = useMathJourneyStore.getState();
    expect(state.canonical?.learnerId).toBe(LEARNER_A);
    expect(state.canonical?.subjectId).toBe('mathematics');
    expect(state.canonical?.targetSkill).toBe('fractions');
    expect(state.canonical?.evidenceCount).toBe(1);
    expect(state.canonical?.syncState).toBe('pending');
    expect(state.canonical?.recommendationAction).toBeTruthy();
    expect(state.canonical?.recommendationReason).toBeTruthy();
    expect(state.outbox).toHaveLength(1);
    expect(state.outbox[0]).toMatchObject({
      userId: LEARNER_A,
      subjectId: 'mathematics',
      skillId: 'fractions',
      activityId: 'diagnostic',
      score: 1,
      syncState: 'pending',
    });
    expect(outboxForLearner(state.outbox, LEARNER_B)).toHaveLength(0);
  });

  it('incorrect or hinted answers cannot claim independent mastery', () => {
    startFractions(LEARNER_A);
    expect(submit('not a fraction')).toBe(true);
    const incorrect = useMathJourneyStore.getState().outbox[0];
    expect(incorrect.score).toBe(0);
    expect(incorrect.independent).toBe(true);

    // A hinted correct answer is recorded on a different diagnostic item; the
    // bank has one item per skill, so resubmitting the same item is a duplicate.
    expect(useMathJourneyStore.getState().beginDiagnostic('equations')).toBe(true);
    expect(submit('5', 1)).toBe(true);
    const hinted = useMathJourneyStore.getState().outbox[1];
    expect(hinted.score).toBe(1);
    expect(hinted.independent).toBe(false);
    expect(hinted.hints).toBe(1);
  });

  it('rejects a repeated answer to the same diagnostic item instead of inflating evidence', () => {
    startFractions(LEARNER_A);
    expect(submit('3/4')).toBe(true);
    expect(submit('3/4')).toBe(false);
    expect(useMathJourneyStore.getState().lastError).toMatch(/already been recorded/i);
    expect(useMathJourneyStore.getState().outbox).toHaveLength(1);
    expect(useMathJourneyStore.getState().canonical?.evidenceCount).toBe(1);
  });

  it('exposes a zero-evidence canonical projection before the first answer', () => {
    startFractions(LEARNER_A);
    const state = useMathJourneyStore.getState();
    expect(state.canonical).toMatchObject({
      learnerId: LEARNER_A,
      subjectId: 'mathematics',
      targetSkill: 'fractions',
      evidenceCount: 0,
      syncState: 'local',
    });
    expect(state.masteryConfidence).toBe(0);
  });

  it('keeps separate persisted journey snapshots when learners switch', () => {
    startFractions(LEARNER_A);
    submit('3/4');
    const learnerAMastery = useMathJourneyStore.getState().canonical?.masteryConfidence;

    signIn(LEARNER_B);
    useMathJourneyStore.getState().activateLearner(LEARNER_B);
    expect(useMathJourneyStore.getState().canonical).toBeNull();
    expect(useMathJourneyStore.getState().outbox).toHaveLength(0);

    useMathJourneyStore.getState().beginDiagnostic('fractions');
    submit('not correct');
    expect(useMathJourneyStore.getState().canonical?.learnerId).toBe(LEARNER_B);

    signIn(LEARNER_A);
    useMathJourneyStore.getState().activateLearner(LEARNER_A);
    expect(useMathJourneyStore.getState().canonical?.learnerId).toBe(LEARNER_A);
    expect(useMathJourneyStore.getState().canonical?.masteryConfidence).toBe(learnerAMastery);
    expect(useMathJourneyStore.getState().outbox[0].userId).toBe(LEARNER_A);
  });

  it('rehydrates the learner snapshot into a newly created store instance', async () => {
    startFractions(LEARNER_A);
    submit('3/4');
    await Promise.resolve();

    const reloadedStore = createMathJourneyStore();
    await reloadedStore.persist.rehydrate();
    reloadedStore.getState().activateLearner(LEARNER_A);

    expect(reloadedStore.getState().canonical?.learnerId).toBe(LEARNER_A);
    expect(reloadedStore.getState().canonical?.evidenceCount).toBe(1);
    expect(reloadedStore.getState().outbox[0].syncState).toBe('pending');
    expect(await AsyncStorage.getItem('easytutor-math-journey')).not.toBeNull();
  });

  it('does not drain another learner’s outbox under the active session', async () => {
    startFractions(LEARNER_A);
    submit('3/4');
    signIn(LEARNER_B);
    useMathJourneyStore.getState().activateLearner(LEARNER_B);

    await useMathJourneyStore.getState().syncPending(writer);
    expect(writer.written).toHaveLength(0);

    signIn(LEARNER_A);
    useMathJourneyStore.getState().activateLearner(LEARNER_A);
    await useMathJourneyStore.getState().syncPending(writer);
    expect(writer.written).toHaveLength(1);
    expect(writer.written[0].userId).toBe(LEARNER_A);
    expect(useMathJourneyStore.getState().outbox[0].syncState).toBe('synced');
  });

  it('leaves evidence visible and retryable when persistence fails', async () => {
    startFractions(LEARNER_A);
    submit('3/4');
    writer.fail = true;

    await useMathJourneyStore.getState().syncPending(writer);
    const state = useMathJourneyStore.getState();
    expect(state.outbox).toHaveLength(1);
    expect(state.outbox[0].syncState).toBe('failed');
    expect(state.outbox[0].lastError).toMatch(/socket closed/i);
    expect(state.canonical?.syncState).toBe('pending');
    expect(state.lastError).toMatch(/socket closed/i);
  });

  it('marks evidence synced only after writer confirmation and retries idempotently', async () => {
    startFractions(LEARNER_A);
    submit('3/4');
    writer.fail = true;
    await useMathJourneyStore.getState().syncPending(writer);
    writer.fail = false;

    await useMathJourneyStore.getState().syncPending(writer, new Date(Date.now() + 10_000));
    const state = useMathJourneyStore.getState();
    expect(writer.written).toHaveLength(1);
    expect(state.outbox).toHaveLength(1);
    expect(state.outbox[0].syncState).toBe('synced');
    expect(state.canonical?.syncState).toBe('synced');
  });

  it('reuses deterministic mastery, prerequisites and recommendation rules', () => {
    const evidence: Evidence[] = [
      { dimension: 'application', weight: 0.8, independent: true, hints: 0 },
      { dimension: 'transfer', weight: 0.9, independent: true, hints: 0 },
    ];
    expect(evaluateMastery(evidence)).toEqual(evaluateMastery(evidence));
    expect(findGaps('equations', new Set(), MATH_PREREQ_EDGES.map(({ from, to }) => ({ from, to })))).toContain('fractions');

    const now = new Date('2026-11-19T00:00:00Z');
    expect(runMathJourney('equations', [], evidence, now)).toEqual(runMathJourney('equations', [], evidence, now));
  });
});
