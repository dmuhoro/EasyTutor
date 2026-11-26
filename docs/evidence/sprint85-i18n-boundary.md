# Sprint 85 — i18n boundary evidence

## Premise and real boundary

The old locale gates only checked that `t('…')` keys exist in en/sw/fr. They
could stay green while a routed screen rendered hard-coded English copy.
`docs/ROADMAP-TO-FINAL.md` E13 requires every routed screen to use `t()` and an
extended gate that fails on user-visible literals. The real boundary is the TSX
source of the shipped screens: 82 `.tsx` files under `app/` and `screens/`.

## Pre-registered red controls

| Control | Command | Observed result |
|---|---|---|
| Script absent on byte-for-byte `v1.16.6` | `npm run check:i18n` | `npm error Missing script: "check:i18n"`, exit 1 (`/tmp/opencode/sprint85-i18n-red-missing-script.txt`) |
| Scanner on byte-for-byte `v1.16.6` source | `node scripts/i18n/check-no-user-literals.mjs` | `[I18N] FAIL — 457 user-visible literal(s) in shipped screens.`, exit 1 (`/tmp/opencode/sprint85-i18n-red-existing.txt`) |
| Nested JSX/object-option pass after the first migration | same scanner, tightened renderer rule | 124 additional real literals found in conditions, `toast.show({ title, message })`, tab options and label maps; all migrated (`/tmp/opencode/sprint85-i18n-after-codemod-5.txt`) |
| Injected literal in a real screen after migration | inject `Injected i18n literal` into `screens/tabs/index.tsx`; scanner + `tests/locales.coverage.test.ts` | `screens/tabs/index.tsx:277:17 jsx-text "Injected i18n literal"`; scanner exit 1, targeted test `1 failed / 2 passed`; source SHA restored byte-for-byte (`73f65a…f50bb`) (`/tmp/opencode/sprint85-i18n-red-injected.txt`, `/tmp/opencode/sprint85-i18n-red-injected-test.txt`) |
| CI entry budget on first pushed code head | `npm run perf:budget` on `9886a96…` under CI Node 22.13 | `[PERF BUDGET] FAIL: gzip 450028 B > 450000 B`, exit 1, run `45889280274` (`/tmp/opencode/sprint85-budget-ci-repro.txt` reproduces 450,293 B locally with Node 22.13) |

No assertion, timeout, matcher, budget or test was weakened to obtain a pass.
The injected control used a file backup rather than `git checkout` so the
migrated content—not the old HEAD content—was restored.

## Implementation at the boundary

- `scripts/i18n/check-no-user-literals.mjs` walks all shipped `.tsx` screens and
  rejects JSX text, rendered JSX-expression strings, visible object options,
  visible string props and visible-message call arguments. `t()` calls and
  explicitly non-visible props/data comparisons are excluded; unclassified
  cases fail closed with `file:line:column`, kind and literal.
- `npm run check:i18n` wires the checker into CI immediately after the raw-hex
  boundary gate.
- `tests/locales.coverage.test.ts` asserts the scanner's zero-violation result
  inside its existing tests, so the 118 files / 622 tests ratchet is unchanged.
- 584 literal call sites in 37 files were migrated to `t()`. Keys were first
  hashed for auditability, then compacted to `sN` aliases after the first
  export exceeded the unchanged 450,000 B entry budget by 6,295 B gzip.
- The pushed CI run then failed the same unchanged budget by 28 B (Node 22.13).
  The final tree aliases the 461 `sN` keys to short pure-letter keys in a
  single frozen-snapshot pass and orders every pack by English literal so
  similar copy clusters inside gzip's window. No rendered value, budget,
  threshold, matcher or pack-coverage rule changed. A sequential in-place
  rewrite cascaded into its own output (582 corrupted call sites) and was
  discarded before any push; base36 keys measured worse (450,322 B) because
  integer-like properties reorder, so pure letters were used.
