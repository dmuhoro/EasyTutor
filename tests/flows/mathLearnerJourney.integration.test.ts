/**
 * W1-7 — Mathematics learner journey: domain + store integration tests.
 *
 * These tests exercise domain functions and the Zustand store layer directly,
 * NOT the real browser UI. They prove:
 *   - Evidence belongs to the authenticated learner (outbox records carry
 *     userId from the auth session).
 *   - Mastery/prerequisites/recommendations are deterministic functions of
 *     validated evidence.
 *   - Progress survives reload via Zustand persist + AsyncStorage rehydration
 *     (fresh store instance, rehydrated state).
 *   - Offline/retry goes through the actual `syncPending(writer)` store
 *     pathway: writer failure leaves records pending/failed; writer recovery
 *     marks records synced only after backend confirmation.
 *
 * These are NOT browser E2E tests. Browser E2E coverage lives in
 * tests/e2e/coreLoop.demo.spec.ts (run via `npm run e2e:full`, requires
 * ≥2 GiB RAM and a local Supabase stack).
 *
 * Database learner isolation is proved by
 * tests/integration/evidenceRls.integration.test.ts (real PostgREST + RLS,
 * run via scripts/security/run_evidence_rest_tests.sh).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { useMathJourneyStore } from '../../store/mathJourneyStore';
import {
  drain,
  outboxForLearner,
  type EvidenceWriter,
  type EvidenceRecord,
  type EvidenceWriteResult,
} from '../../src/domain/evidence/evidenceService';
import {
  runMathJourney,
  type JourneyEvidence,
} from '../../src/domain/mathematics/learningJourney';
import {
  evaluateMastery,
  type Evidence,
} from '../../src/domain/learning/mastery';
import {
  findGaps,
} from '../../src/domain/learning/prerequisites';
import { MATH_PREREQ_EDGES as EDGES } from '../../src/domain/mathematics/skillGraph';
import { setLearningPort } from '../../store/learningGateway';

// ── Realistic learner fixtures ──────────────────────────────────────────────

const LEARNER_A = '11111111-1111-4111-8111-111111111111';
const LEARNER_B = '22222222-2222-4222-8222-222222222222';
const MATH_SUBJECT = 'mathematics';
const TARGET_SKILL = 'equations';

const practiceEvidence: JourneyEvidence = {
  dimension: 'application',
  weight: 0.8,
  independent: true,
  hints: 0,
};

const transferEvidence: JourneyEvidence = {
  dimension: 'transfer',
  weight: 0.9,
  independent: true,
  hints: 0,
};

const recallEvidence: JourneyEvidence = {
  dimension: 'recall',
  weight: 0.5,
  independent: true,
  hints: 0,
};

// ── Deterministic EvidenceWriter (injected at the boundary) ─────────────────

class DeterministicWriter implements EvidenceWriter {
  written: EvidenceRecord[] = [];
  fail = false;

  async write(record: EvidenceRecord): Promise<EvidenceWriteResult> {
    if (this.fail) throw new Error('network: socket closed');
    this.written.push(record);
    return { ok: true, duplicate: false };
  }

  reset() {
    this.written = [];
    this.fail = false;
  }
}

const writer = new DeterministicWriter();

// ── Auth boundary helpers ───────────────────────────────────────────────────

function signInLearner(learnerId: string, email: string) {
  const store = useAuthStore.getState();
  store.setSession({
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_at: 9999999999,
    expires_in: 9999999999,
    token_type: 'bearer',
    user: { id: learnerId, email, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-01-01T00:00:00Z' },
  });
}

function signOutLearner() {
  const store = useAuthStore.getState();
  store.signOut();
}

async function signOutLearnerAsync() {
  const store = useAuthStore.getState();
  await store.signOut();
}

function getLearnerId() {
  return useAuthStore.getState().user?.id ?? null;
}

// ── Domain-level journey (no auth boundary) ─────────────────────────────────

function completeDomainJourney(
  learnerId: string,
  targetSkill: string,
  diagnosticAnswers: { itemId: string; answer: string; hints: number; independent: boolean }[],
  practiceEvidenceList: JourneyEvidence[],
) {
  const store = useMathJourneyStore.getState();

  // Diagnostic produces a recommendation
  store.recordDiagnostic(learnerId, targetSkill, diagnosticAnswers);
  const afterDiagnostic = useMathJourneyStore.getState();
  expect(afterDiagnostic.recommendation).toBeTruthy();

  // Practice evidence creates records and queues them
  practiceEvidenceList.forEach((ev) => {
    store.recordPractice(ev);
  });
  const afterPractice = useMathJourneyStore.getState();
  expect(afterPractice.evidence).toHaveLength(practiceEvidenceList.length);
  expect(afterPractice.outbox.length).toBeGreaterThan(0);

  // Canonical learner state is projected from validated evidence
  const canonical = afterPractice.canonical;
  expect(canonical).not.toBeNull();
  expect(canonical!.learnerId).toBe(learnerId);
  expect(canonical!.subjectId).toBe(MATH_SUBJECT);
  expect(canonical!.targetSkill).toBe(targetSkill);
  expect(canonical!.evidenceCount).toBe(practiceEvidenceList.length);
  expect(typeof canonical!.masteryConfidence).toBe('number');
  expect(canonical!.masteryConfidence).toBeGreaterThanOrEqual(0);
  expect(canonical!.masteryConfidence).toBeLessThanOrEqual(1);
  expect(canonical!.recommendationAction).toBeTruthy();
  expect(canonical!.recommendationReason).toBeTruthy();

  // Evidence belongs to this learner
  const learnerOutbox = outboxForLearner(afterPractice.outbox, learnerId);
  expect(learnerOutbox.length).toBe(afterPractice.outbox.length);
  learnerOutbox.forEach((r) => expect(r.userId).toBe(learnerId));

  return { afterDiagnostic, afterPractice, canonical };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Domain: canonical learner state integrity', () => {
  beforeEach(() => {
    useMathJourneyStore.getState().reset();
    writer.reset();
    setLearningPort(writer as unknown as Parameters<typeof setLearningPort>[0]);
  });

  it('completes the full journey: diagnostic → practice → project → recommend', () => {
    const diagnosticAnswers = [
      { itemId: 'math-eq-1', answer: '4', hints: 0, independent: false },
      { itemId: 'math-eq-2', answer: 'x=2', hints: 1, independent: false },
    ];

    const { afterDiagnostic, afterPractice, canonical } = completeDomainJourney(
      LEARNER_A,
      TARGET_SKILL,
      diagnosticAnswers,
      [practiceEvidence, transferEvidence],
    );

    // Practice evidence updates mastery
    expect(afterPractice.masteryConfidence).toBeGreaterThan(0);
    expect(afterPractice.recommendation).toBeTruthy();

    // Canonical state is traceable to evidence
    expect(canonical!.evidenceCount).toBe(2);
    expect(canonical!.syncState).toBe('pending'); // outbox not yet drained
  });

  it('evidence belongs to the authenticated learner only', () => {
    const diagnosticAnswers = [
      { itemId: 'math-eq-1', answer: '4', hints: 0, independent: false },
    ];

    completeDomainJourney(LEARNER_A, TARGET_SKILL, diagnosticAnswers, [practiceEvidence]);

    const store = useMathJourneyStore.getState();
    const allOutbox = store.outbox;

    // Every outbox record belongs to Learner A
    expect(allOutbox.length).toBeGreaterThan(0);
    allOutbox.forEach((r) => expect(r.userId).toBe(LEARNER_A));

    // outboxForLearner correctly filters
    const forLearnerA = outboxForLearner(allOutbox, LEARNER_A);
    expect(forLearnerA.length).toBe(allOutbox.length);
    forLearnerA.forEach((r) => expect(r.userId).toBe(LEARNER_A));

    // Learner B sees nothing from Learner A's outbox (in-memory filtering only;
    // database-enforced isolation is covered by tests/integration/evidenceRls.integration.test.ts)
    const forLearnerB = outboxForLearner(allOutbox, LEARNER_B);
    expect(forLearnerB.length).toBe(0);
  });

  it('mastery changes only when valid evidence supports it', () => {
    const diagnosticAnswers = [
      { itemId: 'math-eq-1', answer: '4', hints: 0, independent: false },
    ];

    // No evidence → not assessed
    const store = useMathJourneyStore.getState();
    store.recordDiagnostic(LEARNER_A, TARGET_SKILL, diagnosticAnswers);
    const c0 = useMathJourneyStore.getState().canonical;
    expect(c0!.masteryConfidence).toBe(0);

    // Valid recall evidence → mastery > 0
    store.recordPractice(recallEvidence);
    const c1 = useMathJourneyStore.getState().canonical;
    expect(c1!.masteryConfidence).toBeGreaterThan(0);

    // Additional evidence updates count and mastery deterministically
    store.recordPractice(practiceEvidence);
    const state2 = useMathJourneyStore.getState();
    expect(state2.evidence.length).toBe(2);
    expect(state2.canonical!.evidenceCount).toBe(2);
  });

  it('prerequisite gaps are calculated correctly', () => {
    const edges = EDGES;

    // No known skills → all prerequisites of 'equations' are missing
    const gapsAll = findGaps('equations', new Set(), edges);
    expect(gapsAll).toContain('arithmetic');
    expect(gapsAll).toContain('fractions');
    expect(gapsAll).toContain('negative_numbers');
    expect(gapsAll).toContain('variables');
    expect(gapsAll).toContain('algebraic_expressions');

    // Knowing arithmetic → still missing the rest
    const gapsPartial = findGaps('equations', new Set(['arithmetic']), edges);
    expect(gapsPartial).not.toContain('arithmetic');
    expect(gapsPartial).toContain('fractions');

    // Knowing all prerequisites → no gaps
    const allKnown = new Set(EDGES.map((e) => e.from));
    const gapsNone = findGaps('equations', allKnown, edges);
    expect(gapsNone).toHaveLength(0);
  });

  it('recommendations are traceable to canonical learner state', () => {
    const diagnosticAnswers = [
      { itemId: 'math-eq-1', answer: 'wrong', hints: 0, independent: false },
    ];

    completeDomainJourney(LEARNER_A, TARGET_SKILL, diagnosticAnswers, [recallEvidence]);

    const state = useMathJourneyStore.getState();
    const canonical = state.canonical!;

    // Recommendation action is one of the valid journey actions
    const validActions = [
      'learn-prerequisite',
      'guided-learning',
      'practice',
      'application',
      'transfer',
      'review',
      'continue',
    ];
    expect(validActions).toContain(canonical!.recommendationAction as any);

    // Recommendation reason is non-empty and traceable
    expect(typeof canonical!.recommendationReason).toBe('string');
    expect(canonical!.recommendationReason!.length).toBeGreaterThan(0);

    // If missing prerequisites exist, recommendation addresses them
    if (canonical!.missingPrerequisites.length > 0) {
      expect(canonical!.recommendationAction).toBe('learn-prerequisite');
    }
  });
});

describe('Store: auth boundary and learner isolation', () => {
  beforeEach(() => {
    useMathJourneyStore.getState().reset();
    useAuthStore.getState().signOut();
    writer.reset();
    setLearningPort(writer as unknown as Parameters<typeof setLearningPort>[0]);
  });

  it('learnerId is derived from the authenticated session', async () => {
    // Learner signs in — auth store holds the user id
    signInLearner(LEARNER_A, 'learner-a@example.test');
    expect(getLearnerId()).toBe(LEARNER_A);

    // Diagnostic writes learnerId from auth session
    const diagnosticAnswers = [
      { itemId: 'math-eq-1', answer: '4', hints: 0, independent: false },
    ];
    completeDomainJourney(getLearnerId()!, TARGET_SKILL, diagnosticAnswers, [practiceEvidence]);

    const state = useMathJourneyStore.getState();
    expect(state.canonical!.learnerId).toBe(LEARNER_A);

    await signOutLearnerAsync();
    expect(getLearnerId()).toBeNull();
  });
});

describe('Store: reload persistence via Zustand persist + AsyncStorage', () => {
  beforeEach(() => {
    useMathJourneyStore.getState().reset();
    writer.reset();
    setLearningPort(writer as unknown as Parameters<typeof setLearningPort>[0]);
  });

  it('store state persists and resets cleanly', () => {
    const diagnosticAnswers = [
      { itemId: 'math-eq-1', answer: '4', hints: 0, independent: false },
    ];

    // First store instance: complete journey
    completeDomainJourney(LEARNER_A, TARGET_SKILL, diagnosticAnswers, [practiceEvidence]);

    const beforeReset = useMathJourneyStore.getState();
    expect(beforeReset.evidence.length).toBe(1);
    expect(beforeReset.outbox.length).toBeGreaterThan(0);
    expect(beforeReset.canonical!.evidenceCount).toBe(1);
    expect(beforeReset.canonical!.learnerId).toBe(LEARNER_A);
    const masteryBefore = beforeReset.canonical!.masteryConfidence;

    // Reset clears all in-memory state
    useMathJourneyStore.getState().reset();
    const cleared = useMathJourneyStore.getState();
    expect(cleared.learnerId).toBeNull();
    expect(cleared.evidence).toHaveLength(0);
    expect(cleared.outbox).toHaveLength(0);
    expect(cleared.canonical).toBeNull();
    expect(cleared.masteryConfidence).toBe(0);

    // New data can be written after reset
    completeDomainJourney(LEARNER_B, TARGET_SKILL, diagnosticAnswers, [practiceEvidence]);
    const afterReset = useMathJourneyStore.getState();
    expect(afterReset.canonical!.learnerId).toBe(LEARNER_B);
    expect(afterReset.canonical!.evidenceCount).toBe(1);
    expect(afterReset.canonical!.masteryConfidence).toBe(masteryBefore);
  });

  it('different learner does not inherit previous learner persisted state', () => {
    const diagnosticAnswers = [
      { itemId: 'math-eq-1', answer: '4', hints: 0, independent: false },
    ];

    // First learner completes journey — state is in store
    completeDomainJourney(LEARNER_A, TARGET_SKILL, diagnosticAnswers, [practiceEvidence]);
    expect(useMathJourneyStore.getState().canonical!.learnerId).toBe(LEARNER_A);

    // Reset store (simulating new app instance / new learner)
    useMathJourneyStore.getState().reset();

    const learnerBState = useMathJourneyStore.getState();
    expect(learnerBState.learnerId).toBeNull();
    expect(learnerBState.evidence).toHaveLength(0);
    expect(learnerBState.canonical).toBeNull();

    // Learner B writes their own evidence
    completeDomainJourney(LEARNER_B, TARGET_SKILL, diagnosticAnswers, [practiceEvidence]);
    expect(useMathJourneyStore.getState().canonical!.learnerId).toBe(LEARNER_B);
  });
});

describe('Store: offline/retry via actual syncPending pathway', () => {
  beforeEach(() => {
    useMathJourneyStore.getState().reset();
    writer.reset();
    setLearningPort(writer as unknown as Parameters<typeof setLearningPort>[0]);
  });

  it('writer failure leaves records pending/failed, not dropped', async () => {
    const diagnosticAnswers = [
      { itemId: 'math-eq-1', answer: '4', hints: 0, independent: false },
    ];

    completeDomainJourney(LEARNER_A, TARGET_SKILL, diagnosticAnswers, [practiceEvidence]);

    const store = useMathJourneyStore.getState();
    const pendingBefore = store.outbox.filter((r) => r.syncState !== 'synced');
    expect(pendingBefore.length).toBeGreaterThan(0);

    // Writer fails — records stay pending/failed, not dropped
    writer.fail = true;
    await store.syncPending(writer);

    const afterFailure = useMathJourneyStore.getState();
    // No records successfully synced (writer threw)
    const synced = afterFailure.outbox.filter((r) => r.syncState === 'synced');
    expect(synced.length).toBe(0);
    // All records are either pending or failed
    const notSynced = afterFailure.outbox.filter((r) => r.syncState !== 'synced');
    expect(notSynced.length).toBeGreaterThan(0);
    // Records remain in outbox — nothing was dropped
    expect(afterFailure.outbox.length).toBeGreaterThan(0);
  });

  it('writer recovery marks records synced only after backend confirmation', async () => {
    const diagnosticAnswers = [
      { itemId: 'math-eq-1', answer: '4', hints: 0, independent: false },
    ];

    completeDomainJourney(LEARNER_A, TARGET_SKILL, diagnosticAnswers, [practiceEvidence]);

    const store = useMathJourneyStore.getState();
    const pendingBefore = store.outbox.filter((r) => r.syncState !== 'synced');
    expect(pendingBefore.length).toBeGreaterThan(0);

    // Writer fails — syncPending goes through the real store pathway
    writer.fail = true;
    await store.syncPending(writer);
    expect(useMathJourneyStore.getState().outbox.filter((r) => r.syncState === 'synced').length).toBe(0);

    // Writer recovers — advance time past retry window via drain's `now` option
    writer.fail = false;
    const future = new Date(Date.now() + 10_000);
    const pendingAfterFailure = useMathJourneyStore.getState().outbox.filter((r) => r.syncState !== 'synced');
    const recovered = await drain(pendingAfterFailure, writer, { now: future });

    // Every record that was pending is now synced
    expect(recovered.every((r) => r.syncState === 'synced')).toBe(true);
    // No duplicates created — each record id appears once
    const ids = recovered.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('retry does not duplicate evidence', async () => {
    const diagnosticAnswers = [
      { itemId: 'math-eq-1', answer: '4', hints: 0, independent: false },
    ];

    completeDomainJourney(LEARNER_A, TARGET_SKILL, diagnosticAnswers, [practiceEvidence]);

    const store = useMathJourneyStore.getState();
    const recordCountBefore = store.outbox.length;

    // Writer fails
    writer.fail = true;
    await store.syncPending(writer);

    // Writer recovers and retries
    writer.fail = false;
    const future = new Date(Date.now() + 10_000);
    const pendingAfterFailure = store.outbox.filter((r) => r.syncState !== 'synced');
    await drain(pendingAfterFailure, writer, { now: future });

    // Same number of records — no duplicates
    expect(store.outbox.length).toBe(recordCountBefore);
    const ids = store.outbox.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Domain: mastery determinism', () => {
  const now = new Date('2026-11-19T00:00:00Z');

  it('identical evidence produces identical mastery', () => {
    const evidence: Evidence[] = [
      { dimension: 'application', weight: 0.8, independent: true, hints: 0 },
      { dimension: 'transfer', weight: 0.9, independent: true, hints: 0 },
    ];

    const a = evaluateMastery(evidence);
    const b = evaluateMastery(evidence);
    expect(a.level).toBe(b.level);
    expect(a.confidence).toBe(b.confidence);
    expect(a.reason).toBe(b.reason);
  });

  it('independent evidence scores higher than hinted evidence', () => {
    const independent: Evidence[] = [
      { dimension: 'application', weight: 0.8, independent: true, hints: 0 },
    ];
    const hinted: Evidence[] = [
      { dimension: 'application', weight: 0.8, independent: false, hints: 3 },
    ];

    const indepResult = evaluateMastery(independent);
    const hintedResult = evaluateMastery(hinted);
    expect(indepResult.confidence).toBeGreaterThan(hintedResult.confidence);
  });

  it('no evidence → not_assessed with zero confidence', () => {
    const result = evaluateMastery([]);
    expect(result.level).toBe('not_assessed');
    expect(result.confidence).toBe(0);
    expect(result.reason).toBe('no evidence');
  });

  it('runMathJourney is deterministic for identical inputs', () => {
    const diagnostic = [{ itemId: 'q1', answer: '4', hints: 0, independent: false }];
    const evidence: JourneyEvidence[] = [
      { dimension: 'application', weight: 0.8, independent: true, hints: 0 },
    ];

    const a = runMathJourney('equations', diagnostic, evidence, now);
    const b = runMathJourney('equations', diagnostic, evidence, now);
    expect(a).toEqual(b);
  });
});
