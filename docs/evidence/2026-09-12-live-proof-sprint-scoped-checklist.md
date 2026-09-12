# Evidence — Live-proof, sprint-scoped checklist (2026-09-12)

Provenance principle honored here: a committed doc may only cite evidence that resolves
to a real file on disk; every hash it cites is `git rev-parse`-verified. This file is the
sprint-9 scoped-checklist evidence that CHANGELOG/STATUS/sprint docs reference.

## Gates run on the converged HEAD (release/v1.0.0 = `f032732`) — this session

- `npx tsc --noEmit` → **0 errors**
- `npm run lint` → **0 errors** (131 pre-existing warnings, tracked in backlog as warnings, not gate failures)
- `npm test` → **41 files / 181 tests passed**
- `node scripts/architecture/validate_boundaries.js` → **AUDIT PASSED, 0 violations**
- `node scripts/qa/qa_runner.js` → **QA SUCCESS** ("All systems verified. Ready for release.")
- `npx expo export --platform web` → **GREEN** (the exact Vercel production build command)

## Scope of the checklist this evidence covers

Per constitution Article VI, "green" is only claimed where there is a real artifact:
this checklist deliberately scopes to what the repo can prove in-process (typecheck,
lint, tests, arch boundaries, QA, web export). Cloud round-trips requiring external
credentials, and physical-device verification, are **explicitly out of scope and recorded
as blocked** in STATUS.md — never silently claimed green.

## Cross-reference integrity (this sprint's own contract, re-verified)

The sprint-9 doc's cross-links were grepped and resolved against disk before commit;
every `docs/evidence/*.md` it cites exists (see sibling evidence files
`2026-09-12-branch-convergence-all-green.md`, `2026-09-12-verify-every-hash-cited.md`,
`2026-09-12-screen-walkthrough-every-route-green.md`, `2026-09-12-polymath-and-offline.md`
— all on disk at HEAD). No dangling evidence citations.
