# DEC-03 — Performance targets (DELEGATED RATIFICATION)

**Authority:** owner message in this session delegated the rows tagged `Daniel-only`;
follow-up answer selected **"Use proposed defaults"**.
**Actor:** agent, under that explicit delegation.
**Executed at:** 2026-11-27T16:33:15Z
**Register:** `DEC-03`, owner `both`, gate `test -f docs/evidence/DEC-03.md`.

## Decision recorded

1. **Every existing budget stays unchanged** — entry gzip 450,000 B, entry raw
   1,750,000 B, login-route transfer 733,000 B, per-test timeout 5,000 ms.
2. **Measure a median-of-3 mobile Lighthouse baseline first.**
3. **Set a mobile floor of 60 only after that measured baseline**, then ratchet
   to **80** once a run at 60 is green.

No mobile number is asserted as met by this decision. A floor set without a
measured baseline would be a cosmetic gate and is explicitly refused.

## Basis

`docs/decisions/proposals/DEC-03.md`; measured values recorded in
`docs/evidence/weekend-baseline.md` and `docs/evidence/E3-T3-headroom.txt`.
Production browser Lighthouse remains **below 80** and is not claimed as a pass;
mobile was `/` 45 and `/login` 46 at baseline.

## Not claimed

No budget was raised or lowered, no Lighthouse gate was added, and `E15-T2`/`E15-T3`
remain open until the baseline is measured and a gate is implemented in a separate
code unit with its own proof.
