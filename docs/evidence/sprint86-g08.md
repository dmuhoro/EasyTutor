# Sprint 86 — G-08 exhaustive boundary scope

**Spec:** `sprints/sprint_86_g08_exhaustive_boundaries.md`
**Status:** LOCAL GREEN · **no row promoted** · promotion requires exact pushed green CI.

## Premise verified before edit

`scripts/architecture/validate_boundaries.js` discovered files only in `app/`,
`components/` and `store/`. `scripts/qa/check-ai-boundary.mjs` used a fixed list
that omitted shipped roots such as `data/`, `hooks/`, `constants/`, `types/` and
`public/`. A new top-level source directory could be added without either gate
seeing it. Editing one regex inside either script would not close that hole.

## Shared root classifier

`scripts/architecture/sourceRoots.js` now classifies every top-level directory:

- **Scanned source roots:** `app`, `components`, `constants`, `data`, `hooks`,
  `lib`, `public`, `screens`, `services`, `src`, `store`, `types`.
- **Explicitly excluded with recorded reasons:** generated/tool roots
  (`.expo`, `.git`, `.github`, `.husky`, `.tmp-analytics-scripts`, `.vercel`,
  `.vscode`, `node_modules`, `dist`, `coverage`, `audits`, `playwright-report`,
  `test-results`), documentation and specs (`docs`, `sprints`), archived and
  native/binary trees (`archive`, `android`, `assets`), intentional violation
  fixtures (`tests`), gate implementations with rule literals (`scripts`),
  owner reference notes (`Anthropic`, `ai-context`) and server-side Deno
  functions with their own handler tests (`supabase`).
- Any other top-level directory makes both gates throw
  `[BOUNDARY ROOT] Unclassified top-level directory` before scanning.
- `BOUNDARY_SCAN_ROOT` is a test-only override so fixtures can be run without
  writing violations into the live tree. It does not skip classification.

## Rule scope

- AI boundary scans all scanned source roots; `lib/ai/providers.ts` remains the
  single allowlisted stub definition, as before.
- Architecture direct-Supabase-import rule applies to `app`, `components`,
  `screens` and `hooks`.
- Architecture raw-client-usage rule applies to render roots `app`,
  `components`, `screens`, preserving the existing auth-subscription exception.
- The two store graph rules remain store-only. Legacy direct-client usage in
  `hooks/`, `lib/` and `services/` is **not** claimed as fixed by this unit;
  those roots are classified and scanned for the AI boundary, while the raw
  Supabase usage rule is deliberately scoped to render-layer files.

## Pre-registered red control

A temporary `data/__g08_red_control__.ts` containing both
`getSupabaseClient()` and `callAnthropic()` was added to a root neither gate
previously scanned. On the unmodified gates both commands exited **0**:

```text
ARCH_EXIT=0
AI_EXIT=0
```

Logs: `docs/evidence/G-08-architecture-red.txt`, `docs/evidence/G-08-ai-red.txt`.

After the fix, the same temporary file is rejected by the AI gate and an
equivalent render-root probe (`screens/__g08_red_control__.tsx`) is rejected by
the architecture gate:

```text
[AI BOUNDARY] FAIL — disabled direct rail called in production code:
  data/__g08_red_control__.ts
[VIOLATION] .../screens/__g08_red_control__.tsx:3: Raw Supabase client bypass detected.
ARCH_EXIT=1
AI_EXIT=1
```

Logs: `docs/evidence/G-08-architecture-green.txt`,
`docs/evidence/G-08-ai-green.txt`. Both temporary files were removed before
the full gate.

## Fixture controls

`tests/fixtures/boundary/` holds intentional violations, a clean tree and an
unclassified-root probe. `tests/architecture/boundary-roots.test.ts` asserts:

| Fixture | Architecture | AI boundary |
|---|---:|---:|
| real tree | 0 | 0 |
| clean fixture | 0 | 0 |
| architecture violation in `screens/` | 1 | n/a |
| direct AI rail in `data/` | n/a | 1 |
| unclassified `newtop/` | 1 | 1 |

Targeted result: `1 file / 6 tests` passed (`docs/evidence/G-08-targeted.txt`).
The first full gate correctly rejected the fixtures for undefined TypeScript
names and rejected a caught error without a `cause`; those were fixed in the
fixtures and classifier without weakening a matcher, threshold or test.

## Suite ratchet

One test file with six tests was added. `AGENTS.md`, `README.md` and the CI
suite-count grep now require **119 files / 628 tests**. No threshold, budget,
matcher, timeout or existing test was weakened.

## Full local gate

All 21 checks exited 0 under Node 22.13 + `CI=true`:

```text
typecheck=0       lint=0           tests=0          i18n=0
no_hex=0          readiness=0      imports=0        ai_boundary=0
boundaries=0      governance=0     cycles=0         secrets=0
qa=0              audit=0          build=0          bundle_guard=0
budget=0          login=0          smoke=0          e2e_full=0
a11y=0
```

`npm test`: 119 files / 628 tests. Entry gzip **449,926 / 450,000 B** (unchanged
budget, PASS); login budget PASS; smoke 9/9; real-stack e2e 4/4; authenticated
axe 4/4. Audit: `audits/full-audit-2026-11-27_18-50-26.txt`.

## Promotion condition

`G-08` is still `NOT DONE` in `docs/COMPLETION_TRACKER.md`. Promotion happens
only in a separate docs change after the exact pushed green CI run on this code
head, citing its SHA and run URL. No `DEC-0N.md` or `daniel-D0N.md` file was
created or edited.
