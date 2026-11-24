# Sprint 45 — E7 curriculum runtime

## Directive

Make curriculum packs consumable at runtime in the web/PWA bundle without weakening validation or
the existing fs-based authoring registry tests.

## Work done

- Added `lib/curriculum/runtime.ts` with bundled JSON imports and fail-closed country/subject
  queries, plus `lib/curriculum/runtimeValidation.ts` with Zod validation and the orphan-subject
  cross-check used by the build/CI gate; no Node `fs` or `path` in the browser module.
- Fixed invalid `kicd_ref: null` in the shipped KE pack so it satisfies the unchanged schema.
- Wired the runtime into the live tutor system prompt through `services/curriculumPrompt.ts` with
  an explicit DRAFT/non-official label; the first wiring failed the login budget at 734,373 B, so
  the import was moved onto the learner screen and the budget now passes at 732,989 / 733,000 B.
- Added `tests/lib/curriculum/runtime.test.ts` (5 tests), including a changed-cwd import test and
  a red/green negative control on the orphan check. `tests/lib/curriculum/registry.test.ts` is
  untouched.
- Advanced C26, GT-02 and E7-T1 to `VERIFIED-LOCAL`; V1-ACADEMIC 5.2 → 10.1 %.

## Evidence

`docs/evidence/E7-curriculum-runtime.md`. Full gate green on the branch before push: typecheck 0,
lint 0 errors, all tests pass, boundaries 0, AI boundary PASS, readiness check 0, build 0, QA all
systems verified, login 732,989 / 733,000 B PASS.

## Honest handover

GT-22 (diagram primitive) is a separate acceptance row and is not touched here. The KE pack is a
DRAFT topic index, not an authoritative syllabus; no official curriculum data is asserted.
