# Sprint 81 — C22 / E10-T2: make canonical learner state real on Home, You and Math journey

## Spec and real boundary

`C22` (`Canonical learner state (all screens)`) is `PARTIAL` and `E10-T2`
(`Consume it in Home, You and Math journey`) is `MISSING`. Both point at
`tests/domain/canonicalState.consumers.test.ts`, which only exercises pure
projection helpers. It proves the selector exists; it does **not** prove that a
screen renders canonical state.

The real boundaries are:

- `screens/tabs/index.tsx` (Home) — currently derives its sync chip directly
  from `pendingProgressSync` and never calls the canonical selector.
- `screens/tabs/progress.tsx` (rendered by `screens/tabs/you.tsx`) — currently
  renders raw `progressStore` counts and never calls the canonical selector.
- `screens/math-journey.tsx` + `store/mathJourneyStore.ts` — already project and
  render `journey.canonical`; this unit keeps that path and adds a real-screen
  assertion so the acceptance cannot drift back to the store only.

Governed reads stay in the store layer; the new selector reads only Zustand
stores and pure domain code. No UI direct Supabase call is introduced.

## Change surface

1. `hooks/useCanonicalLearnerState.ts` — one hook that derives canonical state
   from authenticated user, progress store and roadmap store inputs, then calls
   `projectCanonicalLearnerState`.
2. `screens/tabs/index.tsx` — Home renders canonical sync state and canonical
   mastery confidence.
3. `screens/tabs/progress.tsx` — You/Progress renders canonical mastery
   confidence; `screens/tabs/you.tsx` remains the real composition boundary.
4. Locale packs (`en`, `fr`, `sw`) gain one `mastery` label; no hardcoded label
   is added to the screen.
5. Tests:
   - `tests/screens/home-today.test.tsx` asserts Home's canonical sync chip and
     confidence come from the projected state.
   - `tests/screens/you-canonical.test.tsx` mounts the real `YouTab` and asserts
     its canonical confidence.
   - `tests/flows/mathAuthenticatedEvidence.test.tsx` asserts the real Math
     journey screen renders the canonical confidence it stores.
6. `docs/readiness/register.json` acceptance names the real screen/flow tests;
   `AGENTS.md` suite count is updated to the exact new count.

## Red control (pre-registered)

Before wiring the screens, add the screen assertions while the production
screens are still at their byte-for-byte `main` hashes. Run the named acceptance
command; it must fail at the new canonical assertions. Then apply the real hook
wiring and re-run: the same tests and matchers must pass.

No threshold, timeout, matcher, budget, assertion or acceptance command is
weakened. The old domain-only test remains in the acceptance set.

## Non-goals (hard)

- No readiness row is promoted by this slice; promotion requires exact pushed
  green CI and is a separate governed docs change.
- No `DEC-0X.md` evidence file is created or touched.
- The version is bumped and tagged after exact pushed green CI because this
  ships a learner-facing capability that was previously rejected, not only a
  gate edit.
- No product behavior beyond exposing already-derived canonical state on the
  three named screens.

## Verification

- Red control observed and recorded with source hashes.
- `npm test` with the exact acceptance command green at the new exact count.
- Full local gate green (typecheck, lint, tests, boundaries, governance,
  imports, AI boundary, QA, readiness, secrets, audits, cycles, dist, budgets,
  smoke and full real-stack e2e).
- Push, require exact pushed green CI on the branch head, then merge and record
  the main run. Only then may a separate docs commit promote C22 / E10-T2.
