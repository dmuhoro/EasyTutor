import { MOTION } from './tokens';

/**
 * Hook that returns whether the user prefers reduced motion.
 *
 * Respects the platform `prefers-reduced-motion` setting. Components should
 * gate animated durations, fades, carousels and haptics behind this hook so
 * motion-impaired users get instant transitions.
 */
export function useReducedMotion(): boolean {
  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      // fall through to default below
    }
  }
  return false;
}

/**
 * Return the animation duration for a given kind, collapsed to zero when the
 * user prefers reduced motion.
 */
export const motionDuration = (reducedMotion: boolean, kind: 'fast' | 'base' | 'slow'): number => {
  return reducedMotion ? MOTION.reduced[kind] : MOTION.full[kind];
};
