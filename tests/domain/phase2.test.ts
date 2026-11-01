import { describe, it, expect } from 'vitest';
import { hasCycle, allPrerequisites, findGaps, paths } from '../../src/domain/learning/prerequisites';
import { evaluateMastery } from '../../src/domain/learning/mastery';
import { recommendNext } from '../../src/domain/learning/adaptive-progression';
import { reviewPriority } from '../../src/domain/learning/retention';

describe('phase2 prerequisites', () => {
  const skills=['a','b','c'];
  const edges=[{from:'b',to:'a'},{from:'c',to:'b'}];
  it('detects no cycle', ()=> expect(hasCycle(skills,edges)).toBe(false));
  it('detects cycle', ()=> expect(hasCycle(['x','y'],[{from:'x',to:'y'},{from:'y',to:'x'}])).toBe(true));
  it('allPrereqs', ()=> expect([...allPrerequisites('a',edges)].sort()).toEqual(['b','c']));
  it('gaps', ()=> expect(findGaps('a',new Set(['c']),edges)).toEqual(['b']));
  it('paths', ()=> expect(paths('a',edges).length).toBe(1));
});

describe('phase2 mastery', () => {
  it('not assessed empty', ()=> expect(evaluateMastery([]).level).toBe('not_assessed'));
  it('advanced transfer', ()=> expect(evaluateMastery([{dimension:'transfer',weight:1,independent:true,hints:0},{dimension:'application',weight:1,independent:true,hints:0}]).level).toBe('advanced'));
  it('recall only not advanced', ()=> expect(evaluateMastery([{dimension:'recall',weight:1,independent:true,hints:0}]).level).not.toBe('advanced'));
});

describe('phase2 adaptive', () => {
  it('foundational gap', ()=> expect(recommendNext({recall:.9,application:.9,transfer:.9,independence:.9,hintDependence:.1,foundationalGap:true}).action).toBe('remediate-prerequisite'));
  it('hint dependence', ()=> expect(recommendNext({recall:.9,application:.9,transfer:.4,independence:.3,hintDependence:.8,foundationalGap:false}).action).toBe('guided-practice-reduce-hints'));
});

describe('phase2 retention', () => {
  it('old item due', ()=> {
    const d = reviewPriority({skillId:'s',lastReviewedAt:new Date(Date.now()-60*86400000).toISOString(),confidence:0.3,attempts:1},new Date());
    expect(d.due).toBe(true);
  });
});
