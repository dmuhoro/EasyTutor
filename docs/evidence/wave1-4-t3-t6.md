# Wave 1 / W1-4 — T3 Route Smoke: evidence

**Date:** 2026-11-17 · **Branch:** `fix/truth-pass` (unpushed by design) · **Base:** `origin/main` @ `cae99d9`
**Scope of this file:** T3 only. T4, T5 and T6 are appended in their own commits.
Spec: `sprints/sprint_20_wave1_truth_pass.md` § W1-4.

---

## 1. Reproduction — the old gate was false protection

File under test before the fix: `tests/smoke/routes.smoke.test.ts` (deleted in this change).

Method: a temporary copy of the harness was injected with three defects, one at a time, and
run with `npx vitest run -c vitest.config.js <temp file>`. All temp files were deleted after
reproduction.

| Injected defect | Old harness result |
|---|---|
| Route entry pointing at a non-existent module (`app/__DOES_NOT_EXIST__`) | **PASSED** — `38 passed (38)`, exit 0 |
| Route entry pointing at a non-component module (`lib/utils`, no default component) | **PASSED** — `38 passed (38)`, exit 0 |
| Default component whose child throws `INJECTED RENDER CRASH` during render | **PASSED** — `39 passed (39)`, exit 0 |

Root causes, verified in the old source:

- `import(...)` was wrapped in `try { … } catch { return; }` — a failed import became a silent skip.
- A module whose `default` was not a component was skipped by a type guard instead of failing.
- Components were called as plain functions (`Component()`), so React never rendered children
  and no error boundary could observe a nested render crash.
- The route list was a hand-maintained array; `app/index.tsx` was silently skipped because
  `react-native-safe-area-context` could not be parsed by Vitest.

**Conclusion:** the old smoke test could be green with the production route tree broken. It was
removed, not repaired in place.

---

## 2. The replacement gate

`tests/smoke/routes.smoke.test.tsx` (new):

- **Coverage from disk:** route modules are discovered by recursively walking `app/` for
  `*.tsx`. A new route file automatically becomes a test case; a deleted file cannot leave a
  stale passing assertion. The discovery test asserts ≥ 40 modules and that every derived
  module resolves to a real file. This run discovered 43 route files → 43 mount cases + 1
  discovery case = 44 tests.
- **No silent skips:** every import is a bare top-level `await import(module)`. There is no
  `catch`, no fallback component, no `.skip`. A non-function `default` fails
  `expect(typeof Component).toBe('function')`.
- **Real mounting:** `react-test-renderer`'s `act()` + `TestRenderer.create()` renders the
  component inside `React.Suspense` and a real `CaptureBoundary` class component. The boundary
  records every caught error in `componentDidCatch`; the test asserts the collected list is
  exactly `[]` and that a tree was produced.
- **Test-only tooling:** `react-test-renderer@19.2.3` and its type package
  `@types/react-test-renderer@19.3.0` are declared as dev dependencies only. Host components,
  native-module stand-ins and binary-asset no-ops live in `tests/mocks/` and `tests/setupTests.ts`;
  none of them is imported by application code. No production dependency was added.

---

## 3. Proof of the proof — the new gate rejects all three defects

Method: a temporary `app/__smoke_probe.tsx` was created with each defect in turn and the real
harness was run. The file was removed after each run and a final clean run confirmed green.

| Injected defect | New harness result |
|---|---|
| `import './__DOES_NOT_EXIST__'` | **FAILED** — `Cannot find module './__DOES_NOT_EXIST__'`, exit 1, `1 failed / 44 passed` |
| `export default { notAComponent: true }` | **FAILED** — `1 failed / 44 passed`, exit 1 |
| Child `Bomb()` throws `__SMOKE_PROBE_CRASH__` | **FAILED** — error caught by `CaptureBoundary`, exit 1, `1 failed / 44 passed` |
| Clean tree (probe removed) | **PASSED** — `44 passed (44)`, exit 0 |

The new harness also surfaced a real under-specified mock: `supabase.auth.getSession()` in
`app/(auth)/update-password.tsx` returned `undefined`, producing an unhandled rejection and
exit 1 even though all 44 assertions passed. The mock was corrected to return Supabase-shaped
responses (`{ data: { session: null }, error: null }`, and a subscription shape for
`onAuthStateChange`). Final focused run: exit 0, no unhandled errors. No assertion was weakened
and no timeout was raised.

---

## 4. Gates run this session (all numbers from this session)

| Gate | Command | Result |
|---|---|---|
| Focused route smoke | `npx vitest run -c vitest.config.js tests/smoke/routes.smoke.test.tsx` | ✅ 44 passed (44), exit 0 |
| Full test suite | `npm test` | ✅ 70 files / 394 tests, exit 0 |
| Typecheck | `npm run typecheck` | ✅ 0 errors, exit 0 |
| Lint | `npm run lint` | ✅ 0 errors / 188 warnings, exit 0 |
| Declared imports | `npm run check:imports` | ✅ 397 files scanned, exit 0 |
| AI boundary | `npm run check:ai-boundary` | ✅ PASS, exit 0 |
| Governance audit | `npm run audit:governance` | ✅ exit 0; 6 pre-existing raw-Supabase WARNs, contracts present |
| Circular dependencies | `npm run lint:cycles` | ✅ 0 errors / 13 warnings, 327 modules / 1196 dependencies, exit 0 |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations, exit 0 |
| Secret exposure | `npm run guard:secret-exposure` | ✅ 275 client files scanned, exit 0 |
| Public env allowlist | `npm run guard:public-env` | ✅ 2 `EXPO_PUBLIC_*` names checked, exit 0 |
| Web entry budget | `npm run perf:budget` | ✅ gzip 443,493 B / 450,000 B; raw 1,701,922 B / 1,750,000 B; 38 route chunks (min 30) |
| Edge function typecheck | `deno check supabase/functions/ai-proxy/index.ts` | ✅ exit 0 |
| Lockfile consistency | `npm ci --dry-run` | ✅ exit 0, 9 packages added (no peer entries pruned) |

Lockfile note: the first install used `--legacy-peer-deps` and pruned 9 peer entries
(including `@react-native/babel-preset`). That lockfile was discarded. The committed lockfile
was regenerated without the flag: 16 insertions, 1 deletion (the `peer: true` marker on
`@types/react-test-renderer`, now an explicit dev dependency). A fresh `npm ci` therefore keeps
the React Native peer graph intact.

---

## 5. Honest status

- **T3: DONE** — every route in `app/` is imported and mounted in a real error boundary; a caught
  error, failed import or non-component module fails the suite. Negative proof recorded in §3.
- The harness is *not* a browser E2E test. It does not prove navigation, auth redirects, data
  round-trips or visual correctness. Those remain T4–T6 / W1-5 scope.
- Global test mocks are a trade-off: they make host-native modules mountable under Vitest. They
  are test-only and cannot mask a render error inside application components — proved in §3.
- `react-test-renderer` emits a deprecation notice and an `act(...)` environment warning on
  stderr. These are tooling notices, not test failures; assertions and exit codes are enforced.