- All three packs now carry 659 keys with identical key sets; new non-English
  copy is present and non-empty but remains DRAFT pending Daniel's translation
  review, already tracked under `F6`. English is still the default locale.
- One-time, auditable codemods are retained at
  `scripts/i18n/migrate-user-literals.mjs`, `scripts/i18n/shorten-screen-keys.mjs`,
  `scripts/i18n/compact-screen-keys.mjs` and
  `scripts/i18n/compact-screen-keys-v2.mjs` (the deterministic final remap and
  pack ordering).

## Green control

`node scripts/i18n/check-no-user-literals.mjs` and `npm run check:i18n` both
report `[I18N] PASS — 82 shipped screen files scanned; 0 user-visible literals
outside t().` (`/tmp/opencode/sprint85-fixedgate-i18n.txt`).

## Full local gate at final tree

All commands exited 0 under Node 22.13 with `CI=true`; logs are
`/tmp/opencode/sprint85-fixedgate-*.txt`.

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / 129 warnings |
| `npm test` | 118 files / 622 tests passed |
| `npm run check:i18n` | 82 files, 0 violations |
| `node scripts/design/check-no-raw-hex.mjs` | 319 files, PASS |
| `npm run readiness:check` | 153 rows valid; generated file current |
| `npm run check:imports` / `npm run check:ai-boundary` | PASS |
| Architecture / governance / cycles | 0 violations / PASS / PASS |
| `npm run guard:secrets` / `npm run guard:dist` | PASS |
| `node scripts/qa/qa_runner.js` | `[QA] All systems verified. Ready for release.` |
| `npm run audit:full` | exit 0; `audits/full-audit-2026-11-26_23-39-36.txt` |
| `npm run build` | web export PASS |
| `npm run perf:budget` | Node 22.13 + `CI=true`: gzip 449,926 / 450,000 B; raw 1,700,100 / 1,750,000 B; 39 / 30 route chunks (`/tmp/opencode/sprint85-finalfix-budget.txt`) |
| `npm run perf:login-route` | 675,543 / 733,000 B PASS (`/tmp/opencode/sprint85-finalfix-login.txt`) |
| `npm run e2e:smoke` | 9 / 9 |
| `npm run e2e:full` | 4 / 4 |
| `npm run test:e2e:a11y` | 4 / 4 |

## Exact pushed CI proof and promotion

| Object | SHA | Run | Result |
|---|---|---|---|
| PR #63 code head | `1ce1ad742b3dda633b4c211112f1fb7e7ccd66a5` | `45893123264` | success on attempt 2; build, real-stack e2e, RLS matrix and Vercel all pass. Attempt 1 failed only the entry budget at 450,028 B; the fix was pushed as a second commit on the same PR, not by editing the budget. |
| `main` merge | `0c6efb6a92fbfa8aba2da1493a4bb7a1b33d2d91` | `45894081399` | success on attempt 2; attempt 1 failed only on a transient runner port conflict (`54324 already in use`) during Supabase startup. No code, assertion, timeout or matcher changed between attempts. |

`C30`, `GT-15`, `E13-T1` and `E13-T2` were promoted to `VERIFIED-IN-CI` in a
separate docs change that cites both run URLs. `npm run readiness:score`
regenerated `docs/READINESS.md`: WORLD-CLASS 37.3% (44.00/118) → 44.2%
(52.20/118), still `READY=NO`. The code commit contains no row promotion.

## Scope and handover

`C30`, `GT-15`, `E13-T1` and `E13-T2` were **not promoted in the code commit**;
they moved to `VERIFIED-IN-CI` only in the separate docs change after the exact
pushed green runs recorded above. No `docs/evidence/DEC-02.md`,
`DEC-03.md` or `DEC-04.md` file was created or edited; Daniel owns ratification.
Translation quality and mobile Lighthouse remain open; this sprint proves
source-boundary i18n coverage and pack completeness, not human review.
