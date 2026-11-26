# Sprint 79 — Decision packets for Daniel (DEC-02 / DEC-03 / DEC-04)

## Spec and real boundary

`DEC-02`, `DEC-03` and `DEC-04` are `MISSING` rows owned by `both` in
`docs/readiness/register.json`. Each has a single acceptance gate:

- `DEC-02` → `test -f docs/evidence/DEC-02.md`
- `DEC-03` → `test -f docs/evidence/DEC-03.md`
- `DEC-04` → `test -f docs/evidence/DEC-04.md`

Those files are **Daniel's written ratification record**, not agent artifacts.
The existing proposals at `docs/decisions/DEC-02-curriculum-priority-proposal.md`
and `docs/decisions/DEC-03-performance-targets-proposal.md` state this explicitly.
Creating any `docs/evidence/DEC-0X.md` file in this sprint would satisfy a
file-existence check without a decision having been made — a false gate under
Constitution Article I. The gates must stay red.

`DEC-04` (PWA vs APK vs Play Store) has no proposal yet; the register records
the canonical default as *PWA for pilot, signed APK for device proof, Play Store
deferred*.

## Goal

Give Daniel one short, signable packet covering the three decisions that are
currently unblocked and jointly worth **+7 points in each of V1-POLYMATH and
WORLD-CLASS**, without pretending any decision has been made.

## Change surface

1. Add `docs/decisions/DEC-04-pwa-vs-apk-vs-play-store-proposal.md`, marked
   PROPOSAL / NOT RATIFIED, mirroring the DEC-02 and DEC-03 proposal structure.
2. Add `docs/decisions/ratification-packet-2026-11-26.md`: one page naming the
   three defaults, the proposal links, and the exact evidence file Daniel must
   write for each. Include an explicit "do not create these files before
   ratifying" notice.
3. Correct the stale measured login-route figure in the DEC-03 proposal to the
   current green gate value (`666,978 / 733,000 B`, run `45782671212`); no
   threshold changes.
4. Add `docs/evidence/sprint79-decision-packets.md`, update `STATUS.md` and
   `CHANGELOG.md`.

## Non-goals (hard)

- No `docs/evidence/DEC-02.md`, `DEC-03.md` or `DEC-04.md` may be created.
- No readiness row may be promoted; no `docs/readiness/register.json` edit.
- No product code, test, assertion, timeout, matcher, budget or threshold change.
- `DEC-01` and `DEC-05` stay out of scope (blocked on `D16` and `D07`).
- Daniel-only rows `D03`, `D05`, `D10`, `C45` stay open.

## Verification

- `test ! -f docs/evidence/DEC-02.md && test ! -f docs/evidence/DEC-03.md && test ! -f docs/evidence/DEC-04.md` stays true.
- `npm run readiness:check` reports unchanged scores: PILOT 64.1 %,
  V1-ACADEMIC 53.7 %, V1-POLYMATH 44.0 %, WORLD-CLASS 29.2 %, all `READY=NO`.
- Full local gate green: typecheck, lint, tests (115 files / 614 tests),
  boundaries, governance, imports, AI boundary, build, login budget, QA,
  readiness, secret guards, audit, cycles, dist guard, entry budget, smoke.
- Pushed CI green on the exact branch head; merge to `main` with the run URL
  recorded in the evidence.

## Promotion rule

Nothing is promoted in this sprint. After Daniel writes a real ratification
file, the corresponding row may move to `VERIFIED-IN-CI` only on an exact
pushed green CI run that observes the new file, with the run URL in evidence.
