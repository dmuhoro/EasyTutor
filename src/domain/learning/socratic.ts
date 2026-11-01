// Socratic tutoring foundation

export type InstructionStrategy = 'guided_discovery'|'concept_explanation'|'worked_example'|'hint_based'|'misconception_correction'|'retrieval_practice'|'application'|'transfer'|'reflection';

export interface SocraticTurn { role:'tutor'|'learner'; text:string; hints?:number; evidenceProduced?:string[]; }
export interface SocraticSession { objective:string; skillIds:string[]; strategy:InstructionStrategy; turns:SocraticTurn[]; completed:boolean; }

export const MAX_HINTS = 3;
export function nextHintLevel(hints:number): number { return Math.min(MAX_HINTS, hints+1); }
export function shouldRevealAnswer(hints:number, independent:boolean): boolean { return hints>=MAX_HINTS && !independent; }
