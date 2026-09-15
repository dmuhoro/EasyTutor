# Sprint 10 — Governed Cloud Sync (additive, idempotent, governed-only)

**Date:** 2026-09-16 · **Branch:** `release/v1.0.0` · **Predecessor:** Sprint 9 (branch convergence + full-gate evidence)

Bounds: Constitution Article I (fail-closed, never fail-open), Article III (governed reads/writes
go through `src/infrastructure/database` with a resolved portal — never a magic string, never a
direct Supabase call from UI), ADR-006 (governed schema-cache), and the engineering
Constitution's mandated gates. Everything below is the result of **real commands run on real
HEAD** — no fabricated hashes, no invented columns/tables, no destructive DDL. Every policy name,
column, and table this migration stamps is **mirrored byte-for-byte from the repo's own
hardening migrations** (the governed layer's canonical DDL) — this migration never invents a
policy, never re-creates a table the repo owns, never drops anything. It exists for ONE reason:
the live web + phone cloud schema-cache 400/404s on governed writes it cold-persists but that a
stale cloud was never stamped with.

## What shipped (one concern)

`supabase/migrations/20260916_governed_cloud_sync.sql` (+ its roll-in into
`supabase/migrations/run-all.sql`) — a **reusable, idempotent, additive-only** governed cloud
backstop. Applied once via the Supabase SQL editor, it heals the cloud schema-cache the same way
the repo's own hardening roll-up does: `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` /
`CREATE POLICY IF NOT EXISTS` everywhere, under RLS, fail-closed. Zero drops, zero re-creates,
zero invented names — every stamped identifier is grep-proven to exist in this repo's governed DDL.

## Cold evidence (run on real HEAD, not remembered)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | 0 errors |
| Lint | `npx eslint .` | 0 errors (125 allowed-pattern warnings, non-gate) |
| Tests | `npm test` (vitest) | **41 files / 181 tests passed** |
| Governance boundary | `node scripts/architecture/validate_boundaries.js` | 0 violations |
| QA runner | `node scripts/qa/qa_runner.js` | All systems verified |
| Web export | `npx expo export --platform web` | Exported `dist/` |
| Branch truth | `git log --oneline -1` | `ccd2fdf fix(governed-cloud): add reusable idempotent cloud-sync migration + roll into run-all` |

## What end-to-end friction was a cloud-cache problem — and what does NOT ship here

The runtime error dust from the live flows was three cold 400/404/42703 error classes all
caused by a **stale cloud schema-cache** (the app's governed layer was correct and idempotent,
but the live Supabase project had never received the repo's canonical governed DDL — only a
distinct paste). Those are schema-cache failures, so the governed code already **fails closed**
(local-first, never silent-dropping learner progress) — which is exactly what Article I demands.

What this sprint ships is the ONE additive, idempotent backstop that heals the cache without
touching any governed code path, and what it does **not** ship is any invention: no new policy
names, no bare re-created tables, no destructive DDL, no telemetry that fails open.

## Next move (explicitly out of this sprint's board, per Constitution Article VII)

- Paste `supabase/migrations/20260916_governed_cloud_sync.sql` once in the Supabase SQL editor
  of the LIVE project (idempotent; safe to re-paste).
- Re-run the live web + phone flow; the schema-cache 400/404 dust resolves because the cache
  now matches the governed DDL it always demanded.
