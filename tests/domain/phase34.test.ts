import { describe, it, expect } from 'vitest';
import { evaluateDiagnostic } from '../../src/domain/learning/diagnostic';
import { nextHintLevel, shouldRevealAnswer } from '../../src/domain/learning/socratic';
import { outcomeToSkills } from '../../src/domain/curriculum/types';

describe('phase3 diagnostic', () => {
  it('identifies gaps and prereqs', () => {
    const items=[{id:'q1',skillId:'alg',difficulty:1},{id:'q2',skillId:'frac',difficulty:1}];
    const res=[{itemId:'q1',correct:false,confidence:0.2,hints:2,independent:false},{itemId:'q2',correct:true,confidence:0.8,hints:0,independent:true}];
    const r=evaluateDiagnostic(items,res,s=>['arith']);
    expect(r.gaps).toContain('alg');
    expect(r.strengths).toContain('frac');
    expect(r.missingPrereqs).toContain('arith');
  });
});
describe('phase3 socratic', () => {
  it('hint escalation', ()=>{ expect(nextHintLevel(1)).toBe(2); expect(shouldRevealAnswer(3,true)).toBe(false); expect(shouldRevealAnswer(3,false)).toBe(true); });
});
describe('phase4 curriculum', () => {
  it('dedups skills', ()=> expect(outcomeToSkills({id:'o',frameworkId:'f',subject:'m',text:'x',skillIds:['a','a','b'],provenance:'verified'})).toEqual(['a','b']));
});
