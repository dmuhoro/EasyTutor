# EasyTutor 🎓🤖

> **A portal-mapped, offline-capable AI learning operating system.** EasyTutor detects whether a learner is in the Kenyan high-school syllabus (KICD), a university degree programme, or a self-directed Polymath path — and re-architects its prompts, roadmaps, quizzes, and retrieval scope to match.

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20%2B%20pgvector-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Ollama](https://img.shields.io/badge/Local%20AI-Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-616%20passing-emerald)](https://github.com/dmuhoro/easytutor)
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

Three portal-mapped surfaces with distinct prompts, depth, and branding. High School is pre-seeded with 12 KCSE subjects; University covers degree programmes; Polymath accepts arbitrary free-form topics. Bundled curriculum packs carry a validated `source_status`: DRAFT/COMMUNITY packs are labelled on the subject topics screen and in the tutor prompt, and no pack is presented as official unless its own status says so.

### Real RAG (Documents → Grounded Answers)

Ingest documents through the governed layer with deterministic chunk IDs. **Every import is private by default** (`USER_PRIVATE`); a caller cannot write user content to a shared scope. Embeddings are optional: a chunk is still stored when no embedding model is available (no silent drop). Retrieval is **FTS-first** via the ranked `search_document_chunks_fts` RPC (Postgres full-text search, no model needed), or the vector `match_document_chunks` RPC when embeddings exist. Both RPCs are scoped by `auth.uid()` so a learner only ever sees their own chunks; retrieval fails closed (returns `[]`, never a false match). The RPC reads and the study chapter picker go through `Database.governedRetrieval()` / `Database.governedChapters()` in `src/infrastructure/database`; a policy whose portal does not match the active portal, or a caller with no authenticated owner, is refused before the read runs. The tutor chat injects the top-k retrieved chunks into the system prompt, with a visible "retrieving from your docs" indicator.

### Hosted AI (default)

By default the app calls the server-side `ai-proxy` Supabase function, which holds the provider key — no provider credential is ever shipped to the client. A single pure selector (`lib/ai/providerSelection.ts`) chooses one rail per request in this order: hosted proxy when the learner has a session, explicitly enabled and reachable Ollama, then `offline`. Every live call path uses that decision, and the provider reported to callers is the rail actually used. The legacy direct-from-client rail and direct Groq/Anthropic endpoints are blocked by `npm run check:ai-boundary`. The proxy's `/health` endpoint derives its probe model from the provider's live model list intersected with the allowlist (never a hardcoded model), with friendly, non-leaking failures.

### Optional Local AI (Ollama)

Ollama is **strictly opt-in**. The default URL is empty and nothing contacts a local model server until you enable local AI in Settings and supply a reachable LAN URL; a short `/api/tags` reachability probe runs before any chat or embedding request. On web, loopback URLs are refused (a browser cannot reach `localhost` on the developer's machine). When the app is offline, local Ollama is used only if it is already enabled and reachable; otherwise the selector fails closed to `offline` rather than attempting a hosted call. Role-based model routing with availability detection from `/api/tags`:

| Role | Default Model |
|------|---------------|
| Reasoning / Chat | `deepseek-r1:14b` |
| Agent | `hermes3:8b` |
| Coding | `qwen2.5-coder:7b` |
| Embedding / RAG | `nomic-embed-text` |

Both chat and embedding models are user-configurable and shown with AVAILABLE / NOT PULLED / UNKNOWN badges. A missing model fails closed with the exact `ollama pull` command — it is never silently swapped.

### Reliability & AI Integrity

One provider is selected per request; `lib/ai/reliability.ts` applies timeout, bounded retries on that rail, a circuit breaker and Zod-validated AI JSON with a strict validation-retry loop. It never silently switches to a second rail after a failure. Cache, placeholder and offline are explicit fallback sources, reported as `hosted_proxy`, `local_ollama`, `cache`, `placeholder` or `offline` — never a false "cloud" claim from a stub. Every learner-facing assistant answer shows that source as an honest label in the study tab and tutor session (hosted tutor, on-device model, saved explanation, placeholder-only, or offline); cached, queued and queued-retry answers carry their own source, and an unknown source fails closed to "source unavailable" rather than implying a model answered (`lib/ai/providerLabels.ts`). Quiz generation runs under one abortable 30 s wall-clock deadline (retries share the budget); refreshing or leaving the quiz cancels the in-flight request, going offline shows an immediate message without attempting generation, and provider failures show a friendly error with Retry. Cited answers credit only exact bracketed markers rendered from retrieved sources: bare substrings, near-miss markers and invented references are rejected (`lib/citations.ts`). Citation chips reveal the retrieved excerpt on tap; a chip with no excerpt stays inert rather than offering a dead tap target (`components/ui/ChatBubble.tsx`). Governance doctrine: fail closed, no silent drops, enforcement at the real boundary.

### Local-First Progress

Zustand + AsyncStorage persistence; Supabase sync through the governed layer. `learning_goals` (RLS, unique per user+topic) persist Polymath goals idempotently and rehydrate across devices. Local progress is never overwritten by a cloud refresh.

The Mathematics reference journey follows the same rule: `/math-journey` derives
evidence from the signed-in learner's answer to an internally authored diagnostic
item, rejects duplicate submissions, and marks progress synced only after the
ownership-checking Supabase writer confirms the write. Learner snapshots are
partitioned per account and survive reload
(`docs/evidence/sprint23-math-authenticated-evidence.md`).

Home, You and Math journey now render one canonical learner-state projection:
quiz evidence becomes explainable mastery confidence, missed topics become review
gaps, and the sync chip reports the canonical pending/synced state. The projection
reads only governed stores and pure domain code — no screen calls Supabase directly
(`docs/evidence/sprint81-canonical-screen-consumers.md`).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native 0.86.3 · Expo SDK 57 · Expo Router · NativeWind |
| State | Zustand + AsyncStorage (local-first, persistent) |
| Backend | Supabase PostgreSQL, RLS, pgvector (`vector(384)`) |
| AI | Hosted AI proxy (server-side provider keys) · optional local Ollama (role-routed) · no client-side provider keys |
| Validation | Zod |
| Quality Gates | TypeScript strict · ESLint · Vitest · dependency-cycle check · architecture boundary audit · QA runner · web size budget · login-route transfer ratchet |

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
the three forward migrations last (all idempotent, in this order):

1. `supabase/migrations/20261117_private_import_fts.sql` — private-import FTS index, ranked
   retrieval RPC, `auth.uid()` scoping, execute grants.
2. `supabase/migrations/20261117_relabel_user_chunks_private.sql` — relabels pre-existing
   user-owned `GLOBAL_OPEN` chunks to `USER_PRIVATE` (run after step 1).
3. `supabase/migrations/20261117_setup_wizard_preferences.sql` — adds the seven preference
   columns the wired setup wizard writes to `profiles` (without it, the wizard's governed write
   fails and silently falls back to "Setup saved locally"). Run after steps 1–2.

- **Existing project:** the historical set is already applied — apply only the three files above.
  If the project is behind the 2026-09-12 hardening/polymath set, paste
  `supabase/migrations/run-all.sql` into the SQL editor first (it is an intentional rollup and is
  not replayed by `supabase db reset`).
- **Fresh project:** apply `supabase/schema.sql` first, `CREATE EXTENSION IF NOT EXISTS vector;`
  before any vector migration, then the migrations. See
  `docs/evidence/wave1-3-local-supabase.md §7` for the exact order and post-apply checks.
- **From-zero local reset:** `supabase db reset` is **clean** on the local stack — all 46
  migrations apply in order (duplicate timestamps renumbered, missing
  `CREATE TABLE IF NOT EXISTS` guards added, `vector` extension created before the `hnsw` index,
  analytics disabled in `config.toml`). Local RLS/privacy is proven on that stack (104/104 RLS
  cases, 9/9 two-user RPC cases). See `docs/evidence/wave1-3-local-supabase.md`.

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
npm test            # vitest, 92 files / 515 tests (real-screen route smoke, one-home tab-nav, quiz reliability, Mathematics evidence gates, M1 routing/retrieval/citation proofs, answer-source + excerpt-on-tap, wired practice/tutor route truth, locale coverage, desktop shell + orientation, idle-startup scheduling)
npm run test:auth-flow  # live local Supabase Auth + Mailpit proof (needs local Supabase running)
npm run e2e:smoke       # no-backend 390px route/PWA smoke (9 tests; also runs in CI)
npm run e2e:full        # W1-5 demo: real 390px app + local Supabase (3 tests; needs local stack)
                        # PARTIAL — see docs/evidence/wave1-5-demo.md §5 for uncovered steps
npm run lint:cycles # dependency-cruiser, 0 cycles
npm run build       # npx expo export --platform web
npm run perf:budget       # entry-size budget, fails closed after build
npm run perf:login-route  # login-route JS transfer ratchet @ 390px, fails closed after build
npm run perf:lighthouse    # desktop Lighthouse gate on the local export (≥80 on / and /login)
npm run qa:live-preflight  # live-proof prerequisites by name; never claims a live flow
node scripts/architecture/validate_boundaries.js
npm run check:ai-boundary  # no disabled direct rail or direct Groq/Anthropic endpoint
npm run guard:secrets      # source secret + public-env allowlist guards
npm run audit:full         # aggregated audit; exits non-zero on any failed verification
node scripts/qa/qa_runner.js
```

After `npm run build`, CI also runs `npm run guard:dist`, which scans the exported bundle for
credential material. The locale coverage gate walks both `app/` and `screens/`; a key missing
from any shipped language pack fails the suite.

The web shell uses a centred, token-driven content column beside an 80 px rail at wide
viewports; native stays portrait-locked while the PWA manifest allows any orientation.
Non-critical startup and home-screen syncs are idle-scheduled, and an unauthenticated visitor
is not shown a transient tab screen while being redirected to `/login`; this keeps the
desktop Lighthouse gate at ≥80 (`/` 89–92, `/login` 91–92 over three runs). The **mobile**
preset remains NOT MET (`/` 45, `/login` 46); see
`docs/evidence/2026-11-23-lighthouse-80.md`. `npm run qa:live-preflight -- --require-ready`
fails while any live-proof prerequisite is blocked, and `--run-local` gates the
credential-free build/bundle-guard/E2E/baseline checks.
See `docs/evidence/live-proof-pack.md`: no live-network or physical-device flow is claimed until
Daniel completes the one-session checklist with his own credentials.

---

## Web Performance

The web entry chunk is budgeted and guarded in CI. Last measured at 1.11.0
(re-measured in the Wave 1 pass; detail in `docs/perf/AFTER.md` and
`docs/evidence/wave1-6-budgets.md`):

| Metric | Baseline | Current |
|---|---:|---:|
| Entry JS gzip | 957,419 B | **443,144 B (−53.7%)** |
| Entry JS raw | 3,949,700 B | **1,700,567 B (−56.9%)** |
| Circular dependencies | 33 | **0** |
| Route chunks | 0 | **37** |

Every non-home route is a lazy chunk under `screens/**` with a thin wrapper in
`app/**`; the root layout stays eager because it resolves auth before routing.
`perf-budget.json` sets fail-closed ceilings (gzip 450,000 B, raw 1,750,000 B,
minimum 30 route chunks) and `npm run perf:budget` refuses a build that exceeds
them. A second gate, `npm run perf:login-route`, measures the JavaScript actually
transferred by `/login` at 390 px in a browser and refuses a build above
`loginRouteTransferredBytes` (ceiling 730,843 B, a decreasing ratchet; measured 730,799 B at this
release). The
Phase 2 target of ≤ 300 KB is **not met** — see the investigation note in
`docs/evidence/wave1-6-budgets.md`. UI primitives and tokens live in
`components/ui/` and `src/design/tokens.ts` (`docs/design/DESIGN_SYSTEM.md`).

The settings route uses the Phase 2 screen with the live Ollama configuration,
model-status detection and portal switcher preserved. The tutor and practice Phase 2
screens are wired deep links that now use the governed paths: practice generates questions
through the learning pipeline and records progress; the tutor retrieves your private notes,
shows real citation excerpts, and honestly says when notes do not cover a question. Library,
progress and setup remain on their live routes. Remaining Phase 2 gaps are tracked as
G-20…G-22 in [`docs/COMPLETION_TRACKER.md`](docs/COMPLETION_TRACKER.md); see also
`docs/evidence/2026-11-22-core-loop-truth.md` and `docs/evidence/phase2-premise-audit.md`.

---

## Documentation & Governance

| Document | Purpose |
|----------|---------|
| [`CONSTITUTION.md`](CONSTITUTION.md) | Execution-safety doctrine (Articles I–VII) |
| [`STATUS.md`](STATUS.md) | Verified live / stubbed / blocked state (single source of truth for present state) |
| [`docs/COMPLETION_TRACKER.md`](docs/COMPLETION_TRACKER.md) | Single source of truth for remaining work, priority, cross-device gaps and 80/20 effort estimate |
| [`docs/adr/`](docs/adr/) | Architecture Decision Records (ADR-001 through ADR-010; ADR-010 supersedes ADR-002 for hosted routing) |
| [`sprints/`](sprints/) | Sprint records; evidence under `docs/evidence/` |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |
| [`scripts/live-proof-checklist.md`](scripts/live-proof-checklist.md) | 10 end-to-end flows to verify against real Supabase + Ollama |

---

## Topics

`easytutor` `ai-tutor` `adaptive-learning` `expo` `react-native` `supabase` `pgvector` `rag` `ollama` `offline-first` `llm` `personalized-learning` `kenya` `kcse` `kicd` `education`

---

## License

MIT © Daniel Muhoro
