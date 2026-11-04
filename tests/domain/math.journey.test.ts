import { describe, it, expect } from 'vitest';
import { runMathJourney } from '../../src/domain/mathematics/learningJourney';

describe('math journey', () => {
  const now = new Date('2026-11-02T00:00:00Z');
  it('recommends a prerequisite when algebra diagnostic is wrong', () => {
    const j = runMathJourney('equations', [{ itemId: 'math-eq-1', answer: '4', hints: 0, independent: false }], [], now);
    expect(j.recommendation.action).toBe('learn-prerequisite');
    expect(j.missingPrereqs.length).toBeGreaterThan(0);
    expect(j.gaps).toContain('equations');
  });
  it('starts guided learning when prereqs are demonstrated but no practice evidence', () => {
    const j = runMathJourney('arithmetic', [{ itemId: 'math-arith-1', answer: '15', hints: 0, independent: true }], [], now);
    expect(j.strengths).toContain('arithmetic');
    expect(j.recommendation.action).toBe('guided-learning');
  });
  it('is deterministic for the same inputs and clock', () => {
    const a = runMathJourney('fractions', [], [], now);
    const b = runMathJourney('fractions', [], [], now);
    expect(a).toEqual(b);
  });
});
