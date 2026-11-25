# Sprint 50 — promote only rows whose acceptance is proven in CI

PR #24 pushed head `9b24faa` produced run
`https://github.com/dmuhoro/EasyTutor/actions/runs/45573764837`. The all-checks gate reported
five checks and no pending/failing check (`build`, `Real stack (Supabase CLI + full e2e)`,
`Vercel – easytutor`, `Vercel Preview Comments` passed; `Supabase Preview` skipped), and
`node scripts/readiness/check-pr-checks.mjs 24` exited 0. Every promotion below is tied to that
run or, where named explicitly, to the earlier green PR #23 run. No scoring weight, threshold,
budget, timeout or assertion was changed.

## Eligibility rule

A `VERIFIED-LOCAL` row was promoted only when CI executed its acceptance command **exactly** or
executed `npm test`, which collects the same Vitest file as the targeted command. A CI green on
an unrelated gate is not proof. `VERIFIED-IN-CI` evidence adds the run URL to the row's existing
file/test evidence.

## Promoted (53 rows)

| Basis | Rows |
|---|---|
| Exact CI step `npm run check:imports` | GT-20 |
| Exact CI step `npm run guard:secret-exposure` | C48 |
| Exact CI step `npm run perf:budget` | C38 |
| Exact CI step `npm run e2e:smoke` | C33 |
| Exact CI step `npm run e2e:full` in `real-stack` | E2-T1, GT-08 |
| Exact CI proof via all-checks gate on PR #23 | E2-T3 |
| Same Vitest files via CI `npm test` | C06, C07, C08, C09, C10, C12, C14, C15, C17, C18, C19, C24, C25, C26, C27, C29, C32, C39, C40, C41, C42, C43, GT-01, GT-02, GT-03, GT-05, GT-07, GT-09, E1-T2, E1-T3, E1-T4, E1-T5, E3-T1, E4-T1, E4-T2, E4-T3, E6-T3, E7-T1, E7-T3, E8-T1, E8-T3, E8-T4, E8-T5, E10-T1, E12-T1, E12-T2 |

One row was promoted from `MISSING`, not merely re-labelled: **E2-T2** (pin CI ports to 54331).
`.github/workflows/ci.yml:73` greps the pinned port and the same run's `real-stack` job completed
`npm run e2e:full` green, so the row now has file, test and run evidence.

## Rejected candidates

- **GT-12 / E5-T2**: `npm audit --omit=dev --audit-level=critical` is not a CI step; CI `npm ci`
  does not execute that command. Local proof stays local.
- **C46 / C47 / GT-11 / E5-T3**: migration and RLS matrix scripts are not CI steps.
- **C01 / C02 / C03 / C04 / E1-T1 / E1-T6**: `test:auth-flow` and the env-name grep are not CI
  steps; `authFlow.integration.test.ts` is excluded from Vitest by design.
- **GT-10**: the budget gate passes but the row claims 241 B headroom; actual headroom is 17 B.
- **F1–F8**: `npm run readiness:check` proves the register is internally consistent, not that an
  epic's product claim is true. These remain PARTIAL/MISSING until their constituent rows are proven.
- **C22 / C30 / GT-15 / E7-T2 / E8-T2**: their commands ran green but do not prove the row's own
  claim, as recorded in `docs/evidence/sprint49-verified-rows.md`.

## Result

Scores from the pushed green run, not a local-only claim: PILOT **52.7 %**, V1-ACADEMIC **35.7 %**,
V1-POLYMATH **35.0 %**, WORLD-CLASS **19.3 %**; all `READY=NO`. Open P0 counts remain 14 / 10 / 8 /
11 because CI promotion does not make credential-blocked or unimplemented rows true.
