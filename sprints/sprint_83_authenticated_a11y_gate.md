# Sprint 83 — C31 / GT-16 / E15-T1: authenticated axe at the real boundary

## Spec and real boundary

`C31` is `IMPLEMENTED-UNPROVEN`, `GT-16` is `PARTIAL`, and `E15-T1` is `MISSING`.
Their acceptance command is `npm run test:e2e:a11y`, but that script does not exist
and CI never runs an authenticated accessibility audit.

The real learner path is the existing `npm run e2e:full` real-stack walkthrough:
real Supabase sign-up, real onboarding/setup writes under RLS, then the real
authenticated Learn screen. The audit must run on that session, not on an
unauthenticated mock.

## Change surface

1. Add `test:e2e:a11y` to `package.json`, backed by the real-stack demo config and
   the existing walkthrough that signs in a learner.
2. Add one serial test at the end of that walkthrough which runs `@axe-core/playwright`
   against the authenticated screen at 390 px and asserts zero serious/critical
   violations.
3. Add a fail-closed CI step in the `real-stack` job that runs the exact acceptance
   command. No timeout, matcher or threshold is loosened.
4. Acceptance entries for `C31`, `GT-16` and `E15-T1` already name this command;
   no readiness row is promoted in this code unit.

## Red control (pre-registered)

Before the change, run `npm run test:e2e:a11y` on byte-for-byte `v1.16.4` tooling
and record the exit status. It must fail with `Missing script`, proving the gate
is absent rather than silently passing.

Separately prove the detector is not vacuous: run `AxeBuilder` against a temporary
page with an unlabeled text input and require at least one serious violation. This
is a harness control only; no product source is weakened.

## Green control

The same command must pass after the script, test and CI wiring are added, with
the authenticated real-stack session and zero serious/critical violations.

## Non-goals (hard)

- No readiness row is promoted by the code unit; promotion follows exact pushed
  green CI in a separate docs change.
- No `DEC-0X.md` file is created or touched.
- No mobile Lighthouse target is introduced (`D12`/`DEC-03` remain Daniel-owned).
- No axe rule is disabled and no impact filter is broadened.
