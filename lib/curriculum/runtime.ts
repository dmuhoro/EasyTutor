import kenyaTvetAutomotive from './packs/kenya-tvet-automotive.json';
import type { BundledPackSource } from './runtimeValidation';
import type {
  CurriculumPack,
  CurriculumSubject,
  CurriculumTopic,
} from './schema';

/**
 * Runtime curriculum pack access for the web/PWA bundle.
 *
 * `registry.ts` deliberately uses Node `fs` and remains the authoring/test
 * tool: it can load arbitrary packs from a directory. That module cannot run
 * in a browser bundle, so the shipped app consumes packs imported as JSON at
 * build time. This module has no `fs`/`path` import and never reads the
 * filesystem. `runtimeValidation.ts` applies the same Zod schema and
 * orphan-subject rule to these exact sources in the build/CI gate; only data
 * that passes that gate is shipped here.
 */

export const BUNDLED_PACK_SOURCES: readonly BundledPackSource[] = [
  { file: 'kenya-tvet-automotive.json', data: kenyaTvetAutomotive },
];

/** Bundled, CI-validated packs keyed by ISO country code. */
const PACKS: ReadonlyMap<string, CurriculumPack> = new Map(
  BUNDLED_PACK_SOURCES.map((source) => {
    const pack = source.data as CurriculumPack;
    return [pack.country.toUpperCase(), pack] as const;
  }),
);

function getBundledPack(country: string): CurriculumPack | undefined {
  return PACKS.get(country.trim().toUpperCase());
}

export { getBundledPack };

/** Subjects available for a country. Unknown countries fail closed with an empty list. */
export function subjectsForCountry(country: string): readonly CurriculumSubject[] {
  return getBundledPack(country)?.subjects ?? [];
}

/** Topics for a subject in a country pack. Unknown subject/country fails closed. */
export function topicsForCountry(
  country: string,
  subjectId: string,
): readonly CurriculumTopic[] {
  return getBundledPack(country)?.topics.filter(
    (topic) => topic.subject_id === subjectId,
  ) ?? [];
}

/** True when a validated pack exists for the country. */
export function hasBundledPack(country: string): boolean {
  return getBundledPack(country) !== undefined;
}

/** All bundled packs, for callers that do not need country lookup. */
export function allBundledPacks(): readonly CurriculumPack[] {
  return [...PACKS.values()];
}
