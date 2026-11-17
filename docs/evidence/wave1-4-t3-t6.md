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
  module resolves to a real file. After T4 this run discovers 42 route files → 42 mount cases
  + 1 discovery case + 1 deterministic empty-topic quiz regression = 44 tests.
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

## 3. Proof of the proof — the new gate rejects all four defects

Method: a temporary `app/__smoke_probe.tsx` was created with each defect in turn and the real
harness was run. The file was removed after each run and a final clean run confirmed green.

| Injected defect | New harness result |
|---|---|
| `import './__DOES_NOT_EXIST__'` | **FAILED** — `Cannot find module './__DOES_NOT_EXIST__'`, exit 1, `1 failed / 44 passed` |
| `export default { notAComponent: true }` | **FAILED** — `1 failed / 44 passed`, exit 1 |
| Child `Bomb()` throws `__SMOKE_PROBE_CRASH__` | **FAILED** — error caught by `CaptureBoundary`, exit 1, `1 failed / 44 passed` |
| Render-time throw injected **inside a real screen** (`screens/tabs/index.tsx`) | **FAILED** — `__SCREEN_RENDER_CRASH__` caught by `CaptureBoundary`, exit 1, `1 failed / 43 passed` — impossible against the old wrapper-only gate |
| Clean tree (probe removed) | **PASSED** — `44 passed (44)`, exit 0 |

The new harness also surfaced a real under-specified mock: `supabase.auth.getSession()` in
`app/(auth)/update-password.tsx` returned `undefined`, producing an unhandled rejection and
exit 1 even though all 44 assertions passed. The mock was corrected to return Supabase-shaped
responses (`{ data: { session: null }, error: null }`, and a subscription shape for
`onAuthStateChange`). Final focused run: exit 0, no unhandled errors. No assertion was weakened
and no timeout was raised.

---

## 4. Gates run this session (all numbers from this session; at the T3 commit)

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

---

# W1-4 / T4 — One home and real tab navigation

**Commit scope:** this section is added in the T4 commit; the T3 numbers above are preserved as
measured at the T3 commit and are not restated as current.

## 1. Real boundary (read before editing)

- `app/index.tsx:9,37` lazily imported and rendered `CommandCenter` **outside** the `(tabs)`
  layout. Both `app/index.tsx` and `app/(tabs)/index.tsx` resolve to `/`; the root file shadowed
  the tab home, so a signed-in learner landed on a dashboard with no tab bar (source audit
  `REPORT.md:505`).
- Auth/onboarding redirects are already owned by `app/_layout.tsx:212-226` (`router.replace`
  for no session / no onboarding / returning from auth group). Deleting the root route does not
  remove any guard.
- `components/NavigationBar.tsx` declared a second, duplicate 6-item nav (NAV_ITEMS at `:21-28`)
  with zero call sites. The real nav is `app/(tabs)/_layout.tsx`, which renders six
  `<Tabs.Screen>` entries with labels/icons. No Phase 2 screen was wired or restyled.

## 2. Reproduction — new gate fails on the old tree

`tests/navigation/tabs-layout.test.tsx` was written before any deletion and run against the
unfixed tree:

```
EXIT=1 — Tests: 2 failed | 4 passed (6)
  × has exactly one route owning / (no CommandCenter shadow outside tabs)
  × does not leave duplicate/dead navigation or dashboard components behind
```

The remaining 4 tests (tab declarations, keyboard/focus, selected state, responsive branch)
passed before the fix — the tab *layout* was already correct; the defect was the shadow route and
the dead duplicate component. No assertion was weakened to obtain the final green.

## 3. Fix

- Deleted `app/index.tsx` — `/` is now owned solely by `app/(tabs)/index.tsx`.
- Deleted `components/CommandCenter.tsx` and `components/NavigationBar.tsx` — both became
  unreferenced once the shadow route was gone; verified no remaining references in
  `app/ components/ screens/ lib/ src/ store/`.
