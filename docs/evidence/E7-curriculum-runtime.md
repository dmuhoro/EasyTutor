# E7 — curriculum packs consumed at runtime (2026-11-24)

## Real defect

`lib/curriculum/registry.ts` loads packs with Node `fs`/`path` and had zero consumers, so no
browser/PWA path could read a curriculum pack (C26, GT-02, E7-T1). The shipped pack also had
`kicd_ref: null` where the Zod schema requires an optional string, so it could never validate.

## Fix

- Added `lib/curriculum/runtime.ts`: explicit JSON imports of bundled packs, no `fs`/`path` and no
  filesystem reads; unknown countries fail closed to empty lists. `lib/curriculum/runtimeValidation.ts`
  applies the **same** Zod schema and orphan-subject cross-reference to those exact sources in the
  build/CI gate. Validation was split out of the browser graph because a first attempt pulled Zod
  into the login chunk and failed the 733,000 B budget (734,373 B); no threshold was raised.
- Corrected `lib/curriculum/packs/kenya-tvet-automotive.json` by removing the invalid `null` field.
  The schema was not weakened.
- Wired a real consumer: `services/curriculumPrompt.ts` builds a clearly labelled DRAFT topic index
  from the learner's country (and subject when matched); `screens/tutor/session.tsx` passes it into
  the live `buildSystemPrompt` call. Keeping the import on the learner screen, off the shared
  prompt module, restored the login budget to **732,989 / 733,000 B PASS**.

## Proof

`npm run test -- tests/lib/curriculum/runtime.test.ts` — **1 file / 5 tests passed**:

1. the runtime module has no `fs`/`path` import;
2. with `process.cwd()` moved to an empty temp directory (no `lib/curriculum/packs`), a fresh
   import still loads and validates the KE pack with zero errors;
3. country/subject/topic queries work and return empty for unknown codes;
4. malformed packs and orphan topic references are rejected at the real validation boundary;
5. the live `buildSystemPrompt` includes the DRAFT index (via `buildCurriculumPrompt`) for KE but
   not for an unknown country.

**Negative control:** with the orphan-subject check disabled in `lib/curriculum/runtimeValidation.ts`, the
same suite failed 1/5 with the expected `undeclared subject_id` assertion. The production file was
restored byte-for-byte and the suite returned to 5/5. No test was weakened, skipped or renamed.

## Rows advanced

C26, GT-02 and E7-T1 → `VERIFIED-LOCAL`. V1-ACADEMIC **5.2 → 10.1 %**; other milestones
unchanged; all remain `READY=NO`. `VERIFIED-IN-CI` withheld until the pushed PR head is green.
