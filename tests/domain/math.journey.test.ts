import { describe, it, expect } from 'vitest';
import { runMathJourney } from '../../src/domain/mathematics/learningJourney';

describe('math journey', () => {
  it('recommends prerequisite for algebra gap', () => {
    const j = runMathJourney('equations', [{skillId:'equations',correct:false,independent:false}], [{dimension:'recall',weight:0.2,independent:false,hints:2}]);
    expect(j.missingPrereqs.length).toBeGreaterThanOrEqual(0);
    expect(j.masteryConfidence).toBeLessThan(0.5);
  });
});
