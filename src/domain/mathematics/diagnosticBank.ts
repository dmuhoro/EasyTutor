import type { EvidenceDimension } from '../learning/types';

export interface MathDiagnosticItem {
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

export const MATH_DIAGNOSTIC_BANK: MathDiagnosticItem[] = [
  { id: 'math-arith-1', version: 1, skillId: 'arithmetic', prompt: 'What is 7 + 8?', answer: '15', difficulty: 1, dimension: 'recall', provenance: 'internally_authored', validation: 'provisional' },
  { id: 'math-frac-1', version: 1, skillId: 'fractions', prompt: 'What is 1/2 + 1/4? (answer as a fraction)', answer: '3/4', difficulty: 1, dimension: 'application', provenance: 'internally_authored', validation: 'provisional' },
  { id: 'math-neg-1', version: 1, skillId: 'negative_numbers', prompt: 'What is -3 + 5?', answer: '2', difficulty: 1, dimension: 'recall', provenance: 'internally_authored', validation: 'provisional' },
  { id: 'math-eq-1', version: 1, skillId: 'equations', prompt: 'Solve x + 4 = 9', answer: '5', difficulty: 2, dimension: 'application', provenance: 'internally_authored', validation: 'provisional' },
  { id: 'math-word-1', version: 1, skillId: 'word_problems', prompt: 'A book costs 5 and a pen costs 3. What is the total cost?', answer: '8', difficulty: 2, dimension: 'application', provenance: 'internally_authored', validation: 'provisional' },
];

export interface MathDiagnosticResponse { itemId: string; answer: string; hints: number; independent: boolean; }

export function scoreMathDiagnostic(items: MathDiagnosticItem[], responses: MathDiagnosticResponse[]) {
  const bySkill: Record<string, { correct: number; total: number; untested: boolean }> = {};
  for (const item of items) bySkill[item.skillId] ??= { correct: 0, total: 0, untested: true };
  for (const r of responses) {
    const item = items.find(i => i.id === r.itemId);
    if (!item) continue;
    const s = bySkill[item.skillId];
    s.total += 1;
    s.untested = false;
    if (r.answer.trim().toLowerCase() === item.answer.trim().toLowerCase() && r.independent) s.correct += 1;
  }
  const strengths: string[] = [];
  const gaps: string[] = [];
  const untested: string[] = [];
  for (const [skill, s] of Object.entries(bySkill)) {
    if (s.untested) { untested.push(skill); continue; }
    if (s.total > 0 && s.correct / s.total >= 0.7) strengths.push(skill); else gaps.push(skill);
  }
  return { strengths, gaps, untested };
}
