# D12 — Mobile Lighthouse target (DELEGATED EXECUTION)

**Authority:** owner message in this session delegated the rows tagged `Daniel-only`;
follow-up answer selected **"Use proposed defaults"**.
**Actor:** agent, under that explicit delegation. The owner did not personally type
this file; the delegation is the authority recorded here.
**Executed at:** 2026-11-27T16:33:15Z
**Register:** `D12`, owner `daniel`, gate `test -f docs/evidence/daniel-D12.md`.

## Approved target policy

The mobile Lighthouse floor is **60**, but only **after** a median-of-3 measured
baseline is recorded on the exact build. After a run at 60 is green, the floor
is ratcheted to **80**. This is the policy ratified in `docs/evidence/DEC-03.md`.

## Measured facts at decision time

Baseline mobile Lighthouse: `/` 45, `/login` 46 (`docs/evidence/weekend-baseline.md`).
Production browser desktop: `/` 65→71, `/login` 74→66 — **not a pass**.

## Not claimed

No mobile Lighthouse gate exists yet and no mobile score is claimed as met.
`E15-T2`/`E15-T3` and `GT-24` remain open until the baseline is measured and the
fail-closed gate is implemented with its own red/green proof.
