# Sprint 78 — C03 + C04 real-screen onboarding/setup proof

## Spec and real boundary

`C03` (Onboarding handoff to setup wizard) and `C04` (Setup wizard, 7 steps)
are both `IMPLEMENTED-UNPROVEN` in `docs/readiness/register.json`. Their current
acceptance, `npm run test:auth-flow`, is a false gate:
`tests/integration/authFlow.integration.test.ts` exercises auth redirects only,
and `tests/flows/onboarding.flow.test.ts` simulates store/DB writes without
rendering either screen. This was already recorded in
`docs/evidence/closure-verified-rows.md:28-32`.

The real learner path is:

- `screens/onboarding.tsx:50-66` — `handleGetStarted` stores the selected mode
  and calls `router.replace({ pathname: '/setup-wizard', params: { level } })`.
- `screens/setup-wizard/index.tsx:69-80` — seven ordered steps plus `done`.
- `screens/setup-wizard/index.tsx:112-116` — `nextStep` advances exactly one
  step.
- `screens/setup-wizard/index.tsx:140-189` — `handleComplete` performs the real
  governed profile write, applies local preferences and marks onboarding
  complete.
- `tests/e2e/coreLoop.demo.spec.ts:131-202` — real Chromium at 390 px against
  the real local Supabase stack, exercising sign-up → onboarding → all seven
  steps → governed write → reload survival.

## Goal

Prove C03 and C04 on the real screen, not with a helper-only or redirect-only
test, and repoint their acceptance to the command CI actually runs.

## Change surface

1. Change both rows' `acceptance` from `npm run test:auth-flow` to
   `npm run e2e:full`.
2. Change both rows' evidence to name the real Playwright spec, the red-control
   evidence, the green evidence and (only after pushed proof) the exact CI run.
3. No product code, assertion, timeout, budget, threshold or test may be
   changed to obtain green. The `build` and `real-stack` CI jobs remain as-is.

## Required red controls before promotion

Each control mutates the real boundary in a tracked product file, rebuilds,
runs `npm run e2e:full` against the real local stack, records the exact failure,
then restores the file byte-for-byte:

1. **C03 handoff control** — replace the onboarding `router.replace` target with
   `/`. The real-screen suite must fail the `/setup-wizard` URL assertion.
2. **C04 step control** — make `nextStep` refuse to advance. The real-screen
   suite must fail the `2 · Your level` assertion.

A control that does not fail means the gate is vacuous; in that case the work
stops and no row is promoted.

## Hard gates

- Red controls both fail at the expected real-screen assertion.
- Restored source hashes match the pre-control hashes.
- Green `npm run e2e:full`: 3 passed against `:54331`.
- Full local gate: typecheck, lint, 115 files / 614 tests, boundary, governance,
  imports, AI boundary, web export, login `666,978 / 733,000 B`, QA, readiness,
  secret guards, dependency audit, cycles, entry budget and 9/9 no-backend
  smoke all unchanged.
- Pushed CI on the exact branch head is fully green, including `real-stack`.

## Promotion rule

Until pushed CI is green, rows stay `IMPLEMENTED-UNPROVEN`. After an exact green
run, C03 and C04 may move to `VERIFIED-IN-CI` with the run URL in evidence.
No other row is promoted. If the flaky post-reload boot seen in Sprint 77
recurs, record it and withhold promotion; do not raise timeouts.
