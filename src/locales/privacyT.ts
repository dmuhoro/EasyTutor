import { t as baseT } from './index';
import privacyCopy from './privacy.json';

/**
 * Privacy-screen copy resolver. The pack is imported only by the settings
 * route, so the eager English pack (and therefore /login) stays unchanged.
 * Every UI label still goes through a t() lookup; keys are exact, and unknown
 * keys delegate to the shared translator rather than rendering raw text.
 */
export const t = (
  key: string,
  params?: Record<string, string | number>,
): string => {
  const copy = (privacyCopy as Record<string, string | undefined>)[key];
  if (copy === undefined) return baseT(key, params);
  if (!params) return copy;
  return copy.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{{${name}}}`);
};
