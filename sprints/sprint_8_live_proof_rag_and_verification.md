# Sprint 8 — Live Network Proof, RAG Wiring, Chat/Embedding Model Split, Screen-By-Screen Verification

**Date:** 2026-09-12 · **Branch:** `release/v1.0.0` · **Predecessor:** Sprint 7 (Polymath + Offline)

Sequential work following Constitution Articles I–VII. Evidence files:
`docs/evidence/2026-09-12-screen-walkthrough-every-route-green.md` (screen map +
gate outputs). Each phase committed only after its own full green gate (typecheck ·
lint · tests · boundary audit · QA runner · web export).

## Phase A — Live network proof scaffolding (`0679030`)

- `supabase/migrations/run-all.sql`: a paste-ready rollup of the two 2026-09-12
  migrations — creates the `vector` extension if absent, drops the legacy 2-arg and
  3-arg `match_document_chunks` overloads, then applies the hardened 8-arg RPC +
  Polymath schema verbatim.
- `scripts/live-proof-checklist.md`: 10 end-to-end flows (auth, preset/free-form
  roadmaps, quiz, progress sync, learning goals, ingestion + RAG, Ollama
  connectivity, local inference, offline fallback), each with expected and
  fail-closed behavior.
- Local AI model registry (`lib/ollamaModels.ts`) with role routing and `/api/tags`
  availability detection surfaced as model slots in Settings.

## Phase B — RAG wired into the tutor chat (`b3af91f`)

- `app/(tabs)/study.tsx` retrieves the top-3 document chunks per user message and
  injects them into the system prompt (fail-open on retrieval error, with a visible
  "retrieving from your docs" indicator).
- `app/explore.tsx` "Ask AI Tutor" pre-loads a free-form learning goal into `/study`.

## Phase C — Chat/embedding model split (`22bcacc`)

- Settings store now exposes `ollamaChatModel` (default `deepseek-r1:14b`) and
  `ollamaEmbeddingModel` (default `nomic-embed-text`); editable Reasoning/Chat and
  Embedding/RAG rows in Settings with availability badges.
- One-time, non-blocking startup warning when local AI is on and the embedding
  model is not pulled.

## Phase D — Docs repoint + screen-verified live URL (`44166f0`, `46c58bb`)

- Canonical live URL repointed from the stale `easytutor-omega` alias to
  `easytutor-ten.vercel.app` (verified serving HEAD) across
  README/STATUS/CHANGELOG/package.json; GitHub homepage synced.
- `.gitignore` hardened to ignore machine-local `.vercel/` link metadata (never
  committed); confirmed `git ls-files .vercel` = 0 tracked files.

## Phase E — Screen-by-screen verification (this entry)

- Every Expo Router route in `app/` enumerated (see today's evidence doc) and the
  production web export (`npx expo export --platform web`, the Vercel build command)
  compiled **all** of them — route resolution is proven by the export succeeding,
  since an orphan/ambiguous route fails the bundler.
- Full gate on HEAD: tsc 0 · lint 0 errors · 181/181 tests (41 files) · boundary
  audit PASS · QA SUCCESS.

> Ongoing: scores of `no-unused-vars` warnings are tracked as a backlog cleanup
> item (they do not fail the gate); `any`-typed sites and best-effort cache `catch`
> fallbacks are documented in STATUS.md as known gaps — never silently assumed green.
