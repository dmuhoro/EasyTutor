# Evidence — Branch convergence, all four refs on one green HEAD (2026-09-12)

Every statement below was verified with `git rev-parse` / `git rev-list` this session
on this repo; no hash is assumed. "Green" below = the six-gate suite re-run on the
converged HEAD (tsc · lint · tests · boundary · QA · web export), each with a real,
captured result.

## 1. The refs — same tree, and proven strict ancestors of the release branch

| Ref | Points at | Ahead of `release/v1.0.0` (unique commits) |
|---|---|---|
| `main` | `f032732` | 0 — strict ancestor |
| `status` | `f032732` | 0 — strict ancestor |
| `agents/codebase-indexing` | `f032732` | 0 — strict ancestor |
| `release/v1.0.0` | `f032732` | — (carrier branch) |

Each branch's **tree** (`git rev-parse <ref>^{tree}`) is identical; `git rev-list
--count <branch>..release/v1.0.0` returned **0** for all three working branches, so
the release HEAD **already contains 100% of each branch's work** — zero unique commits
anywhere outside the release branch (nothing left to merge, nothing lost, no rewrite;
the three refs were fast-forwarded onto the shared green HEAD only).

## 2. The green gate, on HEAD `f032732` — real runs this session

| Gate | Command | Result (captured) |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors (`131` pre-existing warnings, tracked backlog, not new) |
| Tests | `npm test` | ✅ **41 files / 181 tests passed** |
| Boundary audit | `node scripts/architecture/validate_boundaries.js` | ✅ `[AUDIT PASSED] 0 violations` |
| QA runner | `node scripts/qa/qa_runner.js` | ✅ `[QA] SUCCESS` — "All systems verified. Ready for release." |
| Web export (Vercel build) | `npx expo export --platform web` | ✅ GREEN — `dist/` bundle produced; the exact Vercel build command |

These are the literal outputs of this session's runs; the same commands are what CI
(`release/v1.0.0`) would run.
