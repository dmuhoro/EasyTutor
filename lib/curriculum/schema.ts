import { z } from 'zod';

/**
 * CURRICULUM PACK SCHEMA (Constitution Article II-compliant data layer)
 *
 * Curriculum packs are DATA, never hard-coded. Each pack describes one
 * national/regional education system and is versioned. Packs are validated on
 * load; any pack that fails validation is rejected with a clear error so the
 * app never ships malformed curriculum data.
 *
 * Fields:
 *  - country: ISO-3166-1 alpha-2 code (KE, NG, GH, UG, TZ, ET, ZA, ...)
 *  - level: secondary | tvet | university | self_learner
 *  - board: examining body / awarding organisation (e.g. KICD, WAEC, IGCSE)
 *  - subjects: array of subject definitions
 *  - topics: array of topic definitions linked to subjects by subject_id
 *  - source_status: OFFICIAL | COMMUNITY | DRAFT (DRAFT = needs human review)
 *  - version: semver string
 *
 * No syllabi, exam boards, or grading schemes are invented here. A pack marked
 * DRAFT is explicitly unverified and must be reviewed by Daniel before it is
 * treated as authoritative.
 */

export const CurriculumTopicSchema = z.object({
  id: z.string().min(1, 'topic id is required'),
  subject_id: z.string().min(1, 'subject_id is required'),
  title: z.string().min(1, 'topic title is required'),
  form_level: z.string().optional(),
  sort_order: z.number().int().nonnegative().default(0),
  subtopics: z.array(z.string()).default([]),
});

export const CurriculumSubjectSchema = z.object({
  id: z.string().min(1, 'subject id is required'),
  name: z.string().min(1, 'subject name is required'),
  level: z.enum(['secondary', 'tvet', 'university', 'self_learner']),
  icon: z.string().optional(),
  description: z.string().optional(),
  kicd_ref: z.string().optional(),
});

export const CurriculumPackSchema = z.object({
  country: z
    .string()
    .length(2, 'country must be a 2-letter ISO-3166-1 code')
    .toUpperCase(),
  level: z.enum(['secondary', 'tvet', 'university', 'self_learner']),
  board: z.string().min(1, 'board is required'),
  subjects: z.array(CurriculumSubjectSchema).min(1, 'at least one subject required'),
  topics: z.array(CurriculumTopicSchema).default([]),
  source_status: z.enum(['OFFICIAL', 'COMMUNITY', 'DRAFT']),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version must be semver (e.g. 0.1.0)'),
});

export type CurriculumTopic = z.infer<typeof CurriculumTopicSchema>;
export type CurriculumSubject = z.infer<typeof CurriculumSubjectSchema>;
export type CurriculumPack = z.infer<typeof CurriculumPackSchema>;

/**
 * Validate a curriculum pack object. Returns the parsed pack on success, or
 * throws a ZodError with a detailed issue list on failure. Never silently
 * coerces invalid data.
 */
export const validateCurriculumPack = (input: unknown): CurriculumPack => {
  return CurriculumPackSchema.parse(input);
};

/**
 * Safe variant that returns { ok, pack } / { ok: false, errors } without
 * throwing. Useful for UI-facing validation messages.
 */
export const safeValidateCurriculumPack = (input: unknown): {
  ok: true;
  pack: CurriculumPack;
} | {
  ok: false;
  errors: z.ZodIssue[];
} => {
  const result = CurriculumPackSchema.safeParse(input);
  if (result.success) return { ok: true, pack: result.data };
  return { ok: false, errors: result.error.issues };
};

/**
 * Extract all subject_ids declared in a pack's topics, for cross-reference
 * validation (every topic.subject_id must reference a declared subject).
 */
export const packSubjectIds = (pack: CurriculumPack): Set<string> =>
  new Set(pack.subjects.map((s) => s.id));

export const packTopicSubjectIds = (pack: CurriculumPack): Set<string> =>
  new Set(pack.topics.map((t) => t.subject_id));
