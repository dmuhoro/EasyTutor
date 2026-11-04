# Web Performance — Final Measurement

Final result of the web-performance directive, measured with the same command
as the baseline.

**Date:** 2026-11-04
**Baseline commit:** `a15dfff` (see `BASELINE.md`)
**Command:** `npx expo export --platform web --source-maps`
**Expo SDK:** 57.0.31 · **expo-router:** 57.0.29

---

## Headline

| Metric | Baseline | Final | Delta |
|---|---:|---:|---:|
| Entry JS raw | 3,949,700 B | **1,674,615 B** | **−2,275,085 B (−57.6%)** |
| Entry JS gzip −9 | 957,419 B | **437,705 B** (zlib) / 438,086 B (CLI) | **−519,714 B (−54.3%)** |
| Entry source-map modules | 1,744 | **1,021** | −723 |
| Circular dependencies | 33 | **0** | −33 |
| Route chunks | 0 | **35** | +35 |
| Total JS emitted | ~3.96 MB | 3.57 MB | −0.39 MB |

**Target met:** `entry JS gzip` is down **54.3%** against a required **40%**.

A plain `npm run build` (no `--source-maps`) re-measures at **1,674,478 B raw /
437,616 B gzip**, i.e. the bundle is byte-stable to within ~140 B of the
source-map run — same hash, same 35 chunks, same PASS. The budget gate reads the
plain build it runs in CI.

## Per-slice contribution

| Slice | Change | Entry gzip |
|---|---:|---:|
| Baseline | `app/+html.tsx` reverted | 957,419 B |
| 4 | Ionicons-only imports, unused SDK removed | 825,345 B |
| 5 | 29 routes code-split, probes deferred | 425,628 B |
| 6 | shell skeleton + system-font fallback | 425,904 B |
| 7 | design tokens + primitives, Auth/Home reskin | 437,705 B |

Slice 3 (dependency cycles) is architectural: it does not move bytes by itself,
but it makes the store/intelligence boundary invertible so the lazy
`learningPort` chunk exists (660 B) instead of a static import.

## Where the bytes went

- `react-native-svg` and Reanimated (≈920 KB raw together) now load only in
  routes that use `ProgressRing`/`LinearProgress` (quiz, topics), never on the
  eager Home path.
- `react-native-markdown-display` + `entities` sit in the 156 KB `study` chunk.
- Every non-home screen is its own async chunk (35 total).
- Heavy providers (`@supabase/*`, `react-dom`, expo-router) remain in entry by
  necessity: the root layout must resolve auth before routing.

## Budget gate

`perf-budget.json` records the ceilings:

| Gate | Value |
|---|---:|
| Entry gzip | 450,000 B |
| Entry raw | 1,750,000 B |
| Minimum route chunks | 30 |

`npm run perf:budget` fails closed (exit 1) when a ceiling is exceeded, when no
single entry chunk exists, or when the chunk count regresses. CI runs it after
the web export. The gate was observed failing on an artificial 1,000 B budget
before being kept.

## Reproduce

```bash
npm run typecheck
npm run lint
npm test
npm run lint:cycles
node scripts/architecture/validate_boundaries.js
node scripts/qa/qa_runner.js
npm run build
npm run perf:budget
```

## Final state

- 0 circular dependencies, enforced.
- 0 TypeScript errors, 0 lint errors.
- 51 test files / 246 tests pass.
- 35 route chunks; first paint shows a font-free skeleton instead of a blank
  screen.
- Design system tokens are the single source of truth; Auth and Home are
  reskinned on top of the primitives.
