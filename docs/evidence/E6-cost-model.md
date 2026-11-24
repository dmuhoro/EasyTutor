# E6 — Cost model acceptance proof

Branch `test/e6-cost-model-proof` from `origin/main` @ `859b9dc`. Test-only; no production code,
bundle or budget changed. No PR (two open: #19 R0, #20 E1).

## What was verified

E6's acceptance command `npm run test -- tests/flows/cost.model.test.ts` did not exist on `main`.
The token-based cost computation already existed in `lib/ai/reliability.ts:284-302` (hosted proxy:
input 5e-8 USD/token, output 8e-8 USD/token; local Ollama and non-model fallbacks report 0), so
no production change was needed — only executable proof of the real path.

`tests/flows/cost.model.test.ts` exercises `executeWithReliability` with only the two network
leaves mocked, and asserts:

1. Hosted proxy: 3 input + 7 output tokens → **exactly 0.00000071 USD** (`toBeCloseTo(..., 12)`),
   not merely `> 0`.
2. Local Ollama: cost **0**; proxy never called — no hosted spend is fabricated.
3. Failed hosted rail → validated cache fallback: cost **0**; the failed attempt is still recorded
   (`callAIProxy` called once). Cache is a fallback in the real chain, not the first link; the test
   follows that order rather than assuming a different architecture.

## Gate evidence

| Gate | Result |
|---|---|
| `npm run test -- tests/flows/cost.model.test.ts` | 1 file / 3 tests passed |
| `npm test` | 93 files / 518 tests passed |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / 148 warnings |
| `node scripts/architecture/validate_boundaries.js` | 0 violations |
| `npm run build` | exit 0 |
| `npm run perf:login-route` | **732,759 / 733,000 B PASS** (unchanged from main) |

## Honest handover

This satisfies one E6 acceptance command. E6 as a whole remains **PARTIAL**: the governance
0-WARN command and the `npm audit --omit=dev --audit-level=critical` command live on different
pushed branches (`fix/e6-governance` experiment — not shipped, see `execution-progress.md` — and
`fix/e6-dependency-audit` @ `da82dd7`). Merging is outside the allowed remote actions, so no
single branch claims full E6 acceptance. `VERIFIED-IN-CI` withheld (no PR slot).
