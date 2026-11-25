# Sprint 60 — due reviews surfaced on Home (C20 / GT-14)

Branch `feat/spaced-repetition-surface`. The real Home screen
(`screens/tabs/index.tsx`) now reads the signed-in learner's retention store and calls
the real `getDueReviews` selector from `lib/spacedRepetitionEngine.ts`. Due items are
rendered from engine data only; an empty store or a failed read renders no false section.
The failed read is logged as `HOME_due_reviews_failed` and the governed exam-date read
beside it is unchanged.

## Red before green

`tests/flows/spacedRepetition.surface.test.ts` mounts the real Home screen and controls
only the injected retention store — `getDueReviews`, the date filter and the screen are
real. First run against the unfixed screen: **2 failed / 1 passed**, with
`expected "vi.fn()" to be called with arguments: [ 'learner-9' ]` and
`expected "vi.fn()" to be called with arguments: [ 'HOME_due_reviews_failed', Anything ]`.
After the change: **3 passed**. No assertion, timeout or selector was weakened.

Adversarial cases:

1. One due topic and one future topic → only the due topic is rendered, and the store is
   opened for `learner-9`.
2. Only a future topic → no due-review section and no invented content.
3. Store read throws → `logError('HOME_due_reviews_failed', …)` and no due-review section.

## Budget and translation discipline

- New locale keys (`dueReviews`/`reviewsDue`) first breached the unchanged 733,000 B login
  ratchet at 733,031 B. They were removed; existing translated `review` and `flagged`
  keys are reused. No en/sw/fr key was added or changed.
- A per-review navigation button was also removed (733,028 B → 733,027 B was not enough
  on its own); it is not required by the acceptance. The final measurement is
  **732,972 B / 733,000 B PASS** (28 B headroom). The budget was not raised.
- `screens/tabs/index.tsx` remains at 0 raw hex; all new visible copy goes through `t()`.
- The exact suite count moved from 110 files / 590 tests to **111 files / 593 tests**.
  `grep -q "111 files / 593 tests" AGENTS.md` was proven red (exit 1) before the edit and
  green (exit 0) after; the CI grep in `.github/workflows/ci.yml` was moved with it.

## Full local gate (final tree)

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors |
| `npm test` | 111 files / 593 tests passed |
| `node scripts/architecture/validate_boundaries.js` | 0 violations |
| `node scripts/architecture/governance_audit.js` | 0 violations |
| `npm run check:ai-boundary` | PASS |
| `npm run check:imports` | PASS |
| `npm run readiness:check` | 0 |
| `npm run build` | exit 0 |
| `npm run perf:login-route` | 732,972 / 733,000 B PASS |
| `node scripts/qa/qa_runner.js` | SUCCESS |
| `npm run audit:full` | 0; report `audits/full-audit-2026-11-25_15-12-24.txt` |

## Register truth

C20 and GT-14 are `VERIFIED-LOCAL` only. GT-21 is **demoted** from `VERIFIED-IN-CI` to
`VERIFIED-LOCAL`: run `45599097582` proved `110 files / 590 tests`, not the new
`111 files / 593 tests` gate, and its stale `run:` URL was removed. No row is promoted to
CI-verified without an exact pushed green run. Scores after this slice: PILOT **54.3 %**
(130.90/241), V1-ACADEMIC **49.9 %** (55.40/111), V1-POLYMATH **38.8 %** (40.40/104),
WORLD-CLASS **24.2 %** (28.60/118); all `READY=NO`. The WORLD-CLASS drop is GT-21's
honest demotion, not a weakened gate.

Sprint 59's E11 attempt was reverted and is recorded separately in
`docs/evidence/sprint59-mastery-unification-rejected.md`; no code from it ships.
