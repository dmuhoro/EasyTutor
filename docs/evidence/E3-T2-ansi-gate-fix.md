# E3-T2 — flake-proof gate false negative under CI colour

**Spec:** `sprints/sprint_86_e3_flake_headroom.md`
**Status:** LOCAL GREEN · no row promoted · promotion requires a green dispatched
`flake-proof` run on the exact pushed SHA.

## Defect observed

Dispatched `flake-proof` run `46066254104` on `main` SHA `79e6c12` failed at
run 01 with `[FLAKE PROOF] FAIL: no passing Test Files summary on run 01`.
The same log shows the suite itself passed: `Test Files 119 passed (119)`,
`Tests 630 passed (630)` in 14.97 s.

The GitHub Actions runner forces colour even though `npm test` output is
redirected to a file. Vitest emits SGR escapes between the words of its
summary, so the raw log line is (escapes shown as `ESC`):

```text
ESC[2m Test Files ESC[22m ESC[1mESC[32m119 passedESC[39mESC[22m ESC[90m(119)ESC[39m
```

The existing pattern `Test Files +[0-9]+ passed` is byte-identical and correct
for visible text, but cannot match raw bytes containing escapes between
`Files` and the count. The gate failed closed — it did not report a false pass —
but rejected a genuine green run, so it could never prove `E3-T2` in CI.

A local probe with `FORCE_COLOR=1`, `FORCE_COLOR=1 NO_COLOR=1` and
`FORCE_COLOR=0` produced 0 ANSI lines in all three cases; the defect is
specific to the CI environment and is not reproducible locally by those flags.

## Fix

`scripts/qa/flake-proof.sh` writes a per-run scratch copy with terminal SGR
escapes removed by `sed -E $'s/\x1B\[[0-9;]*[[:alpha:]]//g'`, then applies the
**unchanged** patterns to that visible-text copy:

- `Test Files +[0-9]+ passed` — required for acceptance.
- `Test Files +[0-9]+ failed` — still causes rejection if present.

No matcher string, exit condition, run count, default, timeout, test threshold,
budget or suite ratchet was changed. Only terminal rendering is normalised; the
complete visible summary is still inspected on every run. The scratch copy is
removed after each accepted run.

## Red and green controls on the fixed gate

Controls use a `PATH` shim for `npm test` that exits **0** and emits a fixed
vitest-style summary containing the same SGR escapes seen in CI. This proves
the output guards independently of npm's exit status. Raw control output:
`docs/evidence/E3-T2-ansi-controls.txt`.

| Control | Expected | Observed |
|---|---|---|
| coloured passing summary | accepted | `[FLAKE PROOF] PASS: 1 consecutive in-suite runs` (exit 0) |
| coloured output with no summary | rejected | `[FLAKE PROOF] FAIL: no passing Test Files summary` (exit 1) |
| coloured failing-only summary | rejected | `[FLAKE PROOF] FAIL: no passing Test Files summary` (exit 1) |
| coloured pass **plus** fail summary | rejected | `[FLAKE PROOF] FAIL: failing Test Files summary` (exit 1) |

The earlier red controls in `docs/evidence/E3-T2-red.txt` and
`docs/evidence/E3-T2-gate-controls.txt` still apply to the `npm test` non-zero
path, which this change does not touch.

## Not claimed

No readiness row is promoted here. A green dispatched run on the exact pushed
SHA is still required before `E3-T2` can move to `VERIFIED-IN-CI`.
