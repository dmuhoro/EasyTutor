import { describe, expect, it } from 'vitest';
import { runMathJourney } from '../../src/domain/mathematics/learningJourney';
import { runPhysicsJourney } from '../../src/domain/physics/learningJourney';
import { PHYSICS_DIAGNOSTIC_BANK, scorePhysicsDiagnostic } from '../../src/domain/physics/diagnosticBank';
import { projectJourneyCanonicalState } from '../../src/domain/learning/canonicalJourney';
import { runSubjectJourney } from '../../src/domain/learning/subjectJourney';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const EVIDENCE = [
  { dimension: 'application' as const, weight: 0.9, independent: true, hints: 0 },
  { dimension: 'transfer' as const, weight: 0.9, independent: true, hints: 0 },
];

describe('E12 — second subject through the same state machine', () => {
  it('drives Physics fixtures through the shared journey and canonical selector', () => {
    const physics = runPhysicsJourney('forces', [
      { itemId: PHYSICS_DIAGNOSTIC_BANK[0].id, answer: '5', hints: 0, independent: true },
    ], EVIDENCE, NOW);

    expect(physics.strengths).toEqual(['motion']);
    expect(physics.gaps).toEqual([]);
    expect(physics.missingPrereqs).toEqual([]);
    expect(physics.recommendation).toEqual({
      action: 'review',
      skillId: 'forces',
      reason: 'Mastery evidence exists; schedule retrieval review.',
    });
    expect(physics.reviewDue).toBe(true);

    const state = projectJourneyCanonicalState({
      learnerId: 'learner-physics', subjectId: 'physics', journey: physics, evidence: EVIDENCE, pendingSyncCount: 0,
    });
    expect(state).toMatchObject({
      subjectId: 'physics', targetSkill: 'forces', recommendationAction: 'review', syncState: 'synced', evidenceCount: 2,
    });
  });

  it('applies the same prerequisite policy to Mathematics', () => {
    const math = runMathJourney('equations', [], EVIDENCE, NOW);
    expect(math.missingPrereqs).toContain('arithmetic');
    expect(math.recommendation.action).toBe('learn-prerequisite');
    expect(math.recommendation.skillId).toBe(math.missingPrereqs[0]);
    expect(math.targetSkill).toBe('equations');
  });

  it('fails closed on a missing prerequisite: the recommendation changes with the graph', () => {
    const input = {
      target: 'forces',
      items: PHYSICS_DIAGNOSTIC_BANK,
      responses: [{ itemId: PHYSICS_DIAGNOSTIC_BANK[1].id, answer: '6', hints: 0, independent: true }],
      score: scorePhysicsDiagnostic,
      edges: [{ from: 'motion', to: 'forces' }],
      evidence: EVIDENCE,
      now: NOW,
    };
    const blocked = runSubjectJourney(input);
    expect(blocked.missingPrereqs).toEqual(['motion']);
    expect(blocked.recommendation.action).toBe('learn-prerequisite');

    const unlocked = runSubjectJourney({ ...input, responses: [
      { itemId: PHYSICS_DIAGNOSTIC_BANK[0].id, answer: '5', hints: 0, independent: true },
    ] });
    expect(unlocked.missingPrereqs).toEqual([]);
    expect(unlocked.recommendation.action).toBe('review');
  });
});
