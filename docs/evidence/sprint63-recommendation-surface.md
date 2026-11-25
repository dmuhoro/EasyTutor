# Sprint 63 — recommendations surfaced on Home (C21)

Branch `feat/recommendation-surface`. Real boundary:
`screens/tabs/index.tsx`, which now calls `getRecommendedTopics(user.id,
nextRoadmap.subjectId)` from `lib/recommendations.ts` inside the existing idle
task. The selector reads governed mastery records; with no active roadmap
subject, no recommendation is claimed. Failures are logged as
`HOME_recommendations_failed` and never rendered as invented topics.

## Red before green

`tests/flows/recommendation.surface.test.ts` was written first:

```
npm run test -- tests/flows/recommendation.surface.test.ts
RED: Test Files 1 failed (1); Tests 2 failed | 1 passed (3)
  expected "vi.fn()" to be called with arguments: [ 'learner-9', 'mathematics' ]
  expected "vi.fn()" to be called with arguments: [ 'HOME_recommendations_failed', …(1) ]
```

No assertion, timeout or threshold was loosened to obtain green. After wiring
the real Home call:

```
GREEN: Test Files 1 passed (1); Tests 3 passed (3)
```

The same three cases cover: real selector called with the signed-in learner and
active subject; only returned topics rendered; empty and failed reads produce
no false section.

## Full gate on the final tree

| Check | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm test` | 112 files / 596 tests passed |
| Focused Home suites (recommendation, exam countdown, home-today, spaced repetition) | 4 files / 18 tests passed |
| `npm run build` | exit 0 |
| `npm run perf:login-route` | 732,974 B / 733,000 B PASS (26 B headroom) |

The login ratchet was not changed; the two additional bytes came from the new
idle-task call in an already-shared module. Touched screen has zero raw hex and
all new UI strings go through `t()` (`topics`, `flagged`).

## Suite-count gate

Adding the new acceptance file moved the exact suite count from 111/593 to
112/596. `grep -q "112 files / 596 tests" AGENTS.md` was proven red (exit 1)
before the edit and green after; `.github/workflows/ci.yml` was updated with the
same exact string. GT-21 is therefore demoted from `VERIFIED-IN-CI` to
`VERIFIED-LOCAL` until a pushed green CI run executes the new grep. Its stale
run URL was removed rather than cited as proof of a different count.

## Status

C21 is `VERIFIED-LOCAL` only. No row is promoted to `VERIFIED-IN-CI` in this
slice. No budget, threshold, weight or assertion changed; no secret was
committed or printed.