- Added `tests/navigation/tabs-layout.test.tsx` (6 tests):
  - structural gates: exactly one `/` owner, no dead nav/dashboard files;
  - real-layout assertions: six tabs, correct `aria-label`/route pairs, each label maps to an
    existing `app/(tabs)/<name>.tsx`, six `tabBarIcon` declarations, responsive branch present;
  - keyboard/focus: ArrowRight/ArrowLeft/Home/End move focus, Enter pushes the focused route,
    and exactly one tab is tabbable (`tabIndex=0`) with `aria-selected` tracking `usePathname`.
- **Harness boundary:** keyboard mechanics are supplied by an ARIA-tablist harness that replaces
  Expo Router's native `<Tabs>` under Vitest. The test proves the real layout supplies correct
  routes, labels, selected state and responsive branch. It does **not** claim to test Expo
  Router's internal focus implementation; browser-level keyboard proof is W1-5 scope.

## 4. Gates (current, after T4)

| Gate | Command | Result |
|---|---|---|
| Nav gate | `npx vitest run -c vitest.config.js tests/navigation/tabs-layout.test.tsx` | ✅ 6/6, exit 0 (was 2 failed / 4 passed before fix) |
| Route smoke | `npx vitest run -c vitest.config.js tests/smoke/routes.smoke.test.tsx` | ✅ 43/43 (42 routes + discovery), exit 0 |
| Full suite | `npm test` | ✅ 71 files / 399 tests, exit 0 |
| Typecheck | `npm run typecheck` | ✅ 0 errors, exit 0 |
| Lint | `npm run lint` | ✅ 0 errors / 187 warnings, exit 0 |
| Production web export | `npm run build` | ✅ exit 0; `dist/` regenerated with SPA fallback + PWA injection |
| Web entry budget | `npm run perf:budget` | ✅ gzip 443,090 B / 450,000 B; raw 1,700,524 B / 1,750,000 B; 37 route chunks (min 30) |
| Declared imports | `npm run check:imports` | ✅ 395 files scanned, exit 0 |
| AI boundary | `npm run check:ai-boundary` | ✅ PASS, exit 0 |
| Circular dependencies | `npm run lint:cycles` | ✅ 0 errors / 13 warnings, 324 modules / 1170 dependencies |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations, exit 0 |
| Governance audit | `npm run audit:governance` | ✅ exit 0, contracts present |
| Secret exposure | `npm run guard:secret-exposure` | ✅ 272 files scanned, exit 0 |
| Public env allowlist | `npm run guard:public-env` | ✅ 2 names checked, exit 0 |
| Edge function typecheck | `deno check supabase/functions/ai-proxy/index.ts` | ✅ exit 0 |

## 5. Honest status

- **T4: DONE** at the code/unit level. One route owns `/`; the six-tab layout is the only nav;
  the dead duplicate and shadow dashboard are gone; keyboard/focus behaviour is asserted against
  the real layout's accessibility declarations through an ARIA harness.
- Browser-level keyboard navigation with a real signed-in session is **not** proven here — it is
  W1-5's Playwright demo scope (local Supabase + deterministic stub LLM).
- Historical sprint/design docs that name the removed components are historical records; current
  truth is `STATUS.md` and this evidence file.

---

# W1-4 / T3 truth pass — the gate only mounted `<RouteFallback />`

This section is added after T4. The T3 and T4 gate numbers above are preserved as measured at
their commits; the numbers below are current on `fix/truth-pass`.

## 1. Reproduction — a second false gate

`tests/smoke/routes.smoke.test.tsx` rendered each route inside `act()` but every route lazily
imports its screen (`lazy(() => import('../../screens/...'))`). The dynamic import was still in
flight when `act()` completed, so `TestRenderer.toJSON()` showed only `RouteFallback`'s
`ActivityIndicator` — no application screen was ever exercised. Proven with a probe that mounted
`app/(tabs)/quiz`: the tree was `{"type":"View",...,"children":[{"type":"ActivityIndicator",...}]}`
and a `Math.random` spy recorded only the fallback's call. A computed `import(specifier)` could not
fix this — Vite cannot transform it and Node's CJS loader failed on `expo-modules-core`'s raw
`src/index.ts` (`Unexpected token 'typeof'`).

