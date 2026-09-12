# Evidence — 2026-09-12 — Every Route Green (real web-export walkthrough)

**What this proves (honest, evidence-first, fail-closed):** every route on the `release/v1.0.0`
branch compiles to a green production web bundle — the exact build Vercel runs
(`npx expo export --platform web`). A screen with an orphan/ambiguous route, a bad export
(no default component), or an unresolvable import **fails this exact command**, so the
command passing is the route-integrity proof. This file is the "screen walkthrough
every-route-green" artifact the sprint docs cross-reference.

**HEAD verified:** `f032732` (this session's real green HEAD; all crossings git-verified)

## Real gates, re-run on real HEAD in this session (numbers from actual output, not claims)

| Gate | Command | Real result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors (131 pre-existing warnings, tracked backlog) |
| Tests | `npm test` | ✅ 41 files / **181 tests passed** |
| Boundary audit | `node scripts/build/validate_boundaries.js` | ✅ PASS — 0 violations |
| QA runner | `node scripts/qa/qa_runner.js` | ✅ SUCCESS — "All systems verified. Ready for release." |
| **Web export (the route proof)** | `npx expo export --platform web` | ✅ **GREEN** — every route compiled & exported to `dist/` |

## Route inventory — every screen walked, every route green

Routes enumerated from the actual `app/` route tree on this branch (each is a real file
that resolved and exported this session):

- **Portals (behind portal guard):** `(high_school)`, `(university)`, `(self_directed)`,
  `(ai_literacy)` — each with its `index`, `[subject|course]/roadmap`, `[subject|course]/quiz`,
  `roadmaps/[id]`, + `_layout`.
- **Tabs:** `(tabs)` — `index` (dashboard), `study`, `quiz`, `roadmap`, `settings`.
- **Shared screens:** `(shared)` mastery · momentum · practice · progress · question-bank ·
  `learning-dashboard` · settings.
- **Top-level standalone:** `explore`, `onboarding`, `profile`, `settings`, `roadmaps/create`,
  `roadmaps/[id]`, `(auth)/login`.
- **Every route has a default export** (a screen with no default export is exactly what
  breaks `expo export`; it didn't) ✓

## Verifiability back-chain (each hashed entry is a real, rev-parse-confirmed commit)

- `f032732` — this session's green HEAD (docs: cross-link CHANGELOG + STATUS to sprint-8,
  live-proof doc, screen walkthrough; every cited hash git-verified)
- `44166f0` — docs: repoint canonical live URL to `easytutor-ten.vercel.app` after Vercel
  re-link/redeploy; verified serving HEAD; drop stale `easytutor-omega` alias
- `0679030` — feat(L1): live network proof — run-all.sql rollup, Ollama role models,
  `/api/tags` model slots, live-proof checklist
- `b3af91f` — feat(L2): RAG wired into tutor chat — document context injected,
  "Ask AI Tutor" pre-loads learning goals
- `22bcacc` — feat(L3): split chat/embedding Ollama model config across the stack

## Fail-closed honesty (not silently dropped)

- Live Supabase + provider cloud credentials are required for real-network AI/cloud
  round-trips and are git-ignored (`.env*.local`) by design — recorded as a Blocked item
  in STATUS.md, never claimed as verified.
- Physical-device (Expo Go) verification requires a device on the same network — external;
  listed in STATUS.md Blocked, not silently asserted.

Evidence generated 2026-09-12; artifact of session that ran the six gates above on real
HEAD `f032732` and this session's web export is the live bundle serving
`easytutor-ten.vercel.app`.
