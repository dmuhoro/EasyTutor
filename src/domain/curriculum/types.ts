// Curriculum registry foundation

export type Provenance = 'verified'|'sourced'|'ai-generated'|'unverified';

export interface CurriculumFramework { id:string; code:string; name:string; version:string; jurisdiction:string; effectiveFrom:string; provenance:Provenance; }
export interface LearningOutcome { id:string; frameworkId:string; subject:string; text:string; skillIds:string[]; provenance:Provenance; }
export interface CurriculumAdapter { id:string; frameworkCode:string; importOutcomes(raw:any[]): LearningOutcome[]; validate(outcomes:LearningOutcome[]): string[]; }

export function outcomeToSkills(outcome: LearningOutcome): string[] { return [...new Set(outcome.skillIds)]; }
