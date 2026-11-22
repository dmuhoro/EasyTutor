# Sprint 30 — Close the false gates (G-03 / G-04 / G-05)

Branch: `feat/truthful-gates` (planned, stacks after Sprint 29).
Date: 2026-11-22. Spec before code.

## Directive

Four gates were observed passing while the real path was broken (audit
`docs/evidence/2026-11-22-codebase-audit.md`). Close the three agent-owned ones:

- **G-03** `tests/locales/keys.test.ts:20,57` walks the import graph from `app/` only. Keys in
  unwired `screens/setup/index.tsx` (`subjects.math`, `subjects.physics`, `subjects.chemistry`,
  `subjects.biology`, `subjects.computer_science`, `subjects.history`, `back`) are in **no** pack
  and the gate still passes.
- **G-04** `scripts/full-audit.sh:8-47` has no `set -e`, swallows all output and always exits 0;
  `madge` is used at `:27,30` but is not declared in `package.json`.
- **G-05** `scripts/security/check_secret_exposure.mjs:21-34` and
  `check_public_env_allowlist.mjs:15-27` skip `screens/`, `tests/`, `scripts/`, `supabase/`,
  `public/`, and the CI never passes `--include-dist`. The secret rules (`:40-45`) lack common
  provider key patterns.

## Acceptance criteria

1. Locale gate covers **all** `screens/**` keys in addition to the `app/` graph and fails on any
   key absent from a pack. The seven currently-missing keys are added with real translations to
   all three packs (no raw-key fallback). A negative test proves the widened gate fails when a
   key is removed.
2. `audit:full` exits non-zero when any verification step fails, still writes its report, and
   uses only declared tools. Informational commands (`npm outdated`, `npm audit`) must not be
   silently treated as verification failures; their classification is explicit and documented.
3. Secret/public-env guards scan every source directory including `screens/`, `tests/`,
   `scripts/`, `supabase/`, and the exported `dist/` bundle in CI. Rules cover Groq/Google/OpenAI-
   style tokens in addition to the current four. A negative fixture proves each new rule fires
   without printing the value; no fixture contains a live credential.
4. Negative proofs recorded in `docs/evidence/`. Full gates green. No timeout/assertion weakened.

## Out of scope

G-06 quiz flake, G-07 mock-client swap, G-08 regex boundary gates (tracker S1 tail), Layer C/D.
