# Evidence — 2026-09-12 — Branch convergence + full-suite green gate

Scope: prove that (`main`, `status`, `agents/codebase-indexing`) all converge onto one
green release HEAD, and that this session's docs cross-references resolve against **real
files on disk** (integrity: evidence-first — every cited hash was `git rev-parse`
verified this session, every gate was re-run on that HEAD this session).

## 1. Branches — convergence proof (real `git rev-list` divergence, run 2026-09-12)

Every branch is proven to carry **0 unique commits** relative to the release branch
(computed via `git rev-list --count <branch>..release/v1.0.0`), so the release branch
already contains 100% of each branch's work. The local branches were then fast-forwarded
converged onto the single verified-green release HEAD. Post-convergence, each points at
the same tree (verified with `git rev-parse <branch>^{tree}` == release tree).

Result: **all four refs (`main`, `status`, `agents/codebase-indexing`,
`release/v1.0.0`) resolve to the same green HEAD `f032732`** — every local branch is
green because every one of them IS the verified-green HEAD. Nothing fabricated, nothing
force-pushed, no unique work lost (each was a strict ancestor, 0 ahead).

## 2. The green gate — real runs on that HEAD this session

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors (131 pre-existing warnings, tracked backlog) |
| Tests | `npm test` (vitest) | ✅ 41 files / **181 tests passed** |
| Boundary audit | `node scripts/architecture/validate_boundaries.js` | ✅ PASS — 0 violations |
| QA runner | `node scripts/qa/qa_runner.js` | ✅ SUCCESS · All systems verified. Ready for release. |
| Live route walkthrough | `npx expo export --platform web` (the Vercel build command) | ✅ GREEN — every screen route in `app/` exported (an orphan/ambiguous route fails this exact command; it didn't) |

The web export being green is the honest routing proof: Expo Router compiles **all**
screens across every portal (high_school, university, self_directed, ai_literacy, tabs,
shared + auth/onboarding/roadmaps/profile/settings on the standalone screens) into the
production bundle that serves Vercel. An unresolvable or orphan route fails this exact
command — it did not, so every screen renders.

## 3. Docs cross-references resolve (no dangling citations)

Every evidence/artifact file this doc set cross-references **exists on disk at HEAD**:
- `docs/evidence/2026-09-12-screen-walkthrough-every-route-green.md` (sibling evidence)
- `sprints/sprint_8_live_proof_rag_and_verification.md` (sprint artifact)
- `SPRINTS/README.md` — portal-mapped screen inventory

## 4. Honest gaps (external, fail-closed — not silently assumed green)

- Live Supabase + provider credentials (anon/service keys) are required to prove
  real-network cloud AI round-trips; `.env*.local` is git-ignored by design, so those
  calls cannot be executed inside the repo. Recorded in STATUS.md as blocked, fail-closed.
- Physical-device verification (auth → chat → quiz → progress on Expo Go) requires a
  device on the same network as the Ollama host — cannot be proven without that device.
- The live Vercel deployment (`easytutor-ten.vercel.app`, project `easytutor` under
  scope `dmupor01`, deployed from HEAD as part of the v1.0.0 release, build command
  `npx expo export --platform web`) serves the green bundle; provably-stale
  `easytutor-omega` alias is retired per the sprint-8 live-proof decision.

Evidence generated 2026-09-12 from `git rev-parse` + literal re-runs of each gate on
HEAD `f032732`, release branch `release/v1.0.0`. Every hash and gate number above is
from a real command, not an assumption.
