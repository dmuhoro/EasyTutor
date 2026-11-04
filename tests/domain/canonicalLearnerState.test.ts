import { describe, it, expect } from 'vitest';
import { projectCanonicalLearnerState } from '../../src/domain/learning/canonicalLearnerState';

describe('canonical learner state projection', () => {
  it('is deterministic and reflects evidence count/sync', () => {
    const a = projectCanonicalLearnerState({
      learnerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      subjectId: 'mathematics',
      targetSkill: 'fractions',
      strengths: ['arithmetic'],
      gaps: [],
      untested: [],
      missingPrerequisites: [],
      recommendationAction: 'practice',
      recommendationReason: 'more practice',
      masteryConfidence: 0.7,
      reviewDue: false,
      evidence: [{ dimension: 'application', weight: 0.8, independent: true, hints: 0 }],
      pendingSyncCount: 0,
    });
    const b = projectCanonicalLearnerState({
      learnerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      subjectId: 'mathematics',
      targetSkill: 'fractions',
      strengths: ['arithmetic'],
      gaps: [],
      untested: [],
      missingPrerequisites: [],
      recommendationAction: 'practice',
      recommendationReason: 'more practice',
      masteryConfidence: 0.7,
      reviewDue: false,
      evidence: [{ dimension: 'application', weight: 0.8, independent: true, hints: 0 }],
      pendingSyncCount: 0,
    });
    expect(a).toEqual(b);
    expect(a.evidenceCount).toBe(1);
    expect(a.syncState).toBe('synced');
  });

  it('marks pending sync honestly', () => {
    const s = projectCanonicalLearnerState({
      learnerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      subjectId: 'mathematics',
      targetSkill: 'fractions',
      strengths: [],
      gaps: [],
      untested: [],
      missingPrerequisites: [],
      recommendationAction: null,
      recommendationReason: null,
      masteryConfidence: 0,
      reviewDue: false,
      evidence: [],
      pendingSyncCount: 2,
    });
    expect(s.syncState).toBe('pending');
    expect(s.masteryConfidence).toBe(0);
  });
});
