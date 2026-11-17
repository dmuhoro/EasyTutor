# Sprint 20 — Wave 1: Truth Pass & Core-Loop Completion (EasyTutor)

Date: 2026-11-17 · Branch: `fix/truth-pass` from `origin/main` @ `cae99d9`
Role: sole builder (this agent). Daniel pushes, CI runs, Daniel merges.

## Goal

Every claim in `STATUS.md` becomes reproducible, every gate becomes real, and the work
Kilo's Phases 1–2 left out is closed. **No visual work, no wiring or restyling of Phase 2
screens.** Those screens stay dead code pending a design phase driven by external mockups.

## Governance & constraints

- `CONSTITUTION.md` Articles I–VII govern. `AGENTS.md` entry/exit protocol applies.
- ADR-003 and ADR-005 mandate Ollama embeddings + pgvector cosine. W1-2 requires FTS-first,
  optional embeddings, Ollama opt-in and `USER_PRIVATE` scope. **ADR-009** resolves the
  conflict and is ratified in this layer before any W1-2 code.
- One commit per task; never `--no-verify`; never raise a global timeout or loosen an
  assertion; archive (git mv) rather than delete; no new dependencies except imported-but-
  undeclared packages and dev-only test tooling; `npm ci` on a fresh clone must pass.
- Push, Vercel CLI, dashboards and production are out of scope. Daniel's exact steps are in
  the final report.
- User-imported content is private. `GLOBAL_OPEN` or any shared scope for imports is forbidden.
- Every number in a report comes from a command run in this session. Command + output tail
  goes to `docs/evidence/wave1-*.md`. `docs/evidence/wave1-progress.md` is updated after
  every task so a session reset loses nothing.

## Reconfirmed baseline (commands run this session)

| Fact | Command | Result |
|---|---|---|
| HEAD == origin/main | `git rev-parse HEAD origin/main` | `cae99d9b8de0771f5862dd266cd66865f6d4739d` |
| Clean tree before branching | `git status --short` | empty |
| Local tests | `npm test` | 64 files / 370 tests pass (60.91s) |
| Local typecheck | `npm run typecheck` | 0 errors (only because `@axe-core/playwright` is extraneous in local `node_modules`) |
| Local Ollama | `curl localhost:11434/api/tags` | reachable (`gemma2:2b`) — explains local pass vs CI fail |
| Tooling | `node -v`, `npm -v`, `supabase --version`, `docker info` | v22.22.1, 11.12.1, 3.0.0, daemon up |

CI red facts are reproduced on a fresh clone under W1-1 and recorded in
`docs/evidence/wave1-1-ci-green.md`. Nothing is fixed before reproduction.

## Task spec (one commit per task, sequential layers)

### Layer 0 — Spec / governance (this file + ADR-009 + progress log)
Done first. No code until ADR-009 is ratified.

### W1-0 — Truth
Correct `STATUS.md`, `CHANGELOG.md` and `sprints/sprint_19_phase2_design.md`:
- Phase 2 acceptance **NOT MET** (Lighthouse Performance 36; all acceptance rows unmeasured
  or failed; visual baselines 69 pass / 27 fail; login JS ~729 KB transferred).
- Phase 2 new screens **UNWIRED** (dead code; only `screens/settings` imported by a route).
- `DESIGN.md` still `Status: Draft — awaiting approval (Step 0)`.
- CI **RED** on both merge commits: `quiz.wrongAnswers` `expected 0 >= 2`; fresh-install
  typecheck `TS2307 @axe-core/playwright` + `TS7006`.
- `vitest testTimeout` raised to 10 s to mask flakiness.
- Remove every claim that cannot be reproduced this session.

### W1-1 — CI green for real
- Declare `@axe-core/playwright` (and any other imported-but-undeclared package found by a
  script) in `package.json` + `package-lock.json`; add that scan to CI as a real gate.
