# Sprint 44 — E4 privacy / E2 real-stack consolidation

## Directive

Land already-proven epic work onto the unified `main` tree with real evidence, then advance only
the rows whose acceptance command actually exercises their behaviour.

## Work done

- Cherry-picked E4 (`440fb9d`) and E2 (`57ab4ea`, `13534c9`) onto `main`; resolved documentation
  conflicts by retaining both change sets.
- Ran privacy surface tests (8/8) and `npm run e2e:full` against the running local Supabase stack:
  **3 passed**.
- Advanced C39, C40, C41, E4-T1, GT-07, E2-T1 and GT-08 to `VERIFIED-LOCAL`; regenerated
  `docs/READINESS.md`. PILOT **20.0 → 24.4 %**.
- Full gate green: typecheck 0, lint 0 errors, 98 files / 546 tests, boundaries 0, AI boundary
  PASS, readiness check 0, build 0, QA all systems verified, login budget PASS.

## CI defect found and fixed

The first `real-stack` CI run failed because Expo inlines `EXPO_PUBLIC_*` at build time while the
job exported only `E2E_*`. The workflow now exports the public Supabase URL/key from
`supabase status -o env` before the web export; reproduced locally with the same exports:
build 0, `npm run e2e:full` 3 passed. No test or timeout was changed.

## Honest handover

C49 is not flipped: its acceptance is `gh pr checks --required`, which must be observed on the
pushed PR head. The documented quiz timing flake recurred twice under memory pressure and passed
on retry with no test or threshold change. Evidence: `docs/evidence/E2-E4-consolidation.md`.
