# AGENTS.md — EasyTutor

Read `CONSTITUTION.md` and `STATUS.md` first, every session, before touching this repo.
`STATUS.md` is the single source of truth for what is live / stubbed / blocked.

## Core principles (non-negotiable)
- Execution safety: fail closed, never fail open, no silent drops, enforcement at the real boundary
  (Constitution Article I).
- Governance: governed reads/writes go through `src/infrastructure/database` with a resolved
  portal (`portalFromMode`), never a magic string and never a direct Supabase call from UI
  (Constitution Article III; ADR-006).
- Portal-mapped routing: `high_school` / `university` / `knowledge_explorer` only.
- Local-first, idempotent sync; learner progress is never silently dropped (Constitution Article II).
- Honest docs: every sprint writes `sprints/` + `docs/evidence/` and updates `STATUS.md` + `CHANGELOG.md`
  (Constitution Article VI). Claims are verified, not trusted.
- Work sequentially in layers; finish one layer before starting the next (Constitution Article VII).

## Engineering conventions
- TypeScript strict (`tsc --noEmit` is authoritative and must stay at 0 errors).
- No `any` in new code; known `any` sites are a tracked backlog gap, not license to add more.
- AI calls go through `lib/ai/reliability.ts` (timeout, retry, fallback, explicit source).
- Archive, never delete: dead code moves to `archive/` with `git mv` so it stays in history.
- Secrets never committed; `.env*.local` is git-ignored.

## Commands (green before push)
- `npm run typecheck` — `tsc --noEmit` (must be 0 errors)
- `npm run lint` — ESLint
- `npm test` — vitest (68 files / 255 tests baseline)
- `npm run build` — `npx expo export --platform web` (the Vercel gate)
- `node scripts/architecture/validate_boundaries.js` — 0 violations
- `node scripts/qa/qa_runner.js` — QA suite

## Process (entry protocol)
1. **Context**: read `CONSTITUTION.md`, `STATUS.md`, `docs/adr/` (ADR-001..007), this file.
2. **Pre-implementation validation**: confirm the change is on a real, reachable path; run the boundary
   validator; refuse to insert protection anywhere but the true production path.
3. **Scoped execution**: ONE unit at a time; defensive programming (timeouts/retries); never modify
   stable logic unnecessarily.
4. **Post-implementation documentation**: entry in `sprints/`, evidence under `docs/evidence/`, and
   `STATUS.md`/`CHANGELOG.md` updated.
5. **Verification**: typecheck, lint, tests, boundary audit, QA runner, web export. All must pass.
6. **Commit & push**: one concern per commit, descriptive messages; push only when green.

## Deterministic invariants
1. Spec-driven: no code without a spec entry (sprint/ADR/issue) first.
2. Boundary-safe: no UI direct DB calls; governed layer only.
3. Memory-persistent: every failure and lesson is recorded before moving on.
4. Verified: no completion without the full green gate.