# Sprint 77 — E11 bundle-neutral spike REJECTED by CI

## Decision

The E11 bundle-neutral adapter spike is **rejected**. The production changes are
reverted, the two adversarial tests are archived, and no readiness row is
promoted. `GT-06`, `E11-T1`, and `E11-T2` remain at their existing register
statuses.

The pre-registered fail-closed rule in
`sprints/sprint_77_e11_bundle_neutral_spike.md` says that any CI gate failure
reverts the implementation. That rule is being applied exactly; no threshold,
timeout, matcher, or acceptance command was changed to obtain a pass.

## Exact CI object

- PR: `https://github.com/dmuhoro/EasyTutor/pull/51`
- Head: `9017c036ea7987cd40415d596148e22a74a48ef9`
- Workflow run: `45775046681`, event `pull_request`, branch
  `spike/e11-bundle-neutral-adapter`
- `build` job: **success** on all three attempts, including typecheck, lint,
  117 files / 620 tests, suite-count gate, audits, QA runner, web export, entry
  budget, login ratchet, and 9/9 no-backend smoke tests.
- `RLS matrix (247 assertions, fail closed)` job: **success** on all three
  attempts.
- `Real stack (Supabase CLI + full e2e)` job: **failed on all three attempts**.

## Exact real-stack failures

| Attempt | Job ID | Failed test | Observed failure |
|---|---|---|---|
| 1 | `139756567771` | `setup wizard advances one step at a time, persists under RLS and survives reload` (`tests/e2e/coreLoop.demo.spec.ts:152`) | `getByText('Flagship learning', { exact: true })` never became visible; 15 s timeout after reload |
| 2 | `139759890249` | `deep link renders the wired Learn screen with a free-form topic` (`tests/e2e/coreLoop.demo.spec.ts:204`) | `getByText('Learn').first()` never became visible; 15 s timeout |
| 3 | `139761959072` | `setup wizard advances one step at a time, persists under RLS and survives reload` (`tests/e2e/coreLoop.demo.spec.ts:152`) | `getByText('Flagship learning', { exact: true })` never became visible; 15 s timeout after reload |

The uploaded Playwright error context for the post-reload failure showed only:

```text
- progressbar "Loading EasyTutor"
```

The failure is an app boot hang in the real-stack harness, not a mastery-band
assertion and not a login-budget failure. The exact baseline commit
`a5e50c8ffb19596e483fc99149ca8518f6398e96` passed the same real-stack job on
run `45768798788`, but the spike branch failed it three consecutive times.
Under the pre-registered rule, that is still a failed gate.

## Local evidence before CI

- Red control: `2 files failed / 6 tests failed`.
- Green control after implementation: `2 files passed / 6 tests passed`.
- Full local gate: typecheck 0, lint 0 errors / 129 warnings, 117 files /
  620 tests, all static audits PASS, build exit 0, QA all systems verified,
  e2e smoke 9/9.
- Local login ratchet: `667,223 / 733,000 B PASS`, +245 B from the
  `666,978 B` baseline. Budget was not changed.
- Evidence: `docs/evidence/sprint77-e11-red-control.md` and
  `docs/evidence/sprint77-e11-spike-green.md`.

Local green did not override the pushed CI failure.

## Reversion and integrity

- `lib/mastery.ts` and `src/domain/learning/mastery.ts` are restored from the
  released `main` baseline.
- `tests/mastery.adapter.test.ts` and `tests/mastery.domain-adapter.test.ts`
  were moved to `archive/tests/` with `git mv`, preserving evidence without
  keeping failing tests in the live suite.
- `AGENTS.md` and `.github/workflows/ci.yml` suite-count gates are restored to
  `115 files / 614 tests`.
- Version and release tag remain `1.16.2`; this is not a shipped upgrade.
- No budget, threshold, timeout, assertion, test, or acceptance command was
  weakened to make CI green.

## Next work

Fall back to the agreed real-screen proof for `C03 + C04` onboarding/setup.
Because the real-stack harness itself is currently failing post-reload boot on
this branch, that fallback must first establish a trustworthy green real-screen
baseline before any readiness row is promoted.
