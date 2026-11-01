import { type LearningEvidence, type Skill, type MasteryState } from './types';

export function validateSkill(s: Skill): string | null {
  if (!s.id || !s.slug || !s.name) return 'missing required skill fields';
  if (!/^[a-z0-9-]+$/.test(s.slug)) return 'slug must be lowercase slug';
  return null;
}

export function validateEvidence(e: LearningEvidence): string | null {
  if (e.weight < 0 || e.weight > 1) return 'weight out of range';
  if (!e.skillId || !e.learnerId) return 'missing ids';
  return null;
}

export function validateMastery(m: MasteryState): string | null {
  if (m.confidence < 0 || m.confidence > 1) return 'confidence out of range';
  return null;
}
