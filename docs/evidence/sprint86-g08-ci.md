# G-08 — pushed CI proof (observed)

**Branch:** `audit/g08-exhaustive-boundaries`
**Pushed head:** `12f942821647c8b63395667b7e3aa581326ea52a`
**Pull request:** https://github.com/dmuhoro/EasyTutor/pull/68
**CI run:** https://github.com/dmuhoro/EasyTutor/actions/runs/46050784355
**Observed at:** 2026-11-27T18:45Z

## Checks observed with `gh pr checks 68 --watch` (exit 0)

| Check | Result | Duration | Link |
| --- | --- | --- | --- |
| RLS matrix (247 assertions, fail closed) | pass | 57s | https://github.com/dmuhoro/EasyTutor/actions/runs/46050784355/job/140681257520 |
| build | pass | 2m19s | https://github.com/dmuhoro/EasyTutor/actions/runs/46050784355/job/140681257439 |
| Real stack (Supabase CLI + full e2e) | pass | 2m57s | https://github.com/dmuhoro/EasyTutor/actions/runs/46050784355/job/140681257076 |
| Vercel – easytutor | pass | — | https://vercel.com/daniel-muhor01/easytutor/QJwqqaEbFE157LehwxH8F5ZWVvGY |
| Vercel Preview Comments | pass | — | https://vercel.com/github |
| Supabase Preview | skipping | — | dashboard link omitted |

A transient Vercel failure was observed on the first poll at deployment
`dpl_BHsBTZbnE1bfd6GYMYRdifacJqGK`, then replaced by a successful deployment for
the same head. The final watched result was exit 0 with every check passing or
explicitly skipped.

## Promotion rule

This is evidence of a green PR run, not a promotion. `G-08` may be promoted only
after the exact head is green on `main` and a separate docs PR cites that SHA and
run URL, per `sprints/sprint_86_pilot_ready.md`.
