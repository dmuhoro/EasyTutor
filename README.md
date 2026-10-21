# EasyTutor 🎓🤖

> **A portal-mapped, offline-capable AI learning operating system.** EasyTutor detects whether a learner is in the Kenyan high-school syllabus (KICD), a university degree programme, or a self-directed Polymath path — and re-architects its prompts, roadmaps, quizzes, and retrieval scope to match.

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2055-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.83.6-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20%2B%20pgvector-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Ollama](https://img.shields.io/badge/Local%20AI-Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-181%20passing-emerald)](https://github.com/dmuhoro/easytutor)
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

Every governed read/write resolves a portal through `portalFromMode()`, stamps `user_id` / `portal_type` / `updated_at`, and goes through the database layer — never a magic string and never a direct Supabase call from UI.

---

## Core Capabilities

### Multi-Portal Curriculum

Three portal-mapped surfaces with distinct prompts, depth, and branding. High School is pre-seeded with 12 KCSE subjects; University covers degree programmes; Polymath accepts arbitrary free-form topics.

### Real RAG (Documents → Grounded Answers)

Ingest documents through the governed layer with deterministic chunk IDs. Embeddings via Ollama (`nomic-embed-text`, 384-dim) → `pgvector`. The `match_document_chunks` RPC is portal/taxonomy/curriculum/school/namespace-scoped and returns chunk metadata; retrieval fails closed (returns `[]`, never a false match). The tutor chat injects the top-k retrieved chunks into the system prompt, with a visible "retrieving from your docs" indicator.

### Offline-Capable Local AI

Run entirely on LAN with Ollama — no hosted API key required. Role-based model routing with availability detection from `/api/tags`:

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
| Frontend | React Native 0.83.6 · Expo SDK 55 · Expo Router · NativeWind |
| State | Zustand + AsyncStorage (local-first, persistent) |
| Backend | Supabase PostgreSQL, RLS, pgvector (`vector(384)`) |
| AI | Anthropic Claude 3.5 Sonnet · Groq Llama fallback · Ollama (local, role-routed) |
| Validation | Zod |
| Quality Gates | TypeScript strict · ESLint · Vitest · architecture boundary audit · QA runner |

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
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_key
```

### 3. Database

- **Existing project:** paste `supabase/migrations/run-all.sql` into the Supabase SQL editor (adds the hardened RAG RPC + Polymath schema and drops the legacy overloads).
- **Fresh project:** apply `supabase/schema.sql`, then `CREATE EXTENSION IF NOT EXISTS vector;` **before** `supabase/migrations/run-all.sql`.

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
npm test            # vitest, 41 files / 181 tests
npm run build       # npx expo export --platform web
node scripts/architecture/validate_boundaries.js
node scripts/qa/qa_runner.js
```

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
