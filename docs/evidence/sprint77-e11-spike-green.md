# Sprint 77 — E11 bundle-neutral spike GREEN locally

## Change proved

`lib/mastery.ts` is now an adapter over the canonical deterministic evaluator:

- `getMasteryBand(mastery)` delegates to
  `src/domain/learning/mastery.ts::evaluateMasteryBand`.
- `updateMastery(...)` uses `evaluateMasteryPercent(...)` for the existing weak
  topic decision on the real write path called by
  `screens/shared/practice-session.tsx:110`.
- `evaluateMasteryPercent` calls `evaluateMastery` with one independent transfer
  evidence item; its weight maps the stored 0..100 percentage onto the canonical
  0.2 baseline + 0.6 evidence contribution.
- No canonical `level`, `confidence` or `reason` field is persisted.
- No portal, cache, governed read/write, threshold, weight or budget changed.

## Red → green

| Stage | Command | Result |
|---|---|---|
| Red control | `npm run test -- tests/mastery.adapter.test.ts tests/mastery.domain-adapter.test.ts` | **2 files failed / 6 tests failed / 0 passed** |
| Green control | same command after implementation | **2 files passed / 6 tests passed** |

The red result is recorded in `docs/evidence/sprint77-e11-red-control.md`.

A first typecheck of the new tests produced `TS2345` because the hoisted
`AsyncStorage.getItem` mock inferred its argument as `null`. The mock signature
was widened to `(_key: string) => Promise<string | null>`; no assertion,
threshold, or production behavior was changed. Typecheck then passed with 0
errors.

## Full gate on the implementation

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 129 warnings (unchanged from baseline) |
| `npm test` | **117 files / 620 tests passed** |
| `node scripts/architecture/validate_boundaries.js` | `[AUDIT PASSED] No architecture violations found.` |
| `npm run audit:governance` | `PASS — no ungoverned table/RPC access outside the approved boundary.` |
| `npm run check:imports` | `PASS — 463 files scanned, every bare import declared.` |
| `npm run check:ai-boundary` | `PASS — no disabled direct rail call; Ollama default URL is empty.` |
| `npm run build` | exit 0 |
| `npm run perf:login-route` | **667,223 B / 733,000 B PASS** |
| `node scripts/qa/qa_runner.js` | `All systems verified. Ready for release.` |
| `npm run readiness:check` | register valid; all milestones still `READY=NO` |
| `npm run guard:secrets` | source + tooling PASS |
| `npm audit --omit=dev --audit-level=critical` | exit 0; 9 non-critical advisories remain |
| `npm run lint:cycles` | 0 errors, 13 pre-existing orphan warnings |
| `npm run guard:dist` | shipped source + exported bundle + tooling PASS |
| `npm run perf:budget` | gzip 437,860 / 450,000 B PASS; raw 1,674,508 / 1,750,000 B PASS |
| `npm run e2e:smoke` | **9 passed** |

## Login ratchet detail

```text
[LOGIN BUDGET] route /login @ 390px
[LOGIN BUDGET]   __expo-metro-runtime-1f8f5d3ca6b7f58204d51e14506d73fb.js — 1893 B transferred
[LOGIN BUDGET]   __common-6d0fd9d4e47617908fe4204802ca1769.js — 240723 B transferred
[LOGIN BUDGET]   entry-2cd30a73cd15c668673af2f21f74796d.js — 424607 B transferred
[LOGIN BUDGET] total transferred: 667223 B (budget 733000 B)
[LOGIN BUDGET] PASS
```

Baseline was `666,978 B`; the adapter costs **+245 B** and leaves **65,777 B**
headroom. The budget remains `733,000 B`.

## Readiness integrity

No readiness row was promoted by this local result. `GT-06`, `E11-T1` and
`E11-T2` remain at their registered statuses until an exact pushed CI run is
recorded. Generated readiness remains PILOT 62.3 %, V1-ACADEMIC 53.7 %,
V1-POLYMATH 44.0 %, WORLD-CLASS 29.2 %, all `READY=NO`.
