# Sprint 84 — C36 / GT-19 / E14-T1 / E14-T2: zero raw hex at the shipped-source boundary

## Spec and real boundary

`C36` and `GT-19` are `PARTIAL`; `E14-T1` and `E14-T2` are `MISSING`. Their acceptance
command is `node scripts/design/check-no-raw-hex.mjs`, but that script does not exist.
`docs/design/DESIGN.md` rule 1 says no screen may hardcode a hex. The real boundary is therefore
every shipped source file that can render UI: `app/`, `screens/`, `components/`, `lib/`,
`store/` and `src/`, plus `tailwind.config.js` because it generates shipped class names.
Token declaration files are the only places where a raw hex is legitimate.

## Change surface

1. Add a fail-closed `scripts/design/check-no-raw-hex.mjs` that scans only shipped source and
   fails on any raw hex outside the explicit token declaration allowlist.
2. Declare the currently used colours once in a design token module and mirror them in
   `tailwind.config.js`; replace raw hex in every shipped source file with those tokens.
3. Wire the exact acceptance command into CI's `build` job. No threshold, matcher, timeout,
   budget or test is weakened.
4. No readiness row is promoted by this code unit; promotion follows exact pushed green CI in
   a separate docs change.

## Red controls (pre-registered)

- On byte-for-byte `v1.16.5`, run `node scripts/design/check-no-raw-hex.mjs`; it must fail with
  `MODULE_NOT_FOUND`, proving the gate is absent.
- After adding the checker but before migration, the same command must fail and report the
  existing raw literals rather than silently passing.
- After migration, inject one raw hex into a real screen, run the checker, require a non-zero
  exit and a named violation, then restore the exact source hash.

## Green control

The exact same command must pass after migration with the token allowlist unchanged. The full
local gate must stay green with unchanged bundle budgets and suite counts.

## Non-goals (hard)

- No readiness row is promoted by the code unit.
- No `DEC-0X.md` file is created or touched.
- No test threshold, matcher, timeout or budget is changed.
- No design rule is relaxed; raw hex remains illegal in screens after the change.
