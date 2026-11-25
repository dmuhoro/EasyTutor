import { z } from 'zod';
import {
  safeValidateCurriculumPack,
  packSubjectIds,
  packTopicSubjectIds,
  type CurriculumPack,
} from './schema';

/**
 * Zod validation of bundled curriculum packs. This module is used by tests and
 * build/CI gates; it is deliberately NOT imported by the browser runtime so
 * the login chunk does not pay for a second validator. The shipped data must
 * pass `validatePackSources(BUNDLED_PACK_SOURCES)` with zero errors before it
 * is consumed by `runtime.ts`.
 */

export interface BundledPackSource {
  file: string;
  data: unknown;
}

export interface BundledPackLoadResult {
  packs: Map<string, { pack: CurriculumPack; sourceFile: string; loadedAt: string }>;
  errors: Array<{ file: string; errors: z.ZodIssue[] }>;
}

export function validatePackSources(
  sources: readonly BundledPackSource[],
  loadedAt: string = new Date().toISOString(),
): BundledPackLoadResult {
  const packs: BundledPackLoadResult['packs'] = new Map();
  const errors: BundledPackLoadResult['errors'] = [];

  for (const source of sources) {
    const validated = safeValidateCurriculumPack(source.data);
    if (!validated.ok) {
      errors.push({ file: source.file, errors: validated.errors });
      continue;
    }

    const subjectIds = packSubjectIds(validated.pack);
    const orphanSubjectIds = [...packTopicSubjectIds(validated.pack)].filter(
      (subjectId) => !subjectIds.has(subjectId),
    );
    if (orphanSubjectIds.length > 0) {
      errors.push({
        file: source.file,
        errors: [{
          code: 'custom',
          path: ['topics'],
          message: `topic(s) reference undeclared subject_id(s): ${orphanSubjectIds.join(', ')}`,
        } as z.ZodIssue],
      });
      continue;
    }

    packs.set(validated.pack.country.toUpperCase(), {
      pack: validated.pack,
      sourceFile: source.file,
      loadedAt,
    });
  }

  return { packs, errors };
}
