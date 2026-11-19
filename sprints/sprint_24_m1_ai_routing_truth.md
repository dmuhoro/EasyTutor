# Sprint 24 — EPIC M1: AI routing truth, governed retrieval, citation integrity

Branch: `feat/ai-routing-truth` (from `origin/main` after PR #5 merge verification).
No push to `main`, no tags, no merge, no deploy, no Vercel/dashboard action.
Spec status: **active**. Evidence: `docs/evidence/m1-*.md`.

## Tasks

- **T0 — generated-artifact hygiene (DONE).** Untrack `playwright-report/` and
  `test-results/`; ignore them plus `deno.lock`; touch nothing else.
- **T1 — call-path truth map.** Record exact `file:line` rows for every hosted web
  AI entry point, the provider actually selected, UI provider reporting, and
  dead/duplicate code. Evidence: `docs/evidence/m1-ai-callpaths.md`.
- **T2 — one provider selector.** Add a single pure `selectProvider(context)` with
  precedence hosted proxy → enabled/reachable Ollama → offline. Every live AI
  call path must use it. The provider reported to callers/UI must be the provider
  actually used. Archive dead direct-provider helpers with `git mv`. Keep
  `scripts/qa/check-ai-boundary.mjs` green and extend it so the custom direct
  Groq fetch can no longer slip through.
- **T3 — boundary proof.** Mock only the network edge (fetch/msw). Prove: proxy
  uses the Supabase user JWT with no client API key; 429/5xx produce friendly
  bounded backoff; offline is immediate and queues without a silent drop; Ollama
  is opt-in and never contacts localhost by default on web; breaker opens and
  recovers on the real path.
- **T4 — governed retrieval ownership.** Fix any retrieval path that bypasses
  `src/infrastructure/database` or a resolved portal. Prove two-user isolation.
- **T5 — citation integrity.** Stop treating a bare substring as a citation;
  require an explicit rendered source marker and verify against retrieved sources.
- **T6 — README reconciliation.** Ensure `README.md`, `STATUS.md`, `CHANGELOG.md`
  describe only behaviour that exists after T2–T5.
- **T7 — full gate proof.** Run typecheck, lint, tests, boundary validator, QA
  runner, AI-boundary guard, and web export serially; record every number.
- **T8 — Mathematics full-chain test.** Restore/adapt the full-chain Mathematics
  test from `2ec396a` on the current store API without removing the authenticated
  evidence-flow coverage added in Sprint 23.

## Non-negotiables

- One commit per task; hooks on; no `--no-verify`.
- No test removed, skipped, assertion loosened, timeout raised, or budget widened.
- No secret read, printed, committed, or echoed. No `.env*` content inspection.
- Every number in evidence comes from a command run in this session.
- Heavy commands run one at a time.
