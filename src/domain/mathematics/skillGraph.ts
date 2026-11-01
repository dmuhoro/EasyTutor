export const MATH_SKILLS = ['arithmetic','fractions','negative_numbers','variables','algebraic_expressions','equations','word_problems','applied_problem_solving'] as const;
export type MathSkill = typeof MATH_SKILLS[number];
export const MATH_PREREQ_EDGES: { from: string; to: string }[] = [
  { from: 'arithmetic', to: 'fractions' },
  { from: 'arithmetic', to: 'negative_numbers' },
  { from: 'fractions', to: 'variables' },
  { from: 'negative_numbers', to: 'variables' },
  { from: 'variables', to: 'algebraic_expressions' },
  { from: 'algebraic_expressions', to: 'equations' },
  { from: 'equations', to: 'word_problems' },
  { from: 'word_problems', to: 'applied_problem_solving' },
];
