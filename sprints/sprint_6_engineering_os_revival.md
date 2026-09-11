# Sprint 6: Engineering OS Revival — Build Gate + Portal Safety + Governance

**Status:** Layer C (evidence/docs) in progress; all code gates green
**Version Target:** 1.0.1
**Focus:** Restore the production build, kill the portal-scope runtime bug, establish the
Constitution/ADR/STATUS/sprints governance the ecosystem shares, and ship a clean push.

---

## Sprint Objectives
1. **Fix the build blocker** so `npx expo export --platform web` (the `vercel.json` gate) succeeds:
   remove dangling observability/tracing imports in `lib/ai.ts` + `lib/ai/reliability.ts`; replace the
   archived `lib/bridge/localNetwork` dependency in `lib/embeddings.ts` and
   `src/intelligence/routing/localLLMRouter.ts` with the settings-store Ollama endpoint.
2. **Remove the hardcoded `'student'` portal bug** across the app path. `portalFromMode()` from
   `store/roadmapStore.ts` now resolves the portal for `lib/mastery.ts`, `lib/knowledgeGraphEngine.ts`,
   `lib/learningPlanEngine.ts`, `lib/adaptiveCurriculumEngine.ts`, `hooks/useOrchestration.ts`.
3. **Restore the on-path learning engines** (`learningPlanEngine`, `adaptiveCurriculumEngine`) from
   `archive/lib/` after verifying `lib/recommendations.ts` really consumes them, and type-fix them.
4. **Archive dead layers**, never delete: `lib/commerce`, `lib/ingestion`, `lib/bridge`, `lib/ollama.ts`,
   `lib/bookTutor.ts`, `lib/diagnostics/startup.ts`, `lib/cache/cacheMetrics.ts` + dead tests → `archive/`.
5. **Governance layer**: `CONSTITUTION.md`, `STATUS.md`, `CHANGELOG.md`, `sprints/`, `docs/` tree with
   `adr/` (7 ADRs migrated from `archive/decisions/`), `sprints/`, `evidence/`, `changelog/`.
6. **Docs reconciliation**: AGENTS.md/README/BRIEF aligned with the real structure (Expo SDK 55,
   cloud+local AI routing, portal-governed data layer).
7. **Source tree app-scoping**: archive app-unreachable `src/` layers (madge-verified 0% reachability) and the tests that only exercised them → suite re-scoped to 39 files / 174 tests on the live app path.
8. **Real lint gate**: rewrite `eslint.config.mjs` (4960 false errors → 0), remove `|| true`, clear the 33 real live-path lint errors.
9. **Green gates + clean push**: typecheck, lint (real), 174 tests, boundary audit, QA runner, web export — then individual descriptive commits pushed to `origin/release/v1.0.0`.

## Key Files Created / Modified
- Created: `CONSTITUTION.md`, `STATUS.md`, `CHANGELOG.md`, `sprints/`, `docs/adr/` (7 ADRs),
  `docs/sprints/`, `docs/evidence/`, `docs/changelog/`.
- Fixed: `lib/ai.ts`, `lib/ai/reliability.ts`, `lib/embeddings.ts`,
  `src/intelligence/routing/localLLMRouter.ts`, `lib/mastery.ts`, `lib/knowledgeGraphEngine.ts`,
  `hooks/useOrchestration.ts`, `store/roadmapStore.ts`.
- Restored + type-fixed: `lib/learningPlanEngine.ts`, `lib/adaptiveCurriculumEngine.ts`.
- Config: `tsconfig.json` (exclude archive/dist/node_modules), `vitest.config.js` (exclude `**/archive/**`).

## Validation & Verification Checklist
- [x] `npx tsc --noEmit` — 0 errors (was 26)
- [x] `npm run lint` — 0 errors (was 4960 false errors under a broken config; `|| true` removed)
- [x] `npm test` — 39 files / 174 tests green (re-scoped to the live app path)
- [x] `node scripts/architecture/validate_boundaries.js` — 0 violations
- [x] `node scripts/qa/qa_runner.js` — All systems verified. Ready for release.
- [x] `npx expo export --platform web` — `Exported: dist` (gate was failing before this sprint)
- [x] Docs reconciliation commit (Layer A)
- [x] Archive + lint-gate commits (Layer B)
- [ ] Evidence + sprint record commit (Layer C)
- [ ] Clean push to GitHub (Layer D)

## Layer B outcomes (archived 2026-09-11)
- Archived `src/` layers with madge-proven 0% reachability from the app surface
  (506+ files) + orphaned integration tests + `scripts/ingestion` → `archive/`.
  Survivors re-verified load-bearing (infrastructure/database, intelligence,
  knowledge/taxonomies, config, types, runtime offline/local/agentic).
- `eslint.config.mjs` rewritten (ignores + Node globals) — 4960 false errors → 0;
  removed `|| true` so lint fails on errors. Cleared the 33 real live-path errors
  (empty catches made explicit aas best-effort fall-throughs, dead initializers,
  case-block declarations, rethrow wrapper, empty if).
- All gates green on the new baseline: tsc 0, lint 0, 39 files / 174 tests,
  boundary audit 0 violations, QA pass, `Exported: dist`.

## Follow-ups (recorded, not silently dropped)
- Live Supabase/cloud-AI round-trip and physical Expo Go verification need real credentials + a device.
- Strict `no-explicit-any` pass across `src/`/`lib/` is a backlog item.
- 139 ESLint `no-unused-vars` warnings remain (backlog, non-blocking).
- Surface best-effort cache-write failures to callers (currently explicit-but-silent fall-throughs).
- Re-deploy Vercel: current live site still serves the stale 2026-05-11 export.