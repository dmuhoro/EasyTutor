import type { PortalType } from '../types/canonical';
import { normalizePortalType } from './database/portalFilters';

/**
 * The active portal context is process state owned by the infrastructure
 * layer, not by a UI store. Stores publish into it; governed reads/writes and
 * runtime governance read from it. This keeps `src/infrastructure` free of
 * imports from `store/` (which previously created the largest dependency
 * cycle in the app).
 */
export interface ActivePortalContext {
  learningMode: string | null;
  userId: string | null;
}

export type LearningMode = 'high_school' | 'university' | 'self_directed';

let active: ActivePortalContext = {
  learningMode: null,
  userId: null,
};

export const setActivePortalContext = (next: Partial<ActivePortalContext>): void => {
  active = {
    learningMode: 'learningMode' in next ? next.learningMode ?? null : active.learningMode,
    userId: 'userId' in next ? next.userId ?? null : active.userId,
  };
};

export const getActivePortalContext = (): Readonly<ActivePortalContext> => active;

export const getActiveLearningMode = (): LearningMode | null => {
  const mode = active.learningMode;
  return mode === 'high_school' || mode === 'university' || mode === 'self_directed'
    ? mode
    : null;
};

/**
 * Fails closed when no portal has been resolved. Callers that need the
 * conservative learner portal must pass it explicitly.
 */
export const requireActivePortalType = (): PortalType => normalizePortalType(active.learningMode);

export const resetActivePortalContext = (): void => {
  active = { learningMode: null, userId: null };
};
