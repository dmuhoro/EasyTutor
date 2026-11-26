# Sprint 85 — i18n completion at the real screen boundary

## Premise (verified before code)

`docs/readiness/register.json` keeps `C30`, `GT-15`, `E13-T1` and `E13-T2`
open. `docs/ROADMAP-TO-FINAL.md` E13 defines the goal as "every routed screen
uses `t()`; en/sw/fr complete" and the scope as migrating the remaining screen
implementations plus extending the locale gate to fail on any screen with
user-visible literals.

The current `tests/locales/keys.test.ts` gate only walks a static import graph
and asserts that literal `t('…')` keys exist in all packs. It does **not** fail
when a shipped screen renders a hard-coded English string. A gate that passes
while `screens/tabs/progress.tsx` still says `Your Progress` would be a false
gate (Constitution Article I). The real boundary is the TSX source of every
shipped screen under `app/` and `screens/`.

## This unit

1. Add `scripts/i18n/check-no-user-literals.mjs`, a TypeScript-AST scanner that
   walks all `.tsx` files under `app/` and `screens/` and rejects user-visible
   literals at the source boundary:
   - JSX text nodes with letters;
   - string literals in JSX expression containers;
   - string arguments to the visible-message calls `Alert.alert`, `setError`,
     `setMessage`, `setNotice`, `toast` and `Toast.show`;
   - string prop values for visible props (`title`, `placeholder`, `label`,
     `accessibilityLabel`, `aria-label`, `message`, `description`, `hint`,
     `subtitle`, `headerTitle`, `alertTitle`, `buttonText`, `cancelText`,
     `confirmText`, `prompt`) and any unknown camel-case string prop whose
     value contains a space or capitalised word.
   Non-visible props (`className`, `testID`, `style`, route params, data keys,
   numeric/URL-only strings) and strings inside `t()` calls are excluded by an
   explicit, documented allowlist. Unknown cases fail closed: the scanner
   reports `file:line:column`, kind and literal so a reviewer can classify it.
2. Wire the checker into `npm run check:i18n` and the real-stack CI build job.
3. Extend `tests/locales.coverage.test.ts` with the scanner's zero-violation
   assertion **inside the existing tests**, so the 118 files / 622 tests
   ratchet is not weakened or changed.
4. Migrate every flagged shipped screen to `t()` and add each key to `en`,
   `sw` and `fr`. Dynamic strings use `{{placeholder}}` parameters. The packs
   stay complete and the runtime resolver stays unchanged.
5. Pre-registered red controls, executed before the fix:
   - the checker must reject byte-for-byte `v1.16.6` with a non-zero count;
   - after migration, an injected user-visible literal in a real screen must
     be rejected at its exact `file:line`, and the source hash must be
     restored afterwards.
6. Full gate green afterwards with unchanged budgets, thresholds, matchers,
   tests and timeouts.

## Non-goals

- No locale switcher is added; English remains the default locale.
- No claim of human-reviewed Swahili/French translation quality. New keys are
  present and non-empty in all three packs; copy review remains Daniel-owned
  under `F6` / the existing draft locale labels.
- No readiness row is promoted in the code commit. Promotion happens only in a
  separate docs commit after exact pushed green CI on the code head.
- No `docs/evidence/DEC-02.md`, `DEC-03.md` or `DEC-04.md` file is created or
  edited; those remain Daniel-owned.
- No bundle, route-count, suite-count, axe, queue or timeout threshold is
  changed to obtain a pass.

## Order

Spec → red control → checker + CI wiring → screen migration → green control →
full gate → code PR → exact pushed CI → docs promotion PR → exact pushed CI →
release/tag. One concern per commit; docs move with behaviour.

## Executed controls (recorded)

- Missing script on byte-for-byte `v1.16.6`: `npm error Missing script`.
- Scanner on `v1.16.6`: 457 user-visible literals, exit 1.
- Tightened renderer rule exposed 124 further real literals in conditions,
  `toast.show` options, tab options and label maps; all migrated.
- Injected literal in `screens/tabs/index.tsx:277`: scanner and targeted test
  failed; source SHA restored byte-for-byte.
- Green: 82 files scanned, 0 violations; full local gate green with all
  budgets and suite-count ratchets unchanged. Detailed evidence:
  `docs/evidence/sprint85-i18n-boundary.md`.

## Budget red control and fix (pre-registered before the final tree)

The first code commit's local export (Node 22.22) measured 448,822 B gzip, but
the exact pushed CI run on that SHA (`45889280274`, Node 22.13) failed the
**unchanged** 450,000 B entry budget at 450,028 B. A byte-for-byte local
reproduction with Node 22.13 measured 450,293 B, confirming the failure was
real and not a one-off runner artefact.

Pre-registered fix, without touching `perf-budget.json`:

1. Alias the 461 verbose `sN` pack keys to short, pure-letter keys (bijective
   base26, skipping legacy-key collisions). Pure letters matter: base36 keys
   introduce integer-like properties that JS reorders, and a measured base36
   variant was *worse* (450,322 B). A single-pass frozen-snapshot rewrite is
   required because a sequential in-place rewrite cascades into already
   written keys (observed: 582 corrupted call sites; discarded, never pushed).
2. Order the English pack by literal value so similar copy clusters inside
   gzip's window. Object key order does not affect `t()` lookup, and both
   existing pack tests compare **sorted** key sets.
3. Keep en/sw/fr key sets identical, all 118 files / 622 tests, all budgets and
   all screen-copy values unchanged.

Measurement is only accepted from a Node 22.13 export with `CI=true`, the
closest local reproduction of the failing job. The budget file is never edited.
