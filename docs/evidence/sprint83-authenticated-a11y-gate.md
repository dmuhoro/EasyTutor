# Sprint 83 evidence — authenticated axe at the real boundary

## Gate absence (red control)

Before the change, on byte-for-byte `v1.16.4` tooling, the row acceptance command
was run and failed closed:

```sh
npm run test:e2e:a11y
```

Result: exit 1, `npm error Missing script: "test:e2e:a11y"`. The gate was absent,
not silently passing.

## Detector negative control

To prove the audit is not vacuous, `AxeBuilder` was run against a temporary page
containing one unlabeled text input. It reported `document-title:serious` and
`label:critical`. No product source was used or weakened in that control.

## Real-path red control

After adding the command and the authenticated audit test, but before fixing the
product markup, the same command ran the full real-stack walkthrough and failed:

- 3 walkthrough tests passed;
- the new WCAG test failed with **10 serious violations**:
  - 8 × `aria-prohibited-attr` on the Home week-status `View` dots
    (`aria-label` on a `div` with no valid role);
  - 2 × `label-content-name-mismatch` on the profile button whose `aria-label`
    omitted the visible header context.

This is the real authenticated Home rendered by the real built app against the
local Supabase stack. No axe rule was disabled and no impact filter was
broadened.

## Fix at the real boundary

- `screens/tabs/index.tsx` profile button: removed the incomplete `accessibilityLabel`
  so the accessible name comes from its visible text;
- Home week-status dots: changed `accessibilityRole` to `image`, which maps to a
  valid web role for a labelled status glyph.

The same command then passed unchanged: **4 tests / 4 passed**, including the
authenticated axe assertion with zero serious or critical violations.

## Full local gate

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / 129 warnings (pre-existing) |
| `npm test` | 118 files / 622 tests passed |
| `node scripts/architecture/validate_boundaries.js` | 0 violations |
| `npm run audit:governance` | PASS |
| `npm run check:imports` | 465 files scanned; PASS |
| `npm run check:ai-boundary` | PASS |
| `node scripts/qa/qa_runner.js` | All systems verified |
| `npm run readiness:check` | 153 rows valid; READINESS.md current |
| `npm run guard:secrets` | PASS |
| `npm run guard:dist` | PASS |
| `npm run lint:cycles` | 0 errors / 13 pre-existing orphan warnings |
| `npm run audit:full` | All verification steps passed |
| `npm run build` | exit 0 |
| `npm run perf:login-route` | 669,283 / 733,000 B PASS |
| `npm run perf:budget` | gzip 437,860 / 450,000 B; raw 1,674,508 / 1,750,000 B; 39 route chunks PASS |
| `npm run e2e:smoke` | 9 passed |
| `npm run e2e:full` | 4 passed |
| `npm run test:e2e:a11y` | 4 passed |

Generated readiness remains PILOT 68.3 %, V1-ACADEMIC 53.7 %, V1-POLYMATH 53.8 %,
WORLD-CLASS 29.2 %, all `READY=NO`. No row was promoted in this code unit. No
`DEC-0X.md` file was created or touched.

## CI proof

PR #59 head `b7f0ec5e9e86201898a723f9b141808639287d8c` passed all required jobs
on run [45875822495](https://github.com/dmuhoro/EasyTutor/actions/runs/45875822495):

| Job | Result |
|---|---|
| `build` | pass (2m44s) |
| `Real stack (Supabase CLI + full e2e)` | pass (2m53s) |
| `RLS matrix (247 assertions, fail closed)` | pass (57s) |
| `Vercel – easytutor` | pass |
| `Vercel Preview Comments` | pass |
| `Supabase Preview` | skipped |

The merge commit `9d708891184f98e651105f7c41bf812cf5ca6f35` also passed on main
run [45876273379](https://github.com/dmuhoro/EasyTutor/actions/runs/45876273379).

### Promotion scope

Only `C31` and `GT-16` are promoted to `VERIFIED-IN-CI` on the exact PR run.
`E15-T1` is **not** promoted: its registered dependency `GT-24` remains `PARTIAL`
because no Daniel-approved mobile Lighthouse target exists. Generated WORLD-CLASS
score moves 29.2 → 31.7 % (34.40 → 37.40/118); other milestones and `READY=NO`
are unchanged. No other row is touched, and no `DEC-0X.md` file is created or
edited.
