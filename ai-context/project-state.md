# project-state.md — EasyTutor / Learning OS for Africa

> This is the SINGLE source of truth that any agent (Codex, Cursor, Antigravity, Google AI Studio, Gemini CLI)
> must read FIRST. It is a self-contained snapshot that restores full context with one read.
> Generated from git-verified ground truth on 2026-09-12. If anything here disagrees with the repo, the repo wins — re-derive and fix this file.

---

## 1. MISSION (one line)

Own ONE vertical, ONE outcome: make secondary-school mastery in Kenya (KCSE) a provable, portable, outcome-tracked resource — the first wedge of a learning OS / human-capital infrastructure for Africa.

## 2. PRODUCT IDENTITY

- **Name:** EasyTutor
- **Domain:** offline-first, adaptive, AI-grounded KCSE tutoring (vertical 1 of the Learning OS)
- **Runners:** `easytutor-ten.vercel.app` (web) · Android (Expo Go)
- **Design pillars:** Local-first, RAG-grounded tutor, adaptive curriculum, offline-first + cloud capability

## 3. CURRENT GIT STATE (re-derived 2026-09-12, no memory)

- **All four branches converge on ONE green HEAD, 0/0 vs origin:**
  - `main` · `release/v1.0.0` · `status` · `agents/codebase-indexing` → `e7f8254` (short) / `e7f8254b6944bb2e73aca93d78ec6e9e88ef84ee` (full)
  - `git status --porcelain` clean: 0 pending tracked, 0 untracked
- **Declared version:** `1.0.0` (package.json + app.json) — **HOLD, do not bump** (zero product-code delta; bump would be fabricated signal)
- **Release mark:** branch `release/v1.0.0` + tag `v1-learning-intelligence`

## 4. GREEN GATE — the current verified baseline (full suite, real runs)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | 0 errors |
| Lint | `npm run lint` | 0 errors (131 pre-existing warnings = tracked backlog) |
| Tests | `npm test` | **41 files / 181 tests passed** |
| Boundaries | `node scripts/architecture/validate_boundaries.js` | AUDIT PASS — 0 violations |
| QA | `node scripts/qa/qa_runner.js` | SUCCESS — ready for release |
| Web export | `npx expo export --platform web` | GREEN (this is the Vercel build gate) |

> Rule: nothing is committed as "done" until every one of the above passes on that exact tree.

## 5. ARCHITECTURE (brief — read `docs/architecture/` for depth)

- **Gov Writes:** all database writes go through `src/infrastructure/database/` with a resolved portal (`portalFromMode`). NEVER a direct `supabase.from()` from UI, NEVER a magic string. (Constitution Article III / ADR-006)
- **Portal-mapped routing:** `high_school` / `university` / `knowledge_explorer` only.
- **AI calls:** through `lib/ai/reliability.ts` (timeout, retry, fallback, explicit source). Remote inference routes via the hybrid router; local inference via Ollama.
- **Offline-first:** learner progress is never silently dropped (Constitution Article II); offline caches + sync are the rails.
- **Auxiliary engines:** adaptive curriculum engine, learning-plan engine, knowledge-graph engine (under `src/intelligence/`).

## 6. BLOCKED / NOT CLAIMED (honest — never fabricated)

- **Live network round-trip (cloud + physical device):** needs live Supabase + provider keys + a physical Android device. Recorded as **Blocked** in `STATUS.md` — never claimed green.
- **Longitudinal outcome data (the moat):** does not exist yet; only accumulates once the live layer is proven.
- This session moved docs/evidence/sprints only — **0 product-code files** changed in the two-day window.

## 7. HOW TO PICK UP WORK (bootstrap for ANY agent, incl. AI Studio/Gemini CLI)

1. Read this file, then `AGENTS.md`, then `CONSTITUTION.md`, `STATUS.md`, and the ADRs.
2. Audit the repo with real git commands (never memory): `git rev-parse HEAD`, `git status --porcelain`, `git log --oneline -5`.
3. If a goal differs from reality, report and re-derive — never fabricate success.
4. Execute ONE unit at a time; work sequentially in layers; finish a layer before the next.
5. Run the full gate above before claiming anything green.
6. Close out per convention: update `sprints/`, `docs/evidence/`, `STATUS.md`, `CHANGELOG.md`; commit each concern individually; push.

## 8. IMMEDIATE NEXT OBJECTIVES (in priority order)

- **A1 (unblocked, docs):** this file + the ai-context layer. ← current
- **A2 (blocked on external creds):** live Supabase/Groq round-trip proof → first honest version bump trigger.
- **A3 (blocked on device):** physical Android walkthrough via Tailscale/Ngrok ↔ Ollama local inference.
- **A4 (moat):** start accumulating verifiable, outcome-tracked learner progress (competency → longitudinal data).

## 9. KEY SCRIPTS (run from repo root)

- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Tests: `npm test`
- Boundaries: `node scripts/architecture/validate_boundaries.js`
- QA: `node scripts/qa/qa_runner.js`
- Web export (Vercel gate): `npx expo export --platform web`
- Word/extract context snapshot for a new session: `node scripts/ai_context/extract_project_snapshot.js`
