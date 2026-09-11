# Changelog

All notable changes to EasyTutor are documented here.
Format: [Semantic Versioning](https://semver.org) — project convention is
"one sprint, one meaningful entry".

---

## [Unreleased] — 1.0.1 (Engineering OS Revival + Green Gates)

### Fixed
- **Web export build blocker** (`lib/ai.ts`, `lib/ai/reliability.ts`): removed
  dangling imports of removed observability/tracing modules that broke Metro
  bundling and the `vercel.json` build gate (`npx expo export --platform web`).
  Verified: `dist/` exports cleanly on HEAD.
- **Portal-scope runtime bug**: hardcoded portal string `'student'` was not a
  valid `PortalType` and would throw at runtime whenever Supabase was online.
  Replaced everywhere with `portalFromMode(learningMode)` (`store/roadmapStore.ts`),
  fixing `lib/mastery.ts`, `lib/knowledgeGraphEngine.ts`,
  `lib/learningPlanEngine.ts`, `lib/adaptiveCurriculumEngine.ts`, and
  `hooks/useOrchestration.ts`. Engines restored to `lib/` and type-fixed.
- 26 typecheck errors → 0 (`npx tsc --noEmit` clean).

### Changed
- `tsconfig.json` excludes `archive/`, `node_modules/`, `dist/` so dead code is
  out of the typecheck surface. `vitest.config.js` mirrors the exclude.
- **AI endpoint wiring**: `lib/embeddings.ts` and
  `src/intelligence/routing/localLLMRouter.ts` no longer depend on the archived
  `lib/bridge/localNetwork`; they read the settings-store Ollama URL and strip
  `/v1` for native Ollama `/api/*` calls.

### Removed (archived to `archive/`, never deleted)
- Dead layers not on the app bundle path: `lib/commerce`, `lib/ingestion`,
  `lib/bridge`, `lib/ollama.ts`, `lib/bookTutor.ts`,
  `lib/diagnostics/startup.ts`, `lib/cache/cacheMetrics.ts`, and their tests
  (`archive/tests/`).

### Governance
- Added `CONSTITUTION.md` (EasyTutor-scoped execution-safety doctrine).
- Added `STATUS.md` (verified live/stubbed/blocked source of truth).
- Migrated 7 historical ADRs (`archive/decisions/`) to `docs/adr/ADR-00x`.md.
- Added `docs/` tree (`adr/`, `sprints/`, `evidence/`, `changelog/`) and
  `sprints/` as the sprint record home per Constitution Article VI.

## [1.0.0] — 2026-05-11 (Production AI Infrastructure Launch)

- Production AI infrastructure launch (`02cbc30`): reliability wrapper,
  timeout/retry/fallback AI routing, analytics integrity + operational
  intelligence views, portal switching + identity split, knowledge workspace,
  roadmap-tutor link, unified command center, adaptive + governance layers.
- Expo SDK 55 / React Native 0.83 stabilization (lockfile, podfile-like asset
  sync, NativeWind v4 Metro/PostCSS, Reanimated worklets).
- Docker + EAS/build pipeline hardening for the web export.
- Sprint history 1–5 (KCSE question bank, practice engine, mastery tracking,
  adaptive recommendations, momentum, AI literacy, adaptive difficulty,
  confidence/accuracy, trend analysis, spaced repetition, learning risk,
  interventions, learning plans, adaptive curriculum, learning identity &
  knowledge graph, learning coach, gamification) — see `sprints/` and
  `docs/sprints/`.