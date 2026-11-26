# Sprint 82 — GT-06 / E11-T1 / E11-T2: one mastery evaluator at the real boundary

## Why this is allowed now

`GT-06` (`Two disconnected mastery systems`) is `PARTIAL`; `E11-T1` and `E11-T2`
are `MISSING`. Sprint 77 implemented the adapter but was rejected because the
real-stack CI walkthrough hung. Sprint 80 proved that failure was in the test
harness (`route.fetch()` left a request pending), not in the adapter: a docs-only
PR failed the same way and was fixed without touching product code. With the
harness fixed, the adapter can be retried on its real path.

## Spec and real boundary

The live boundary is:

- `screens/shared/practice-session.tsx` calls `updateMastery` from `lib/mastery.ts`;
- `src/intelligence/mastery/masteryCoordinator.ts` calls `getMasteryBand` from
  `lib/mastery.ts`;
- `src/domain/learning/mastery.ts:16` owns the canonical `evaluateMastery`.

`lib/mastery.ts` currently duplicates band thresholds and weak-topic detection.
This change makes both call the canonical domain evaluator. No governed read,
write, cache key, persisted field, analytics event, portal scope or learner-visible
number changes.

## Change surface

1. `src/domain/learning/mastery.ts` gains:
   - `evaluateMasteryPercent(percent)` — maps stored 0..100 into one independent
     transfer evidence item and calls `evaluateMastery`;
   - `evaluateMasteryBand(percent)` — returns the existing `weak` /
     `developing` / `strong` labels from that confidence.
2. `lib/mastery.ts`:
   - `getMasteryBand` delegates to `evaluateMasteryBand`;
   - `updateMastery` uses `evaluateMasteryPercent(...).confidence` for the weak
     topic event.
3. Tests:
   - `tests/mastery.adapter.wiring.test.ts` mocks the domain selector so the
     real `updateMastery` path must consume it;
   - `tests/mastery.percent.adapter.test.ts` pins the exact 20..80 mapping and
     40/70 band edges.
4. Register acceptance for `GT-06`, `E11-T1` and `E11-T2` names both real tests;
   `AGENTS.md` and the fail-closed CI suite-count ratchet move to the exact new
   count.

## Red control (pre-registered)

Add both tests while `lib/mastery.ts` and `src/domain/learning/mastery.ts` are
byte-for-byte at the `6eca072` release hashes. The wiring test must fail because
`getMasteryBand` and `updateMastery` do not call the domain helpers; the adapter
test must fail because those helpers do not exist. Record exact output and hashes
before implementation.

No threshold, timeout, matcher, budget or assertion is weakened. The 40/70 band
edges and 50 weak-topic edge remain exactly as before.

## Non-goals (hard)

- No readiness row is promoted by the code unit; promotion follows exact pushed
  green CI in a separate docs change.
- No `DEC-0X.md` evidence file is created or touched.
- No persisted `MasteryRecord` field is added.
- No product behavior beyond delegation to the existing canonical evaluator.

## Verification

- Red control observed and recorded with source hashes.
- Exact acceptance command green with the same assertions.
- Full local gate green, including unchanged login and entry budgets.
- Push, require exact pushed green CI on the branch head, then merge and record
  the main run. Only then may a separate docs commit promote `GT-06`, `E11-T1`
  and `E11-T2`.
