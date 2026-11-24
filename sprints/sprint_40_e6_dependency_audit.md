# Sprint 40 — E6 slice: production dependency audit gate

## Context

GT-12 / F7. Branch `fix/e6-dependency-audit` from `origin/main` @ `859b9dc`. Two PRs are already
open (#19 R0, #20 E1), so no PR was opened for this branch. The initial production audit had
**34 advisories including one critical** (`shell-quote` GHSA-w7jw-789q-3m8p, command injection via
unescaped newlines).

## Spec / boundary

- Real boundary: `package.json` / `package-lock.json` and the fail-closed CI step immediately
  after `npm ci` in `.github/workflows/ci.yml`.
- No audit level, budget, threshold, timeout or assertion was weakened. No test skipped, renamed
  or deleted. No semver-major downgrade was accepted (the suggested `expo@52.0.49` /
  `expo-router@58.0.32` fixes were rejected as breaking).
- `npm audit fix --omit=dev` pruned dev packages from the working `node_modules`; `npm ci` restored
  the full tree from the updated lockfile **before** any gate was run.

## Work done

1. `npm audit fix --omit=dev` — semver-compatible lockfile updates: 34 → 12 advisories,
   critical 1 → 0.
2. `dependencies.zod` 4.3.6 → 4.6.7 (non-major fix available): 12 → 11 advisories, 0 critical.
3. Added `npm audit --omit=dev --audit-level=critical` after `npm ci` in CI.

## Gates

`npm ci` 0 · typecheck 0 · lint 0 · tests 92 files / 515 tests · build 0 · critical audit gate 0.

## Evidence

- `docs/evidence/E6-dependency-audit.md`
- `/tmp/work/audit-prod.json` (red: 34, 1 critical), `audit-after.json`, `audit-after-zod.json`
  (green: 11, 0 critical), `e6-tc3.log`, `e6-lint3.log`, `e6-test3.log`, `e6-build.log`

## Honest handover

DONE: critical production advisories are eliminated and fail-closed in CI; 23 of 34 advisories
removed. **11 remain** (5 high, 6 moderate) — 5 need semver-major Expo/router changes and 6 have
no published fix; these are documented, not hidden. The governance, audit-log and cost portions
of E6 are not in this slice. `VERIFIED-IN-CI` withheld (no PR slot). Daniel-only: none.
