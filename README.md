# EasyTutor 🎓🤖

> **A portal-mapped, offline-capable AI learning operating system.** EasyTutor detects whether a learner is in the Kenyan high-school syllabus (KICD), a university degree programme, or a self-directed Polymath path — and re-architects its prompts, roadmaps, quizzes, and retrieval scope to match.

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20%2B%20pgvector-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Ollama](https://img.shields.io/badge/Local%20AI-Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-309%20passing-emerald)](https://github.com/dmuhoro/easytutor)
[![Constitution](https://img.shields.io/badge/constitution-Article%20I--VII-purple)](CONSTITUTION.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

**Live web build:** https://easytutor-ten.vercel.app

---

## What EasyTutor Does

EasyTutor is a **multi-portal academic operating system**, not an AI wrapper. One app, three governed learning identities:

| Portal | Learner | Experience |
|--------|---------|------------|
| `high_school` | KCSE / KICD student | Syllabus-aligned subjects & Form 1–4 topics, exam-style quizzes |
| `university` | Undergraduate | Degree-level depth (Medicine, Engineering, Law, Architecture) |
| `knowledge_explorer` | Self-directed / Polymath | Any free-form goal → an architected roadmap, Socratic tutor chat |

Every governed read/write resolves a portal through `portalFromMode()` and goes through the database layer — never a magic string and never a direct Supabase call from UI. `src/infrastructure/database/tableGovernance.ts` is the one owner map: reads filter and writes stamp that table's real owner column (`profiles.id`, `user_id` elsewhere) and only tables that actually carry `portal_type` are portal-scoped. An unregistered table is refused rather than read unscoped.

---

## Core Capabilities

### Multi-Portal Curriculum

Three portal-mapped surfaces with distinct prompts, depth, and branding. High School is pre-seeded with 12 KCSE subjects; University covers degree programmes; Polymath accepts arbitrary free-form topics.

### Real RAG (Documents → Grounded Answers)

Ingest documents through the governed layer with deterministic chunk IDs. **Every import is private by default** (`USER_PRIVATE`); a caller cannot write user content to a shared scope. Embeddings are optional: a chunk is still stored when no embedding model is available (no silent drop). Retrieval is **FTS-first** via the ranked `search_document_chunks_fts` RPC (Postgres full-text search, no model needed), or the vector `match_document_chunks` RPC when embeddings exist. Both RPCs are scoped by `auth.uid()` so a learner only ever sees their own chunks; retrieval fails closed (returns `[]`, never a false match). The tutor chat injects the top-k retrieved chunks into the system prompt, with a visible "retrieving from your docs" indicator.

### Hosted AI (default)

By default the app calls the server-side `ai-proxy` Supabase function, which holds the provider key — no provider credential is ever shipped to the client. The legacy direct-from-client rail is disabled and blocked by a CI gate (`npm run check:ai-boundary`). The proxy's `/health` endpoint derives its probe model from the provider's live model list intersected with the allowlist (never a hardcoded model), with friendly, non-leaking failures.

### Optional Local AI (Ollama)

Ollama is **strictly opt-in**. The default URL is empty and nothing contacts a local model server until you enable local AI in Settings and supply a reachable LAN URL; a short `/api/tags` reachability probe runs before any chat or embedding request. On web, loopback URLs are refused (a browser cannot reach `localhost` on the developer's machine). Role-based model routing with availability detection from `/api/tags`:

| Role | Default Model |
|------|---------------|
| Reasoning / Chat | `deepseek-r1:14b` |
| Agent | `hermes3:8b` |
| Coding | `qwen2.5-coder:7b` |
| Embedding / RAG | `nomic-embed-text` |

Both chat and embedding models are user-configurable and shown with AVAILABLE / NOT PULLED / UNKNOWN badges. A missing model fails closed with the exact `ollama pull` command — it is never silently swapped.

### Reliability & AI Integrity

Multi-provider fallback with timeouts and exponential-backoff retries (`lib/ai/reliability.ts`), reporting an explicit source (`cache` / `local` / `cloud` / `offline_fallback`). Zod-validated AI JSON with strict validation-retry loop. Governance doctrine: fail closed, no silent drops, enforcement at the real boundary.

### Local-First Progress

Zustand + AsyncStorage persistence; Supabase sync through the governed layer. `learning_goals` (RLS, unique per user+topic) persist Polymath goals idempotently and rehydrate across devices. Local progress is never overwritten by a cloud refresh.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native 0.86.3 · Expo SDK 57 · Expo Router · NativeWind |
| State | Zustand + AsyncStorage (local-first, persistent) |
| Backend | Supabase PostgreSQL, RLS, pgvector (`vector(384)`) |
| AI | Anthropic Claude 3.5 Sonnet · Groq Llama fallback · Ollama (local, role-routed) |
| Validation | Zod |
| Quality Gates | TypeScript strict · ESLint · Vitest · dependency-cycle check · architecture boundary audit · QA runner · web size budget |

---

## Getting Started

### 1. Install

```bash
git clone https://github.com/dmuhoro/easytutor.git
cd easytutor
npm install --legacy-peer-deps
```

### 2. Configure Environment

Create `.env.local` (git-ignored):

```env
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
```

No provider API key belongs in the client. Hosted AI calls go to the server-side `ai-proxy`
Supabase function; set `GROQ_API_KEY` in the **edge function's** environment (never in
`.env.local`, never in a commit). The direct-from-client rail is disabled and blocked by
`npm run check:ai-boundary`. Ollama is optional and opt-in (§5).

### 3. Database

Apply migrations in filename order via the Supabase SQL editor or `supabase db push`, then apply
the two ADR-009 forward migrations last (both idempotent, in this order):

1. `supabase/migrations/20261117_private_import_fts.sql` — private-import FTS index, ranked
   retrieval RPC, `auth.uid()` scoping, execute grants.
2. `supabase/migrations/20261117_relabel_user_chunks_private.sql` — relabels pre-existing
   user-owned `GLOBAL_OPEN` chunks to `USER_PRIVATE` (run after step 1).

- **Existing project:** the historical set is already applied — apply only the two files above.
  If the project is behind the 2026-09-12 hardening/polymath set, paste
  `supabase/migrations/run-all.sql` into the SQL editor first (it is an intentional rollup and is
  not replayed by `supabase db reset`).
- **Fresh project:** apply `supabase/schema.sql` first, `CREATE EXTENSION IF NOT EXISTS vector;`
  before any vector migration, then the migrations. See
  `docs/evidence/wave1-3-local-supabase.md §7` for the exact order and post-apply checks.
- **Known limitation:** `supabase db reset` from zero is **not currently clean** — seven
  historical migrations assume `schema.sql`, which the CLI does not replay. Local RLS/privacy is
  proven on a `schema.sql`-bootstrapped DB (104/104 RLS cases, 9/9 two-user RPC cases); a separate
  migration-repair project is required before from-zero reset can be advertised.

### 4. Run

```bash
npx expo start          # mobile (Expo Go)
npm run web             # web
```

### 5. Local AI (Optional, Fully Offline)

```bash
ollama pull deepseek-r1:14b   # reasoning / chat
ollama pull nomic-embed-text    # embeddings for RAG
```

Then set the Ollama server URL (your machine's LAN IP, no `/v1`) in Settings.

---

## Quality Gates

All must be green before a push:

```bash
npm run typecheck   # tsc --noEmit, 0 errors
npm run lint        # eslint, 0 errors
npm test            # vitest, 51 files / 246 tests
npm run lint:cycles # dependency-cruiser, 0 cycles
npm run build       # npx expo export --platform web
npm run perf:budget # entry-size budget, fails closed after build
node scripts/architecture/validate_boundaries.js
node scripts/qa/qa_runner.js
```

---

## Web Performance

The web entry chunk is budgeted and guarded in CI. Current measured state
(`docs/perf/AFTER.md`):

| Metric | Baseline | Current |
|---|---:|---:|
| Entry JS gzip | 957,419 B | **437,705 B (−54.3%)** |
| Entry JS raw | 3,949,700 B | **1,674,615 B (−57.6%)** |
| Circular dependencies | 33 | **0** |
| Route chunks | 0 | **35** |

Every non-home route is a lazy chunk under `screens/**` with a thin wrapper in
`app/**`; the root layout stays eager because it resolves auth before routing.
`perf-budget.json` sets fail-closed ceilings (gzip 450,000 B, raw 1,750,000 B,
minimum 30 route chunks) and `npm run perf:budget` refuses a build that exceeds
them. UI primitives and tokens live in `components/ui/` and `src/design/tokens.ts`
(`docs/design/DESIGN_SYSTEM.md`).

---

## Documentation & Governance

| Document | Purpose |
|----------|---------|
| [`CONSTITUTION.md`](CONSTITUTION.md) | Execution-safety doctrine (Articles I–VII) |
| [`STATUS.md`](STATUS.md) | Verified live / stubbed / blocked state (single source of truth) |
| [`docs/adr/`](docs/adr/) | Architecture Decision Records (ADR-001 through ADR-007) |
| [`sprints/`](sprints/) | Sprint records; evidence under `docs/evidence/` |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |
| [`scripts/live-proof-checklist.md`](scripts/live-proof-checklist.md) | 10 end-to-end flows to verify against real Supabase + Ollama |

---

## Topics

`easytutor` `ai-tutor` `adaptive-learning` `expo` `react-native` `supabase` `pgvector` `rag` `ollama` `offline-first` `llm` `personalized-learning` `kenya` `kcse` `kicd` `education`

---

## License

MIT © Daniel Muhoro