## 2. Fix — preload the real screens

- Added `import.meta.glob('../../screens/**/*.tsx', { eager: true })` to the smoke harness. Vite
  expands this to literal imports at transform time, so every lazy target is cached before mount.
  The discovery test asserts ≥ 30 screen modules were preloaded.
- Added test-only host stubs for `react-native-svg` and `react-native-reanimated` (ProgressRing's
  native dependencies), plus the missing `RefreshControl` (react-native mock), `getLevel`
  (progressStore mock) and `requireNativeModule` (expo-modules-core mock) exports. All are
  test-only; no application code imports them.
- Confirmed the gate now mounts a real screen by injecting a render-time throw inside
  `screens/tabs/index.tsx` — the boundary caught it and the suite failed (§3 above).

## 3. Real defect surfaced by the honest gate — random quiz-topic crash

`npx vitest run -c vitest.config.js tests/smoke/routes.smoke.test.tsx` with a deterministic
regression test that forces `Math.random = 0.82` (→ `SUBJECTS[17]` = `uni-law`, which has zero
topics):

```
BEFORE FIX: 44 tests passed, but Vitest exit 1 — 1 unhandled rejection
  TypeError: Cannot read properties of undefined (reading 'id')
    at getRandomTopic (screens/tabs/quiz.tsx:90:97)
    at resolveTargetTopic (:84) → startInitialQuiz (:96) → mount effect (:144)
AFTER FIX:  44 passed (44), exit 0, no unhandled rejection
```

Root cause: `getRandomTopic()` indexed into all 21 subjects; `uni-law` and `uni-business` have no
topics, so `randomTopic` was `undefined` — and the throw happened synchronously inside an async
function called without `await` from a mount effect, escaping the React error boundary.

Fix in `screens/tabs/quiz.tsx`: select only subjects with ≥ 1 topic, fail closed with a clear error
when none are usable, and wrap `resolveTargetTopic()` in a guarded boundary that converts a
synchronous throw into an error message instead of an unhandled rejection. No assertion was
weakened and no timeout was raised. `SUBJECTS` has 19 eligible subjects after the filter.

## 4. Current gates (this session, after the truth pass)

| Gate | Command | Result |
|---|---|---|
| Focused route smoke | `npx vitest run -c vitest.config.js tests/smoke/routes.smoke.test.tsx` | ✅ 44 passed (44), exit 0; 3 consecutive runs green |
| Nav gate | `npx vitest run -c vitest.config.js tests/navigation/tabs-layout.test.tsx` | ✅ 6 passed (6), exit 0 |
| Full test suite | `npm test` | ✅ 71 files / 400 tests, exit 0 |
| Lint | `npm run lint` | ✅ 0 errors / 187 warnings, exit 0 |
| Typecheck | `npm run typecheck` | ✅ 0 errors, exit 0 |
| Pre-commit hook sequence | `npm run lint && npm run typecheck && npm test` | ✅ green; 3 consecutive full runs after harness fix |
| Declared imports | `npm run check:imports` | ✅ 396 files scanned, exit 0 |
| AI boundary | `npm run check:ai-boundary` | ✅ PASS, exit 0 |
| Governance audit | `npm run audit:governance` | ✅ exit 0; 3 raw-Supabase WARNs, contracts present |
| Circular dependencies | `npm run lint:cycles` | ✅ 0 errors / 13 warnings, 324 modules / 1170 dependencies |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations, exit 0 |
| Secret exposure | `npm run guard:secret-exposure` | ✅ 272 client files scanned, exit 0 |
| Public env allowlist | `npm run guard:public-env` | ✅ 2 names checked, exit 0 |
| Web entry budget | `npm run perf:budget` | ✅ gzip 443,088 B / 450,000 B; raw 1,700,524 B / 1,750,000 B; 37 route chunks (min 30) |
| Production web export | `npm run build` | ✅ exit 0; SPA fallback + PWA injection |
| SPA route contract | `npm run verify:spa` | ✅ 10/10 checks pass |
| QA runner | `node scripts/qa/qa_runner.js` | ✅ SUCCESS |
| Edge function typecheck | `deno check supabase/functions/ai-proxy/index.ts` | ✅ exit 0 |

