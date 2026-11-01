// Universal learning domain foundation — dependency-free (no RN/Supabase/AI)
export type CurriculumFrameworkCode = '8-4-4' | 'CBC' | 'CBE' | 'UNIVERSITY' | 'OPEN' | (string & {});

export interface CurriculumFramework {
  id: string;
  code: CurriculumFrameworkCode;
  name: string;
  version: string;
  effectiveFrom: string; // ISO date
}

export interface Skill {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

export type EvidenceDimension =
  | 'recall' | 'understanding' | 'application' | 'analysis'
  | 'reasoning' | 'evaluation' | 'creation' | 'transfer' | 'retention';

export interface LearningEvidence {
  id: string;
  learnerId: string;
  skillId: string;
  dimension: EvidenceDimension;
  weight: number; // 0..1 normalized evidence weight
  source: 'verified' | 'sourced' | 'ai-generated';
  createdAt: string;
}

export interface PrerequisiteEdge {
  fromSkillId: string;
  toSkillId: string;
  kind: 'hard' | 'soft';
}

export interface MasteryState {
  learnerId: string;
  skillId: string;
  confidence: number; // 0..1
  level: 'novice' | 'familiar' | 'proficient' | 'mastered' | 'expert';
  lastEvidenceAt: string | null;
  needsReview: boolean;
}

export type DomainResult<T> = { ok: true; value: T } | { ok: false; reason: string };