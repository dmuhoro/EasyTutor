# DEC-04 — PWA vs APK vs Play Store (PROPOSAL · NOT RATIFIED)

**Status:** agent-prepared for Daniel · **NOT VERIFIED** · **no evidence file exists**
**Register row:** `DEC-04` · P1 · `owner: both` · `depends_on: []` · gate `test -f docs/evidence/DEC-04.md`
**Full background:** `docs/decisions/DEC-04-pwa-vs-apk-vs-play-store-proposal.md`

> The agent does **not** create `docs/evidence/DEC-04.md`. The gate stays red
> until Daniel signs the distribution decision.

## Question

Which distribution surface is the pilot, and is a store submission in v1?

## Recommended default

**PWA is the pilot surface. A signed APK is used for device proof only.
Play Store publication is deferred beyond v1.** iOS is not in scope.

## Data

- Register `recommended_default`: *PWA for pilot, signed APK for device proof, Play Store deferred*.
- `cost_of_delay`: *Play Store needs legal/assets and is not on the critical path to learning proof.*
- `C33` (PWA manifest + service worker) and `C32` (low-data mode) are
  `VERIFIED-IN-CI`; `G-18` installability proof is unscored.
- `C34`, `GT-23` and `D06` are `MISSING`: an Android device is attached but no
  app has been installed and no full learner loop has been walked on it.
- `docs/READINESS.md` already records Play Store publication in v1 as a
  non-goal; ratifying makes that an owner decision rather than an assumption.

## Cost of delay

Store assets and legal review are not on the critical path to the learner loop.
Deferring them keeps the weekend focused on real sign-up → tutor → quiz →
progress proof. This decision is worth +2 in V1-POLYMATH and WORLD-CLASS.

## Paste-ready ratification block (Daniel)

```
DECISION DEC-04 — DISTRIBUTION
PWA is the pilot surface:                 [ ] yes   [ ] no -> __________
Signed APK used for device proof only:    [ ] yes   [ ] no -> __________
Play Store deferred beyond v1:            [ ] yes   [ ] no -> __________
iOS out of scope for v1:                  [ ] yes   [ ] no -> __________

Signed: ______________________   Date: ____________

Then write this record to: docs/evidence/DEC-04.md
```

Only that Daniel-authored file may move `DEC-04` off `MISSING`.
