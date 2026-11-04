import type { PortalType } from '../../types/canonical';

/**
 * Learning mode is a product concept. It lives in the domain layer so the
 * store, services and infrastructure can share it without importing each
 * other or depending on a React store.
 */
export type LearningMode = 'high_school' | 'university' | 'self_directed';

export const portalFromMode = (mode: LearningMode): PortalType => {
  if (mode === 'university') return 'university';
  if (mode === 'self_directed') return 'knowledge_explorer';
  return 'high_school';
};

export const isLearningMode = (value: unknown): value is LearningMode =>
  value === 'high_school' || value === 'university' || value === 'self_directed';
