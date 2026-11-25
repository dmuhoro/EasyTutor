import type { EvidenceDimension } from '../learning/types';

export interface PhysicsDiagnosticItem {
  id: string;
  version: 1;
  skillId: string;
  prompt: string;
  answer: string;
  difficulty: 1 | 2 | 3;
  dimension: EvidenceDimension;
  provenance: 'internally_authored';
  validation: 'provisional';
}

/** Provisional, internally authored probes — not a certified curriculum bank. */
export const PHYSICS_DIAGNOSTIC_BANK: PhysicsDiagnosticItem[] = [
  { id: 'phys-motion-1', version: 1, skillId: 'motion', prompt: 'A body moves 20 m in 4 s. What is its average speed in m/s?', answer: '5', difficulty: 1, dimension: 'recall', provenance: 'internally_authored', validation: 'provisional' },
  { id: 'phys-force-1', version: 1, skillId: 'forces', prompt: 'A 2 kg mass accelerates at 3 m/s². What net force acts on it, in N?', answer: '6', difficulty: 2, dimension: 'application', provenance: 'internally_authored', validation: 'provisional' },
  { id: 'phys-energy-1', version: 1, skillId: 'energy', prompt: 'What is the kinetic energy, in J, of a 2 kg mass moving at 3 m/s?', answer: '9', difficulty: 2, dimension: 'application', provenance: 'internally_authored', validation: 'provisional' },
  { id: 'phys-circuit-1', version: 1, skillId: 'circuits', prompt: 'A 12 V supply drives a 4 Ω resistor. What current flows, in A?', answer: '3', difficulty: 2, dimension: 'application', provenance: 'internally_authored', validation: 'provisional' },
];

export interface PhysicsDiagnosticResponse {
  itemId: string;
  answer: string;
  hints: number;
  independent: boolean;
}

export function scorePhysicsDiagnostic(
  items: readonly PhysicsDiagnosticItem[],
  responses: readonly PhysicsDiagnosticResponse[],
): { strengths: string[]; gaps: string[]; untested: string[] } {
  const bySkill: Record<string, { correct: number; total: number; untested: boolean }> = {};
  for (const item of items) bySkill[item.skillId] ??= { correct: 0, total: 0, untested: true };
  for (const response of responses) {
    const item = items.find((candidate) => candidate.id === response.itemId);
    if (!item) continue;
    const skill = bySkill[item.skillId];
    skill.total += 1;
    skill.untested = false;
    if (response.answer.trim().toLowerCase() === item.answer.trim().toLowerCase() && response.independent) {
      skill.correct += 1;
    }
  }
  const strengths: string[] = [];
  const gaps: string[] = [];
  const untested: string[] = [];
  for (const [skill, value] of Object.entries(bySkill)) {
    if (value.untested) { untested.push(skill); continue; }
    if (value.total > 0 && value.correct / value.total >= 0.7) strengths.push(skill); else gaps.push(skill);
  }
  return { strengths, gaps, untested };
}
