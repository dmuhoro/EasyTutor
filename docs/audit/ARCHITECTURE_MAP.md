# Architecture Map — EasyTutor (Phase 0)

## Layering

1. **UI/Routing** — Expo Router under `app/` (tab, portal-group layouts).
2. **State** — Zustand + AsyncStorage stores under `store/`.
3. **Learning engines** — pure/domain functions in `lib/` (mastery, performance, trends, spaced rep, weakness, interventions, plan, adaptive curriculum, knowledge graph, coach).
4. **Intelligence layer** — `src/intelligence/*` (orchestrator, memory, reasoning, retrieval, pipelines, prefetch).
5. **Runtime/agents** — `src/runtime/*`, `src/agents/*`.
6. **Database governance** — `src/infrastructure/database/*` (the only legal access path; ADR-006).
7. **AI services** — `lib/ai/*`, `lib/aiProvider.ts`, `src/intelligence/routing/*`.
8. **Local infra** — `src/runtime/offline/*`, `data/*`, `types/*`.

## Portal mapping

- `portalFromMode(learningMode)` in `store/roadmapStore.ts` → `high_school` / `university` / `knowledge_explorer`.
- Governance requires portal for reads/writes; no resolved portal → no rows (fail closed) (CONSTITUTION Art III).

## Data flow (learning loop)

Auth → onboarding selects mode → subject/goal → tutor chat (`app/.../study`) → RAG retrieval → quiz (`app/.../quiz`) → progress store → governed Supabase sync → mastery aggregation layer → trend snapshots → recommendations/interventions → learning plan updates.

## Offline/sync

- Local stores (AsyncStorage) canonical while offline; Supabase sync idempotent via governed writes; `syncQueueStore`; local missions not overwritten by cloud refresh.
- AI: cloud (Claude) → Groq fallback → Ollama local → offline Fallback; reliability wrapper.

## RAG

- Ingest `lib/knowledge.ts` → chunk (`lib/chunking/*`) → embed (`lib/embeddings.ts` → Ollama) → governed write to `document_chunks` → RPC `match_document_chunks` scoped by portal/taxonomy/curriculum/school/namespace → top-k injected in `app/(tabs)/study.tsx`.

## Archived (0% reachability)

- `archive/src/*`, `archive/lib/commerce`. Not on live app path; excluded from gates.