- Fix `TS7006` at the cause (type the callback parameter; no `any`).
- Fix `quiz.wrongAnswers` nondeterminism at the cause: the test stubs the vector RPC but
  retrieval silently falls back to FTS when Ollama is absent; external Ollama availability
  decides the path. Make the test independent of external Ollama and prove it fails before
  the fix with Ollama blocked.
- Remove `testTimeout: 10000` (revert to the 5 s default). No named test may use a global
  raise.
- Prove via fresh clone → `npm ci` → exact `.github/workflows/ci.yml` steps in order.

### W1-2 — T2 at the real boundary
One concern per commit, in this order:
1. Route `askTutor`/`getAIResponse` and quiz callers through `ai-proxy`. Delete or map the
   disabled direct rail. Prove with localhost blocked that a Learn question reaches `ai-proxy`.
2. Ollama strictly opt-in: empty default URL; never attempted on web unless explicitly
   enabled and reachable. No import-time network call.
3. Import without embeddings: forward-only migration with `tsvector` column, GIN index and
   ranked RPC scoped to `auth.uid()`. Rows store chunk text; embeddings stay optional.
   Test: import 50 chunks without embeddings stores 50 rows and retrieval returns cited rows.
4. `USER_PRIVATE` scope for imports + forward migration relabelling existing user-owned
   `GLOBAL_OPEN` chunks. Migration runs locally only.
5. `ai-proxy/health` lists models actually callable with the configured key and intersects
   them with the allowlist; friendly failure; no model name hardcoded from memory.

### W1-3 — Local Supabase proof
- `supabase db reset` from zero applies every migration in order; record the order.
- RLS matrix (anon / user A / user B × select/insert/update/delete) on every user table with
  expected results written first; observe each refusal.
- Two-user privacy through tables, RPCs and retrieval.
- Post-hardening loop: import → retrieval → quiz → weak-spot works for a signed-in user; a
  token-less caller reads only reference tables.
- Exact staging then production migration order documented.

### W1-4 — Close T3–T6
- T3 route smoke renders every route inside a real error boundary; fails on any caught error
  or skipped import.
- T4 one home: remove `CommandCenter` outside the tabs; use or delete `NavigationBar`;
  keyboard + focus tests for the nav.
- T5 `AbortController` cancel; provider-failure test shows friendly error + Retry within 35 s;
  offline test shows immediate offline message.
- T6 sign-up → email confirmation (link read from local Supabase mail catcher) → signed in;
  password reset → update-password; OAuth manual test documented; Supabase Auth URL settings
  listed for Daniel.

### W1-5 — Phase 1 DONE demo
- Playwright at 390 px against `dist/` with local Supabase + a deterministic stub LLM behind
  `ai-proxy`: sign up, confirm, onboard (survives reload), import notes, cited answer, quiz,
  weak-spot review, deep link, offline then online.
- GitHub Actions job using `supabase/setup-cli`; `npm run e2e:full` locally.
- Main CI job keeps a no-backend smoke subset.

### W1-6 — Budgets that bite
- `check-entry-budget.js` enforces every field in `perf-budget.json`.
- Measure login-route JS transferred with Playwright resource timing; set it as a ratchet that
  may only decrease; open an investigation note (no work) for reaching ≤ 300 KB.

### Layer 7 — Final report / release
Version bump, CHANGELOG, truth docs, per-task DONE/PARTIAL/NOT DONE, evidence paths, remaining
gaps, Daniel's exact steps, branch left unpushed. Local tag only if release discipline allows;
Daniel pushes the ref.

## Evidence index

`docs/evidence/wave1-progress.md` (living log), `wave1-0-truth.md`, `wave1-1-ci-green.md`,
`wave1-2-boundary.md`, `wave1-3-supabase.md`, `wave1-4-t3-t6.md`, `wave1-5-demo.md`,
`wave1-6-budgets.md`, `wave1-final.md`.

## Definition of done

All gates green on a fresh `npm ci`, every report number backed by a command in this session,
every new test demonstrated failing before its fix, negative results recorded, and no task
left in a silent-PARTIAL state.
