# Truth pass — 2026-11-26 baseline

## Purpose

Freeze the verified state of `main` before the E11 spike. This record separates
what was actually observed from what was previously claimed, and establishes the
single decision input for whether E11 may be attempted under the unchanged login
ratchet.

## Repository baseline

Observed from the terminal truth pass and independently rechecked before this
file was created:

| Check | Result |
|---|---|
| `git status --short` | empty (clean tree) |
| `git rev-parse HEAD` | `a5e50c8ffb19596e483fc99149ca8518f6398e96` |
| `git branch --show-current` | `main` before the spike branch was created |
| `git pull --ff-only` | `Already up to date.` |
| `origin/main` | `a5e50c8ffb19596e483fc99149ca8518f6398e96` |
| `v1.16.2` lightweight ref | `38e78d49c8fb2d53ae7fdea0f1d7f7f43880379b` |
| `v1.16.2^{}` peeled commit | `a5e50c8ffb19596e483fc99149ca8518f6398e96` |

The annotated tag therefore points at the exact release commit, and local
`main`, remote `main`, and the peeled release tag agree.

## CI proof

The three latest `main` runs reported success:

| Run | Head | Result |
|---:|---|---|
| `45768798788` | `a5e50c8` | success |
| `45768023289` | `88b8364` | success |
| `45767567617` | `f72af0b` | success |

Run `45768798788` is bound to the exact release commit and tag target.

## Full gate observed

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 129 warnings (gate-green, not warning-free) |
| `npm test` | 115 files passed / 614 tests passed |
| `node scripts/architecture/validate_boundaries.js` | PASS |
| governance audit | PASS |
| declared-import check | PASS |
| AI-boundary check | PASS |
| `npm run build` | exit 0 |
| `node scripts/qa/qa_runner.js` | `All systems verified. Ready for release.` |
| `npm run readiness:check` | 0 |

The stderr noise in the full test output (expected AI failures, React `act(...)`
warnings, and deliberate fail-closed database refusals) belongs to negative-path
tests. The authoritative terminal results are the final `115 passed`, `614
passed`, `PASS`, and QA success lines.

## Login ratchet and readiness

| Measurement | Result |
|---|---|
| Login transfer | `666978 B / 733000 B PASS` |
| Headroom | `66022 B` |
| PILOT | `62.3%` |
| V1-ACADEMIC | `53.7%` |
| V1-POLYMATH | `44.0%` |
| WORLD-CLASS | `29.2%` |
| `READY` for all milestones | `NO` |

The 733,000 B budget was not changed. The 66,022 B headroom is real headroom,
not a permission to weaken the gate.

## Why the old E11 rejection is no longer automatically decisive

The Sprint 62 rejections happened before the Sprint 69 login-common reduction:

```text
git merge-base --is-ancestor 35b0d7b aee9bd3
sprint62_before_sprint69
```

`35b0d7b` is `docs: record rejected sprint62 headroom attempt`; `aee9bd3` is
`perf(common): remove runtime zod from login path`. The Sprint 62 measurements
(733,086–733,738 B) were therefore taken in the old bundle regime. Sprint 69
moved the baseline into a materially different regime, and the current release
commit measures 666,978 B.

This does **not** prove that E11 will pass. It proves that E11 must be re-tested
against the unchanged ratchet instead of being dismissed from stale byte counts.

## Decision

Authorize one strict, timeboxed E11 spike on a dedicated branch:

1. Write the spec before code.
2. Add adversarial tests at the real persistence boundary and prove them red.
3. Make the smallest canonical-adapter change only after red proof.
4. Re-run typecheck, lint, tests, boundary audits, build, and the unchanged
   login budget.
5. Revert the spike if typecheck fails, behavior drifts, or login transfer
   exceeds 733,000 B.
6. Promote no readiness row from test success alone.

No production code was changed by this truth pass. No threshold, budget, weight,
assertion, or acceptance command was altered.
