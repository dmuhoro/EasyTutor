# Sprint 84 evidence — zero raw hex at the shipped-source boundary

## Real boundary

`C36`, `GT-19`, `E14-T1` and `E14-T2` all name
`node scripts/design/check-no-raw-hex.mjs` as acceptance, but that script did not
exist. `docs/design/DESIGN.md` rule 1 forbids a hardcoded hex in a screen. The
real boundary is every shipped UI source file (`app/`, `screens/`, `components/`,
`lib/`, `store/`, `src/`) plus `tailwind.config.js`, which generates shipped
class names. Raw hex is legal only in token declaration files.

The checker now scans 319 shipped source files and fails closed on any raw hex
outside `src/design/tokens.ts`, `src/design/legacyPalette.ts` and the Tailwind
token mirror. It also refuses an empty scan and a missing required token file.

## Red controls (pre-registered before any source change)

1. **Gate absent** — on byte-for-byte `v1.16.5`, `node scripts/design/check-no-raw-hex.mjs`
   exited 1 with `MODULE_NOT_FOUND`. Output: `/tmp/opencode/sprint84-hex-red-missing.txt`.
2. **Detector non-vacuous on the pre-migration tree** — after adding the checker,
   the same command was copied into a detached `v1.16.5` worktree and exited 1
   with `[NO RAW HEX] FAIL — 956 raw hex literal(s) in shipped source.`, beginning
   with `app/_layout.tsx:304: #f59e0b`. Output:
   `/tmp/opencode/sprint84-hex-red-existing.txt`.
3. **Injected violation in a real screen** — after migration, one comment
   containing `#123456` was appended to `screens/tabs/index.tsx`. The checker
   exited 1 with `screens/tabs/index.tsx:708: #123456`; the file was restored and
   its SHA-256 matched the pre-injection hash. Output:
   `/tmp/opencode/sprint84-hex-red-injected.txt`.

An initial codemod pass produced string literals instead of token expressions and
doubled JSX braces. It was fully reverted (`git checkout --` on all generated
source plus removal of the generated token file) before the corrected transform
ran. No broken source reached a gate or a commit.

## Green control

`node scripts/design/check-no-raw-hex.mjs` exits 0:
`[NO RAW HEX] PASS — 319 shipped source files scanned; raw hex appears only in
token declarations.` Output: `/tmp/opencode/sprint84-hex.txt`.

The 126 pre-existing literal colours are declared once in
`src/design/legacyPalette.ts` and mirrored under `theme.extend.colors.legacy` in
`tailwind.config.js`. All 51 distinct `legacy-*` class tokens used by source are
resolvable to a declared key. The exported bundle contains the token values and
generated CSS classes, not a leaked `LEGACY_COLORS` string literal. No threshold,
matcher, timeout, budget or test was changed.

## Full local gate (all green, unchanged budgets)

- `npm run typecheck` — 0 errors.
- `npm run lint` — 0 errors, 129 warnings (unchanged).
- `npm test` — 118 files / 622 tests passed (ratchet unchanged).
- `node scripts/architecture/validate_boundaries.js` — 0 violations.
- `npm run audit:governance` — PASS.
- `npm run check:imports` — 466 files scanned, all bare imports declared.
- `npm run check:ai-boundary` — PASS.
- `node scripts/design/check-no-raw-hex.mjs` — PASS, 319 files.
- `node scripts/qa/qa_runner.js` — all systems verified.
- `npm run readiness:check` — register valid (153 rows), READINESS.md current.
- `npm run guard:secrets` — 499 files scanned; `guard:dist` — 544 files scanned.
- `npm run lint:cycles` — 13 dependency warnings, 0 errors.
- `npm run audit:full` — exit 0.
- `npm run build` — `expo export --platform web` succeeded, PWA assets injected.
- `npm run perf:login-route` — 670,265 / 733,000 B PASS (unchanged budget).
- `npm run perf:budget` — gzip 439,004 / 450,000 B; raw 1,677,855 / 1,750,000 B;
  39 / 30 route chunks PASS.
- `npm run e2e:smoke` — 9/9; `npm run e2e:full` — 4/4; `npm run test:e2e:a11y` — 4/4.

## Pushed CI proof

- PR #61 head `7a737536f602436d68529d6ce70b576290590ccc`, run
  `45881056821`: `build`, `RLS matrix` and `Real stack` all `success` on
  attempt 2. `https://github.com/dmuhoro/EasyTutor/actions/runs/45881056821`
- Merge commit `27476da3809e9c5d2eb7e6b2b67779128be0349a`, main run
  `45882269703`: the same three jobs `success` on attempt 2.
  `https://github.com/dmuhoro/EasyTutor/actions/runs/45882269703`

Both runs first failed only in the `real-stack` job: the app stayed at
`Loading EasyTutor` and the exact `getByText('Flagship learning')` visibility
assertion timed out. No axe rule, assertion, matcher or timeout was changed and
no test was skipped. The Playwright error context from each failure contained
only the boot skeleton, matching the previously recorded intermittent harness
boot stall. A rerun of the *identical* pushed SHA passed all jobs; no source
commit was made between the failed and passing attempts. This retry is recorded
rather than hidden.

## Promotion scope

`C36`, `GT-19`, `E14-T1` and `E14-T2` are promoted to `VERIFIED-IN-CI` only on
the exact PR head above, in a separate docs change. Generated WORLD-CLASS rises
31.7 → 37.3 % (`37.40 → 44.00 / 118`); all milestones remain `READY=NO`.
No `DEC-0X.md` file was created or edited.
