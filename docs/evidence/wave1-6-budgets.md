# Evidence — W1-6: Budgets that bite (2026-11-17)

Branch `fix/truth-pass` @ `36fc1d2` + W1-6 working tree. All numbers below are from
commands run this session. No visual work and no new runtime dependencies.

## 1. The defect — two budget fields nobody enforced

`perf-budget.json` carried `loginRouteGzipBytes: 65536` and
`loginRouteRawBytes: 200000` (added in sprint 17). No script read either field:
`check-entry-budget.js` only enforced `entryGzipBytes`, `entryRawBytes` and
`minRouteChunks`. Those two "limits" therefore protected nothing — a classic
false gate. Meanwhile the real login route transferred ~729 KB, roughly 11× the
recorded 64 KB ceiling, and CI stayed green.

### Fail-first proof

`tests/perf/perf-budget-fields.test.ts` asserts every numeric field in
`perf-budget.json` is referenced by at least one perf gate script. Before the fix:

```
$ npx vitest run -c vitest.config.js tests/perf/perf-budget-fields.test.ts
AssertionError: expected [ 'loginRouteGzipBytes', …(1) ] to deeply equal []
+   "loginRouteGzipBytes",
+   "loginRouteRawBytes",
Test Files  1 failed (1) | Tests  1 failed | 1 passed (2)
exit 1
```

The test failed for the exact reason claimed: dead config fields.

## 2. The fix — one real ratchet, no dead fields

- Replaced the two dead fields with a single measured ceiling
  `loginRouteTransferredBytes: 730843`.
- Added `scripts/perf/measure-login-route.js`: spawns the exported `dist/` via the
  repo's own `serve` devDependency, loads `/login` at a **390 px** viewport in
  headless Chromium, sums `transferSize` for every `.js` resource via
  `performance.getEntriesByType('resource')`, and fails if the total exceeds the
  budget. It refuses an empty measurement (no JS loaded) rather than treating it
  as a pass, and refuses a missing `dist/` export.
- Added `npm run perf:login-route`; wired it into `.github/workflows/ci.yml`
  immediately after `npm run perf:budget`.
- `tests/perf/perf-budget-fields.test.ts` now covers **both** gate scripts
  (`check-entry-budget.js` and `measure-login-route.js`), so every config field
  must be named by an enforcing script.

Spec note: the sprint text said "`check-entry-budget.js` enforces every field".
Keeping the resource-timing measurement in its own script is a deliberate,
honest deviation — that script needs a browser and an HTTP server, while the
entry-budget check is a pure filesystem/zlib check. The invariant the spec
cares about (no unenforced field) is enforced by the meta-test across both
scripts, not by putting all logic in one file.

### The gate passes on the real export

```
$ npm run build
...
Exported: dist
$ npm run perf:login-route
[LOGIN BUDGET] route /login @ 390px
[LOGIN BUDGET]   __expo-metro-runtime-1f8f5d3ca6b7f58204d51e14506d73fb.js — 1893 B transferred
[LOGIN BUDGET]   __common-b1049da4b05bf9df0c7a6e0b9e803179.js — 299361 B transferred
[LOGIN BUDGET]   entry-0d4ac274a44ffbf560d60aad0814a19e.js — 429589 B transferred
[LOGIN BUDGET] total transferred: 730843 B (budget 730843 B)
[LOGIN BUDGET] PASS
exit 0
```

### The gate rejects a breach (fail-closed proof)

```
$ LOGIN_TRANSFERRED_BUDGET_BYTES=1000 node scripts/perf/measure-login-route.js
[LOGIN BUDGET] total transferred: 730843 B (budget 1000 B)
[LOGIN BUDGET] FAIL: login-route JS transferred 730843 B > budget 1000 B
exit 1
```

The override exists only to prove rejection; CI never sets it. No assertion was
weakened and no test timeout was raised. The meta-test flipped green after the fix:

```
$ npx vitest run -c vitest.config.js tests/perf/perf-budget-fields.test.ts
Test Files  1 passed (1) | Tests  2 passed (2) | exit 0
```

## 3. Ratchet discipline

`loginRouteTransferredBytes` may only **decrease**. If a future build legitimately
cuts login-route JS, lower the value in `perf-budget.json` in the same commit and
record the new measurement here. Never raise it to make CI green. The comment in
`perf-budget.json` states this.

## 4. Investigation note — reaching ≤ 300 KB (NO WORK DONE)

The Phase 2 target was "login-route JS transferred ≤ 300 KB"; the measured
730,843 B is ~2.4× that target. This investigation note is recorded as required
by the sprint; **no code was changed to chase it** in this truth pass.

Where the bytes go (from the breakdown above):

| Chunk | Transferred | Note |
|---|---:|---|
| `entry-*` | 429,589 B | Root layout stays eager: it resolves auth before routing. Largest single lever, also the riskiest. |
| `__common-*` | 299,361 B | Shared react-native-web / UI / design deps loaded on every route. |
| `__expo-metro-runtime-*` | 1,893 B | Metro runtime shim. |

Plausible levers for a *future* standalone perf sprint (not attempted here, each
needs its own measurement and its own fail-first proof):

1. Defer auth resolution out of the eager root layout so the login route stops
   pulling the full `entry` chunk. Highest impact, highest regression risk
   (auth gating is the real boundary — see W1-4/T6).
2. Split `__common-*` by trimming what the root layout eagerly imports; several
   UI primitives are currently pulled by the shared bundle.
3. Re-run Lighthouse after any change — the current mobile Performance is 26,
   FCP 9.7 s / LCP 20.4 s / TBT 3,980 ms, so JS bytes are not the only factor.

No claim is made that this note fixes the target. It is a pointer for a future,
separately-gated task.

## 5b. W1-5 interaction — the ratchet stayed fixed while the app changed

The W1-6 ceiling of 730,843 B was measured on the pre-W1-5 build. The W1-5 root-layout
fix (recognising `/setup-wizard` as onboarding) legitimately grew the eager `entry` chunk:

| Build state | entry transferred | Total | Gate |
|---|---:|---:|---|
| W1-6 baseline (`5296bfd`) | 429,589 B | 730,843 B | PASS (at ceiling) |
| + W1-5 layout fix only | 429,615 B | 730,869 B | **FAIL — 26 B over** |
| W1-5 final (debug logs removed, `else if` flattened) | 429,545 B | **730,799 B** | **PASS — 44 B headroom** |

The budget value `loginRouteTransferredBytes: 730843` in `perf-budget.json` was **never
changed**, and no assertion, timeout or threshold was loosened. The offset came from
removing three debug-only console statements in `app/_layout.tsx` (`[AUTH] event`, which
can carry session tokens; `[PROFILE] Sync start:`, which logged a user id;
`[PROFILE] Missing. Creating...`) and flattening a redundant `else { if }`.
All error/failure diagnostics remain. Several other removals were measured and made the
minified bundle *larger* through variable renaming; they were reverted, not kept. The
final measurement is a command run this session (`npm run perf:login-route`, PASS).

## 5. Honest status

- **DONE:** dead fields removed; one real, measured, fail-closed ratchet enforced
  in CI; meta-test proves no unenforced field; investigation note recorded; the W1-5
  app fix stayed under the unchanged ceiling (730,799 B, 44 B headroom).
- **NOT DONE / out of scope:** reaching the ≤ 300 KB target itself; Lighthouse
  Performance ≥ 80. Both remain explicit gaps in `STATUS.md`.
