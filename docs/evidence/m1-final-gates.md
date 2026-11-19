# M1 T7 — final gate proof

Branch `feat/ai-routing-truth`, HEAD `bc7ab62`. Every heavy command was run
serially, one at a time, on 2026-11-19. Logs are retained under
`/tmp/opencode/m1-gate-*.log`.

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | 0 errors |
| Lint | `npm run lint` | 0 errors / 158 warnings (gate enforced, no `\|\| true`) |
| Unit + flow suite | `npm test` | 84 files / 484 tests passed in 70.58 s |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | `[AUDIT PASSED] No architecture violations found.` |
| QA runner | `node scripts/qa/qa_runner.js` | First attempt FAILED (one 5 s timeout); clean retry SUCCESS — 84 files / 484 tests in 69.12 s. Both runs recorded below. |
| AI boundary | `node scripts/qa/check-ai-boundary.mjs` | `[AI BOUNDARY] PASS — no disabled direct rail call; Ollama default URL is empty.` |
| Web export | `npm run build` | Exit 0 — 1,750 modules, 37 assets, 40 JS bundles; `dist/` is git-ignored and `git status --short` was empty afterwards |

## QA runner: first attempt (not hidden)

The first `node scripts/qa/qa_runner.js` run failed at the Flow Tests step:

- `tests/flows/quiz.wrongAnswers.test.ts` — `generates structured single question …`
  timed out in 5,000 ms (failed at 5,040 ms).
- Result: 1 failed file / 83 passed, 1 failed test / 483 passed, 70.14 s.
- `[QA] FAILED: Flow Tests`, exit 1.

No timeout, assertion, budget, test skip, or test removal was made in response.
An isolated reproduction `npx vitest run -c vitest.config.js tests/flows/quiz.wrongAnswers.test.ts`
passed 5/5 in 6.45 s (1.39 s test time). A clean full QA rerun then passed all
steps: TypeScript Validation, Architecture Compliance, Governance Audit,
Flow Tests (84 files / 484 tests, 69.12 s), exit 0. The timeout is therefore
recorded as an observed one-off that was not reproduced, not claimed as fixed or
as having a proven root cause.
`vitest.config.js` still uses the pre-existing 4-worker cap and the default 5 s
per-test timeout; neither was changed by M1.

## Not in scope / not claimed

No push, tag, merge, deploy, Vercel CLI, or dashboard action was performed.
Live hosted-provider calls, the deployed proxy, real-device/browser E2E and a
cloud Supabase round-trip were not exercised by these gates.
