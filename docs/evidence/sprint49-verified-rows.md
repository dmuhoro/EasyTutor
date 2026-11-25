# Sprint 49 — proof-first promotion of already-implemented rows

26 rows were promoted to `VERIFIED-LOCAL` only after their acceptance was executed locally in this
tree on 2026-11-25. Eight further candidates were **rejected** when the executed command did not
prove the row's own claim. No threshold, budget, timeout or assertion was weakened; where a named
acceptance was unusable or weaker, the replacement is justified below.

## Promotions — acceptance commands executed (all exit 0)

| Row(s) | Command | Result |
|---|---|---|
| C07 | `npm run test -- tests/flows/import.noEmbeddings.test.ts` | 2/2 (replaces weaker chunker-only acceptance) |
| C15 | `npm run test -- tests/flows/mockExam.test.ts` | 6/6, per-question worked explanations asserted |
| GT-05, E10-T1 | `npm run test -- tests/domain/canonicalState.consumers.test.ts` | 3/3, wrapper equals the direct canonical projection |
| C24, E12-T1, E12-T2 | `npm run test -- tests/flows/secondSubject.test.ts` | 3/3, Physics uses the same state machine |
| C29 | `npm run test -- tests/flows/offlineSync.test.ts` | 3/3, dedupe + replay once + failed item retained |
| C32 | `npm run test -- tests/flows/lowData.test.tsx` | 3/3 (register path corrected from `.ts` to `.tsx`) |
| C42, E1-T2..T5 | `npm run test -- tests/flows/aiProxy.cors.test.ts` | 7/7, including 429 and disallowed-origin CORS |
| C43, E6-T3 | `npm run test -- tests/flows/cost.model.test.ts` | 2/2, non-zero token-derived cost; offline rail zero |
| E3-T1 | `npm run test -- tests/flows/quiz.wrongAnswers.test.ts` | 5/5 (20 consecutive runs in sprint 48) |
| E4-T2, E4-T3 | `npm run test -- tests/flows/privacy.surface.test.ts` | 8/8 |
| E7-T3 | `npm run test -- tests/lib/curriculum/runtime.test.ts` | 5/5, KCSE and university packs seeded |
| E8-T3..T5 | `npm run test -- tests/flows/mockExam.test.ts` | 6/6, assembly, deterministic marking, worked review |
| E1-T6 | `grep -q ALLOWED_ORIGINS .env.example` | exit 0, name only, no value |
| E2-T3 | `node scripts/readiness/check-pr-checks.mjs 23` | PASS; run `45566265809` |
| E2-T4 | workflow read + `docs/evidence/E2-T4.md` | trace-upload step present in the committed workflow |

## Rejected promotions — executed but not sufficient

These rows stay at their previous status. The command ran green; the claim did not follow from it.

| Row | Why it was not promoted |
|---|---|
| C05 | `semanticChunker.test.ts` proves text splitting, not owned/private import of the learner's own notes/books. |
| C22 | The title claims canonical state on **all screens**; the test proves the projection and its Math/Physics consumers, not the remaining screen surfaces (E10-T2 is still open). |
| C30, GT-15 | Pack-key parity does not prove every routed screen uses `t()`, nor 9/40 screen coverage; raw hex and non-`t()` literals remain. |
| GT-10 | The budget gate passes at 732,983 / 733,000 B, but the row claims **241 B** headroom; actual headroom is 17 B. A true gate does not make a stale headline true. |
| E5-T2 | `npm audit --audit-level=critical` proves 0 critical, not that critical **and reachable highs** were fixed; E5-T1 classification is open and 33 non-critical advisories remain. |
| E7-T2 | The runtime test asserts a `DRAFT` string in the pack index, not that `source_status` is surfaced in UI. |
| E8-T2 | `mockExam.test.ts` has no timer assertion; it does not prove an exam timer. |

## Acceptance changes (justified, never weakened)

- **C07**: the named chunker test proves chunking only; the shipped claim is fail-closed optional
  embeddings. The replacement stubs `generateEmbedding` to `null` and asserts 50 USER_PRIVATE chunks
  are stored, retrieved and cited through FTS. Stronger proof of the same claim.
- **C15**: the named worked-solution test did not exist; `mockExam.test.ts` asserts
  `perQuestion[0].explanation` against the real mark scheme.
- **E2-T3**: `gh pr checks --required` exits 1 here with "no required checks reported"; the
  all-checks gate refuses empty, pending, failing or skipped checks.
- **C32**: the register pointed at `lowData.test.ts`; the JSX test must be `.tsx`. Path corrected.

## Budget-safe implementation note

The first shared-journey implementation pushed the login route to 733,009–733,050 B. Rather than
raise the unchanged 733,000 B budget, the journey state machine was co-located with the already
bundled canonical learner-state module and the `subjectJourney.ts` entry point became a type-safe
re-export. Re-measured transfer is **732,983 / 733,000 B PASS** (17 B headroom), identical to the
pre-slice baseline. No budget, timeout or threshold was changed.

Rows still open include GT-06, GT-13, C20/GT-14, C21, C16/GT-22, C28/GT-04/E9 countdown,
raw-hex, a11y, mobile Lighthouse, staging, credentials and decisions. `VERIFIED-LOCAL` is not
`VERIFIED-IN-CI`; the promoted rows need a pushed green run before the register may claim CI proof.
