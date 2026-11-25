export const PHYSICS_SKILLS = ['motion', 'forces', 'energy', 'circuits'] as const;
export type PhysicsSkill = typeof PHYSICS_SKILLS[number];

export const PHYSICS_PREREQ_EDGES: { from: string; to: string }[] = [
  { from: 'motion', to: 'forces' },
  { from: 'forces', to: 'energy' },
  { from: 'energy', to: 'circuits' },
];
