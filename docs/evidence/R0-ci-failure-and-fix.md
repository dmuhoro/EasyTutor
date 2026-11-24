# R0 — CI failure and clean-clone fix

Branch `feat/readiness-register`, PR #19. No threshold, weight, budget or assertion changed.

## Observed failure

`gh run view 45402789736 --log-failed` on head `24aff63`:

```
build  Readiness register (schema, cycles, evidence, generated file)
  REGISTER INVALID
    - row C34: evidence path does not exist: android/
    - row GT-23: evidence path does not exist: android/
  ##[error]Process completed with exit code 1.
```

The same command had exited 0 locally. Cause: `android/` is gitignored
(`.gitignore:41:/android`) and generated locally; a clean CI checkout has no such directory.
`score.mjs` used `fs.existsSync` and therefore certified evidence that a clone never receives —
exactly the false-confidence failure mode Constitution Article I forbids.

## Red proof (regression test before the fix)

Added `it('rejects evidence that exists locally but is not tracked in git')`, which feeds
`file:android/` to the real CLI. Against the old validator:

```
RED_EXIT=1
FAIL ... rejects evidence that exists locally but is not tracked in git
AssertionError: expected +0 to be 1
Tests  1 failed | 6 passed (7)
```

The gate accepted the untracked path. After the fix: 9/9 pass.

## Fix

- `trackedFiles()` enumerates `git ls-files -z` from the working root and fails closed if git
  cannot enumerate. Evidence `file:`/`test:` paths are checked against that set; a trailing-slash
  directory is valid only if a tracked file sits beneath it. Local and clean-clone results are
  now identical by construction.
- `VERIFIED-*` rows must have an acceptance command that names no untracked `scripts/` or
  `tests/` path. MISSING/PARTIAL rows may still name future commands (e.g. E14's gate).
- C34 and GT-23 now cite `file:docs/evidence/ground-truth-2026-11-24.md` (tracked; GT row 34
  documents the unverified native build).
- C46 (P0, critical path, `VERIFIED-LOCAL`) previously accepted
  `bash scripts/db/reset-from-zero.sh`, which does not exist. It now accepts the real
  `bash scripts/security/proof_migration_chain.sh`, the from-zero migration proof the audit ran.

## Green proof (local)

| Command | Result |
|---|---|
| `npx vitest run -c vitest.config.js tests/readiness/score.test.mjs` | 9/9 pass |
| `npm run readiness:score` | exit 0; 153 rows; scores unchanged |
| `npm run readiness:check` | exit 0; generated file current |

CI result on the corrected head is recorded in `docs/evidence/execution-progress.md` once
`gh pr checks 19` reports it. No row is marked `VERIFIED-IN-CI` before that.
