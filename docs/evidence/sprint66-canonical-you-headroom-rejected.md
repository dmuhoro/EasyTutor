# Sprint 66 — canonical state on You: rejected by login ratchet

Branch `feat/canonical-you-surface` (local only; no PR). **No code ships.**

## Goal

Surface the one canonical learner-state projection on the You hub. It already
renders on the lazily loaded Math journey screen but not on Home or You. This
was a real capability slice, not a gate chase.

## Red before green (both variants)

New real-screen test `tests/screens/canonicalYou.test.tsx` rendered the actual
`screens/tabs/you.tsx` with inert child tabs and a seeded canonical projection:

```
RED:  Test Files 1 failed (1); Tests 1 failed | 1 passed (2)
      expected 'Progress | Settings' to contain 'Your Progress'
GREEN (both variants): Test Files 1 passed (1); Tests 2 passed (2)
```

No assertion, timeout, threshold or budget was loosened. No new locale keys
were added: the strip used `yourProgress`, `conceptsMasteredFull`, `syncing`
and `synced` from the existing en/sw/fr packs.

## Measured rejection

| Tree | `__common` | `entry` | Total vs 733,000 B |
|---|---|---|---|
| `main` baseline (`86a42fe`) | 306,616 B | 424,465 B | **732,974 B PASS** (26 B headroom) |
| Variant A — static `useMathJourneyStore` selector hook | 313,480 B | 424,490 B | 739,863 B **FAIL** (+6,889 B) |
| Variant B — `import()` in `useEffect` + `getState()`/`subscribe()` | 313,480 B | 424,488 B | 739,861 B **FAIL** (+6,887 B) |

Metro hoists `store/mathJourneyStore.ts` and its canonical/domain chain into the
shared chunk even when the only consumer is a lazy tab, so the dynamic-import
variant did not recover the margin. The correct response is not a raised budget
but a smaller product surface; this slice is therefore rejected.

## State after rejection

- `screens/tabs/you.tsx` restored byte-for-byte from `main`.
- Rejected test removed; suite count remains **112 files / 596 tests**.
- `perf-budget.json` unchanged at 733,000 B; no test renamed, skipped or
  deleted from the shipped tree.
- E11 remains blocked for the same structural reason (third measured rejection;
  see `docs/evidence/sprint59-mastery-unification-rejected.md` and
  `docs/evidence/sprint62-mastery-headroom-rejected.md`).

## Honest capability note

Canonical state is live on the Math journey screen only. Home and You still do
not claim it. No status row was promoted on the strength of this attempt.
