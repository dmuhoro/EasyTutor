import { describe, it, expect } from 'vitest';
import { validateSkill, validateEvidence, validateMastery } from '../../src/domain/learning/validation';

describe('domain: learning validation', () => {
  it('accepts valid skill', () => {
    expect(validateSkill({ id: 's1', slug: 'algebraic-reasoning', name: 'Algebraic reasoning' })).toBeNull();
  });
  it('rejects bad slug', () => {
    expect(validateSkill({ id: 's1', slug: 'Bad Slug', name: 'x' })).not.toBeNull();
  });
  it('rejects out-of-range evidence weight', () => {
    expect(validateEvidence({ id:'e1', learnerId:'u', skillId:'s', dimension:'recall', weight:1.5, source:'verified', createdAt:new Date().toISOString() })).not.toBeNull();
  });
  it('rejects bad mastery confidence', () => {
    expect(validateMastery({ learnerId:'u', skillId:'s', confidence:2, level:'mastered', lastEvidenceAt:null, needsReview:false })).not.toBeNull();
  });
});
