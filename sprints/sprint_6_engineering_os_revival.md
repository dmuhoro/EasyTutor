# Sprint 6: Engineering OS Revival — Build Gate + Portal Safety + Governance

**Status:** In Progress (Layer A–D execution; gates green, evidence pending)
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
7. **Green gates + clean push**: typecheck, lint, 255 tests, boundary audit, QA runner, web export —
   then individual descriptive commits pushed to `origin/release/v1.0.0`.

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
- [x] `npm test` — 68 files / 255 tests green
- [x] `node scripts/architecture/validate_boundaries.js` — 0 violations
- [x] `node scripts/qa/qa_runner.js` — All systems verified. Ready for release.
- [x] `npx expo export --platform web` — `Exported: dist` (gate was failing before this sprint)
- [ ] Docs reconciliation commit (Layer A)
- [ ] Evidence + sprint record commit (Layer C)
- [ ] Clean push to GitHub (Layer D)

## Follow-ups (recorded, not silently dropped)
- Live Supabase/cloud-AI round-trip and physical Expo Go verification need real credentials + a device.
- Strict `no-explicit-any` pass across `src/`/`lib/` is a backlog item.
- Re-deploy Vercel: current live site still serves the stale 2026-05-11 export.