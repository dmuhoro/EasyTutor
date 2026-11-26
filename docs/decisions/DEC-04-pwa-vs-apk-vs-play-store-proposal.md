# DEC-04 — PWA vs APK vs Play Store (PROPOSAL, NOT RATIFIED)

**Status:** PROPOSED BY AGENT · AWAITING DANIEL'S WRITTEN RATIFICATION · **NOT VERIFIED**
**Register row:** `DEC-04` (P1, `owner: both`, `depends_on: []`)
**Canonical default:** *PWA for pilot, signed APK for device proof, Play Store deferred.*

> This file is deliberately **not** at `docs/evidence/DEC-04.md`. The register's
> gate is `test -f docs/evidence/DEC-04.md`; creating that file before ratification
> would be a false gate. It stays red until Daniel ratifies.

## What this proposal does and does not change

This decision selects the **pilot distribution surface**. It does not build,
sign or publish anything by itself.

| Surface | Proposed role | Current evidence | Effect of ratifying |
|---|---|---|---|
| Web / PWA | Primary pilot surface | `C33` PWA manifest + service worker `VERIFIED-IN-CI`; `C32` low-data mode `VERIFIED-IN-CI` | PWA remains the default path for the pilot cohort; no new gate is invented. |
| Signed Android APK | Device-proof surface only | `C34`, `GT-23` and `D06` are `MISSING`; an Android device is attached but no app is installed | The device walkthrough remains a Daniel-owned proof step, not a release channel. |
| Play Store | Deferred beyond v1 | No store assets or legal review in the repo | No listing, store assets or publication work is started. |

`docs/READINESS.md` already records "Play Store publication in v1" as a
non-goal; ratifying this default makes that position an owner decision rather
than an inherited assumption.

## Why defer the store

`cost_of_delay`: *"Play Store needs legal/assets and is not on the critical path
to learning proof."* The critical path is sign-up → subject → tutor → quiz →
progress on a real learner device. A signed APK installed directly satisfies
that proof without pulling legal review and store assets into the pilot.

## Explicitly not decided here

- No signing key, store account or publisher identity is chosen.
- No build profile, version bump or CI job is changed.
- No date is set for a future store submission.
- `DEC-01` (pilot size) and `DEC-05` (AI budget) remain separate decisions,
  blocked on `D16` and `D07`.

## Ratification record (Daniel to complete)

```
PWA is the pilot surface:        [ ] yes   [ ] no -> ____________________________
Signed APK used for device proof only: [ ] yes   [ ] no -> ____________________
Play Store deferred beyond v1:   [ ] yes   [ ] no -> ____________________________
Signed: ______________________  Date: ____________
```

Only a completed record plus `docs/evidence/DEC-04.md` may move the register row
off `MISSING`.
