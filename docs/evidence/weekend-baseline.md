# Weekend baseline — 2026-11-27 17:32 EAT

**Spec:** `sprints/sprint_86_pilot_ready.md`
**Status:** CAPTURED · no row promoted by this evidence
**Rule:** every number below comes from a command recorded in
`/tmp/opencode/work/`; the register wins where this file disagrees with a prompt.

## Clock and host

```
$ date '+%A %d %B %Y %H:%M:%S %Z (%z)'
Friday 27 November 2026 17:32:15 EAT (+0300)
```

```
$ free -h
               total        used        free      shared  buff/cache   available
Mem:           7.1Gi       5.7Gi       375Mi       525Mi       1.9Gi       1.5Gi
Swap:          7.6Gi       6.3Gi       1.3Gi
```

`available` was 1.5 Gi at baseline. Heavy commands are therefore serialised;
long proofs are offloaded to CI. No second heavy command was started while a
gate was running.

```
$ node -v
v22.22.1
$ npm -v
11.12.1
```

CI uses Node 22.13. Budget-sensitive measurements must be reproduced with
`CI=true` on Node 22.13; this host's default Node is not a substitute.

## Git state

```
$ git fetch --tags
(no output)

$ git status -sb
## main...origin/main

$ git rev-parse --short HEAD
74d002c

$ git rev-parse HEAD
74d002c589e9e07951cf55ba641aa643d41ecb32

$ git tag -l v1.16.7
v1.16.7

$ git rev-parse v1.16.7
22ffd0c69fb512da074a890213d905726a65b5fd
$ git rev-parse v1.16.7^{}
85bb4b7389babe8504ef462564f7bd4437d38616

$ git ls-remote --tags origin v1.16.7
22ffd0c69fb512da074a890213d905726a65b5fd        refs/tags/v1.16.7
```

The tree was clean and synced with `origin/main` before any edit.

## Last CI on main

```
$ gh run list --branch main --limit 5
completed  success  Merge pull request #65 from dmuhoro/docs/sprint85-release-note  CI  main  push  45897316455  2m54s  2026-11-26T21:19:21Z
completed  success  Merge pull request #64 from dmuhoro/docs/i18n-promotion         CI  main  push  45895802210  3m18s  2026-11-26T21:06:32Z
completed  success  Merge pull request #63 from dmuhoro/proof/i18n-boundary         CI  main  push  45894081399  3m11s  2026-11-26T20:55:07Z
completed  success  Merge pull request #62 from dmuhoro/docs/sprint84-ci-proof      CI  main  push  45884320409  3m30s  2026-11-26T19:35:34Z
completed  success  Merge pull request #61 from dmuhoro/proof/design-token-boundary CI  main  push  45882269703  2m57s  2026-11-26T19:19:57Z
```

Observed CI round: ~3 minutes. Budget ~6 minutes per push (local hook ~90 s
plus CI ~3 min).

## Readiness at baseline

Logs: `/tmp/opencode/work/readiness-check.txt`,
`/tmp/opencode/work/readiness-score.txt`, `/tmp/opencode/work/readiness-next.txt`.

```
$ npm run readiness:check
Readiness register valid (153 rows); READINESS.md is current.
PILOT          68.3%  arithmetic 164.60/241  openP0=8  criticalNotCI=6  READY=NO
V1-ACADEMIC    53.7%  arithmetic 59.60/111  openP0=6  criticalNotCI=4  READY=NO
V1-POLYMATH    53.8%  arithmetic 56.00/104  openP0=6  criticalNotCI=4  READY=NO
WORLD-CLASS    44.2%  arithmetic 52.20/118  openP0=7  criticalNotCI=4  READY=NO

$ npm run readiness:next
W1 P0 C45      MISSING                Staging environment
W1 P0 DEC-02   MISSING                Curriculum priority and reviewer
W1 P1 DEC-03   MISSING                Performance targets
W1 P1 DEC-04   MISSING                PWA vs APK vs Play Store
W1 P1 E3-T2    MISSING                Prove 20 in-suite runs with zero failures
W2 P0 D03      MISSING                Provision staging Supabase and apply migrations
W2 P0 D05      MISSING                Make one live hosted AI call and record the rail
W2 P0 D10      MISSING                Set production Auth URLs and Google OAuth callback
W2 P1 D04      MISSING                Provision staging Vercel project and protection
W2 P1 D06      MISSING                Install the APK and walk the full learner loop on a phone
W2 P1 D07      MISSING                Confirm Groq tier and token/day limit
W2 P1 D11      MISSING                Legal review of consent and deletion wording
```

`npm run readiness:score` wrote `docs/READINESS.md` from 153 rows and returned
the same four scores. Running the scorer does not promote any row.

## Already closed — must not be reopened or re-estimated

Sprints 81–85 moved to `VERIFIED-IN-CI`: canonical screen consumers (`C22`,
`E10-T2`), mastery unification (`GT-06`, `E11-T1`, `E11-T2`), authenticated axe
(`C31`, `GT-16`), zero raw hex (`C36`, `GT-19`, `E14-T1`, `E14-T2`) and the i18n
boundary (`C30`, `GT-15`, `E13-T1`, `E13-T2`). Earlier plans that list these as
open are stale and are not reused in Sprint 86.

## What this evidence does not claim

No staging, live AI, device, R1 session, decision ratification, row promotion
or release is proven here. This is the before-picture only.
