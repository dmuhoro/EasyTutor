import { describe, expect, it } from 'vitest';
import { projectCanonicalLearnerState } from '../../src/domain/learning/canonicalLearnerState';
import { projectJourneyCanonicalState } from '../../src/domain/learning/canonicalJourney';
import { runMathJourney, type JourneyEvidence } from '../../src/domain/mathematics/learningJourney';
import { runPhysicsJourney } from '../../src/domain/physics/learningJourney';
import { PHYSICS_DIAGNOSTIC_BANK } from '../../src/domain/physics/diagnosticBank';

const evidence: JourneyEvidence[] = [
  { dimension: 'application', weight: 0.9, independent: true, hints: 0 },
  { dimension: 'transfer', weight: 0.9, independent: true, hints: 0 },
];

describe('C22 — canonical learner state consumers', () => {
  it('projects the math journey through the single canonical selector', () => {
    const journey = runMathJourney('equations', [], evidence, new Date('2026-01-01'));
    const project = projectJourneyCanonicalState({
      learnerId: 'learner-1', subjectId: 'mathematics', journey, evidence: [], pendingSyncCount: 2, stateVersion: 7,
    });
    expect(project.targetSkill).toBe('equations');
    expect(project.missingPrerequisites).toEqual(journey.missingPrereqs);
    expect(project.missingPrerequisites).toContain('arithmetic');
    expect(project.recommendationAction).toBe('learn-prerequisite');
    expect(project.masteryConfidence).toBeCloseTo(journey.masteryConfidence);
    expect(project.syncState).toBe('pending');
    expect(project.stateVersion).toBe(7);
  });

  it('uses the same state machine and canonical projection for a second subject', () => {
    const mathJourney = runMathJourney('algebraic_expressions', [], evidence, new Date('2026-01-01'));
    const physicsJourney = runPhysicsJourney('forces', [
      { itemId: PHYSICS_DIAGNOSTIC_BANK[0].id, answer: '5', hints: 0, independent: true },
    ], evidence, new Date('2026-01-01'));
    expect(mathJourney.missingPrereqs).toContain('arithmetic');
    expect(mathJourney.recommendation.action).toBe('learn-prerequisite');
    expect(physicsJourney.strengths).toContain('motion');
    expect(physicsJourney.missingPrereqs).toEqual([]);
    expect(physicsJourney.recommendation.action).toBe('review');

    const math = projectJourneyCanonicalState({ learnerId: null, subjectId: 'mathematics', journey: mathJourney, evidence: [], pendingSyncCount: 0 });
    const physics = projectJourneyCanonicalState({ learnerId: null, subjectId: 'physics', journey: physicsJourney, evidence: [], pendingSyncCount: 0 });
    expect(math.subjectId).toBe('mathematics');
    expect(physics.subjectId).toBe('physics');
    expect(physics.strengths).toEqual(['motion']);
    expect(physics.recommendationAction).toBe('review');
    expect(math.syncState).toBe('local');
    expect(physics.syncState).toBe('local');
  });

  it('does not alter the canonical contract when projecting a journey', () => {
    const journey = runPhysicsJourney('motion', [], [], new Date('2026-01-01'));
    expect(journey.recommendation.action).toBe('guided-learning');
    const viaJourney = projectJourneyCanonicalState({
      learnerId: 'learner-2', subjectId: 'physics', journey, evidence: [], pendingSyncCount: 0,
    });
    const direct = projectCanonicalLearnerState({
      learnerId: 'learner-2',
      subjectId: 'physics',
      targetSkill: journey.targetSkill,
      strengths: journey.strengths,
      gaps: journey.gaps,
      untested: journey.untested,
      missingPrerequisites: journey.missingPrereqs,
      recommendationAction: journey.recommendation.action,
      recommendationReason: journey.recommendation.reason,
      masteryConfidence: journey.masteryConfidence,
      reviewDue: journey.reviewDue,
      evidence: [],
      pendingSyncCount: 0,
    });
    expect(viaJourney).toEqual(direct);
  });
});
