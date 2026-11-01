import { evaluateDiagnostic } from '../learning/diagnostic';
import { evaluateMastery } from '../learning/mastery';
import { recommendNext } from '../learning/adaptive-progression';
import { reviewPriority } from '../learning/retention';
import { allPrerequisites, findGaps } from '../learning/prerequisites';
import { MATH_PREREQ_EDGES } from './skillGraph';

export interface JourneyState { targetSkill: string; strengths: string[]; gaps: string[]; missingPrereqs: string[]; recommended: string; masteryConfidence: number; reviewDue: boolean; }

export function runMathJourney(target: string, diagnosticResponses: {skillId:string;correct:boolean;independent:boolean}[], masteryEvidence: {dimension:any;weight:number;independent:boolean;hints:number}[]) {
  const items = diagnosticResponses.map((r,i)=>({id:'d'+i, skillId:r.skillId, difficulty:1}));
  const responses = diagnosticResponses.map((r,i)=>({itemId:'d'+i, correct:r.correct, confidence:r.correct?0.8:0.2, hints:0, independent:r.independent}));
  const prereqEdges = MATH_PREREQ_EDGES.map(e=>({from:e.from,to:e.to}));
  const diag = evaluateDiagnostic(items as any, responses as any, (s:string)=>[...allPrerequisites(s,prereqEdges)]);
  const known = new Set<string>(diag.strengths);
  const gaps = findGaps(target, known, prereqEdges);
  const m = evaluateMastery(masteryEvidence as any);
  const review = reviewPriority({skillId:target,lastReviewedAt:null,confidence:m.confidence,attempts:1}, new Date());
  const rec = recommendNext({recall:m.confidence,application:0.5,transfer:0.3,independence:0.5,hintDependence:0.2,foundationalGap:gaps.length>0});
  return { targetSkill:target, strengths:diag.strengths, gaps:diag.gaps, missingPrereqs:gaps, recommended: gaps.length? (gaps[0] as string) : (rec.action==='harder-transfer-challenge'?target:rec.action), masteryConfidence:m.confidence, reviewDue:review.due } as JourneyState;
}
