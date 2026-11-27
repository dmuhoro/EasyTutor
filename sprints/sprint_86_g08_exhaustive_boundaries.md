# Sprint 86 — G-08 exhaustive boundary scope (spec addendum)

**Parent spec:** `sprints/sprint_86_pilot_ready.md` (WS3)
**Real boundaries:** `scripts/architecture/validate_boundaries.js` and
`scripts/qa/check-ai-boundary.mjs`
**Written before code.**

## Premise verified before edit

`validate_boundaries.js` discovers files only in `app/`, `components/` and
`store/`. `check-ai-boundary.mjs` uses a hard-coded list that omits shipped
source roots such as `data/`, `hooks/`, `constants/`, `types/` and `public/`.
A new top-level source directory is therefore silently unscanned by one or both
gates. A regex tweak inside either file would leave that blind spot intact.

## This unit

1. One shared root classifier at `scripts/architecture/sourceRoots.js`:
   - every top-level directory is either a scanned source root or an excluded
     root with a recorded reason;
   - an unclassified top-level directory fails both gates closed;
   - `BOUNDARY_SCAN_ROOT` lets a test run a gate against a fixture tree without
     writing violations into the live tree.
2. Both gates consume that classifier. The AI gate scans all scanned source
   roots. The architecture gate applies:
   - the direct-Supabase-import rule to render/hook roots;
   - the raw-client-usage rule to render roots (`app`, `components`, `screens`);
   - the store-specific graph rules to `store/` only.
   Rule applicability is explicit; every source root is still classified and a
   new root is refused before scanning.
3. Fixtures under `tests/fixtures/boundary/` prove:
   - a violation in a previously unscanned root is rejected by both gates;
   - an unclassified root is rejected by both gates;
   - a clean fixture tree and the real tree both pass.
4. Pre-registered red control: inject the same forbidden call in `data/`, a
   source root neither gate currently scans, capture both gates passing, then
   remove the file. After the fix the same file must make both gates fail.
5. Suite ratchet updated in the same change for the new test file. No matcher,
   threshold, timeout, budget or test is weakened.

## Non-goals

- No readiness row is promoted in this code change.
- No legacy direct-client usage in `hooks/`, `lib/` or `services/` is silently
  reclassified; those remain separate tracked gaps, not new claims.
- No `supabase/` edge-function code is pulled into the client AI boundary; it
  is explicitly excluded with a reason and covered by its own handler tests.
- No `docs/evidence/DEC-0N.md` or `daniel-D0N.md` file is created.

## Order

Spec → red control → classifier + gate edits → green control → fixtures →
full gate → code PR → exact pushed green CI → separate docs promotion PR.