## 5. Honest status

- The gate now mounts real screens, not just route wrappers. It is still a Vitest render harness,
  not a browser E2E test — no navigation, auth, data round-trip or visual proof (W1-5 scope).
- Global test mocks remain a trade-off; they cannot mask a render error inside an application
  component — proved by the injected real-screen crash in §3 of the T3 section.

---

# W1-4 / T5 — quiz cancel, bounded failure, offline

**Status: DONE.** All numbers below from commands run on `fix/truth-pass` this session.

## 1. Reproduction — five real gaps, all failed first

`tests/flows/quiz.reliability.test.tsx` drives the real `useQuizQuestionGeneration()` hook and spies
on the real `learningOrchestrator.generateQuizQuestion()` call site. Before the fix:

```
npx vitest run -c vitest.config.js tests/flows/quiz.reliability.test.tsx
Test Files 1 failed (1) | Tests 5 failed (5)
  offline .......... AssertionError: expected "generateQuizQuestion" not to be called, but called 1 time
  provider failure . AssertionError: expected 'ai-proxy 503' to match /try again|…/i
  hanging provider . 5,015 ms — never settled (A5 permanent-spinner failure mode)
  cancel ........... TypeError: Cannot read properties of undefined (reading 'cancel')
  unmount .......... TypeError: Cannot read properties of undefined (reading 'generateQuizQuestion')
```

Timing analysis of the old code: `withTimeout(30_000)` wrapped by `withRetry(maxRetries:2,
baseDelayMs:1000)` allowed 3 × 30 s + 3 s backoff ≈ **93 s** — over the 35 s requirement — and no
`AbortSignal` existed at any layer.

## 2. Fix — enforcement at the real boundary

- `lib/ai/reliability.ts`: added `withDeadline(fn, { signal, deadlineMs, maxRetries, … })` with one
  total wall-clock budget; retries/backoff consume that budget, abort/deadline errors are terminal,
  and the `AbortSignal` rejects the race promptly. `withTimeout` gained an optional signal so an
  abort also ends the inner AI timeout.
- `hooks/useOrchestration.ts`: the hook owns an `AbortController`, exposes `cancel()`, aborts a
  superseded request before starting a new one and aborts on unmount; the signal is threaded to
  `learningOrchestrator.generateQuizQuestion(input, signal)` → `executeSingle` → `PipelineExecutor`
  → AI timeout. `isConnected === false` short-circuits before any generation, with an explicit
  offline message. Provider errors map to a friendly message; the 30 s budget is below the 35 s cap.
- No production dependency added. Test mocks are test-only.

## 3. Proof after the fix

```
npx vitest run -c vitest.config.js tests/flows/quiz.reliability.test.tsx
Test Files 1 passed (1) | Tests 7 passed (7) | exit 0
```
7 tests = 5 original gaps + 2 real-screen proofs:
- SCREEN (offline): real `screens/tabs/quiz` renders the offline message; orchestrator call count 0.
- SCREEN (failure): real screen renders "We couldn't reach the learning service. Please try again."
  and a Retry button; pressing Retry re-invokes the real orchestrator call (asserted call count + 1).

No assertion was weakened, no test timeout was raised, and the 5 s default test timeout is intact.
The hanging-provider case uses an injected `deadlineMs` seam (production default remains 30 s) so the
abort is deterministic rather than waiting 30 s of real time.

## 4. Honest status

- The 30 s deadline is a client-side budget; it does not cancel a request already sent to the
  server (the current intelligence runtime's cloud path is a stub — W1-5 scope). It guarantees the
  UI cannot spin past 35 s and that no stale result updates state after cancel/unmount.
- No browser E2E with a real proxy failure is claimed here — that is W1-5 scope with local Supabase
  and a deterministic stub LLM.
- Full suite at this commit: 72 files / 407 tests, exit 0. Typecheck: 0 errors.
