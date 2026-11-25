# Sprint 67 — Home recommendations become actionable

## Real boundary

`screens/tabs/index.tsx` — the reachable Home tab. `getRecommendedTopics` is the
real governed selector (C21). Before this change a recommended topic was a dead
`View`: it rendered text but offered no way to act on it. Weak-spot cards on the
same screen already deep-linked into the study route. This change brings
recommendations to that same capability level.

No new import, locale key, store or endpoint was introduced. `TouchableOpacity`,
`useRouter`, `t('practice')` and `nextRoadmap?.subjectId` were already present in
the screen. Because the change is confined to the lazy Home chunk, the login
route budget is untouched.

## Red before green

`tests/flows/recommendation.surface.test.ts` was extended with a real-screen
assertion: tapping the accessible recommendation control must push the study
route with the topic, the active roadmap subject and the `Teach & Quiz` mode.

```text
RED:  Test Files 1 failed (1); Tests 1 failed | 3 passed (4)
      AssertionError: expected 0 to be greater than 0
      (no control with accessibilityLabel "Practice fractions" existed)
GREEN:Test Files 1 passed (1); Tests 4 passed (4)
```

No assertion, timeout or budget was loosened. The existing three C21 tests still
assert that failed or empty selector reads never invent a recommendation.

## Gate proof (local, before PR)

| Gate | Result |
|---|---|
| typecheck | 0 |
| lint | 0 errors |
| `npm test` | 112 files / **597** tests passed |
| boundaries | 0 |
| governance | 0 |
| AI boundary / imports | PASS |
| readiness valid | 0 |
| web export | 0 |
| QA runner | SUCCESS |
| `npm run perf:login-route` | **732,972 / 733,000 B PASS** (unchanged from baseline) |

AGENTS.md, the GT-21 evidence string and GT-21 acceptance command were updated
from 596 to 597 tests so the tracked count matches the suite. The CI drift gate
initially failed because it also hardcoded 596; it was updated to 597, not
removed or relaxed.

## CI proof

PR #41 green on run
`https://github.com/dmuhoro/EasyTutor/actions/runs/45662132473` — all 5 checks
reported, none pending or failing; `build` and `Real stack (Supabase CLI +
full e2e)` both pass. Merged to `main` at `dfa0756`; remote ref verified.
