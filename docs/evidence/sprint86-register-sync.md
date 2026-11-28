# Sprint 86 — register sync on two authoritative green runs

**Spec:** `sprints/sprint_86_pilot_ready.md` §6 promotion rule.
**Status:** PROMOTIONS APPLIED · NO RELEASE TAG · PILOT STILL `READY=NO`.

## Authoritative runs — exact SHA pinned

| Proof | Run | Head SHA | Result |
|---|---|---|---|
| Full `main` CI (`build`, `RLS matrix`, `Real stack`) | [`46129002216`](https://github.com/dmuhoro/EasyTutor/actions/runs/46129002216) | `5d643f0acf30aba6a001b640c540b8fa9cefbf24` | success / success / success |
| Dispatched `flake-proof` (20 consecutive in-suite runs) | [`46129273576`](https://github.com/dmuhoro/EasyTutor/actions/runs/46129273576) | `5d643f0acf30aba6a001b640c540b8fa9cefbf24` | success |

The `flake-proof` run was dispatched with `--ref main` and its `headSha` was
read back and compared byte-for-byte with `origin/main` before the run was
accepted. `gh workflow run flake-proof.yml --ref 5d643f0...` was not used: that
ref form previously returned HTTP 422 for this workflow.

## Rows promoted

`DEC-01`, `DEC-02`, `DEC-03`, `DEC-04`, `DEC-05`, `D04`, `D09`, `E3-T2`, `E3-T3`
moved from `MISSING` to `VERIFIED-IN-CI`. The promotion script refused to run
without both run URLs, refused any row not `MISSING`, and asserted that all
immutable row fields (priority, milestones, critical path, dependencies,
acceptance, owner, epic, wave, `f_items`) were byte-identical before and after.

- The five `DEC` rows use the agent-authored evidence files created under the
  owner's explicit delegated authority (D11 excluded), plus green PR-head run
  `46064503211` and the green main run above.
- `D04` / `D09` use `docs/evidence/daniel-D04.md` and `docs/evidence/daniel-D09.md`
  with the same two runs; the staging project and Vercel plan facts were read
  with the authenticated CLI fallback, not a new scope grant.
- `E3-T2` uses the 20-run in-suite gate, the red controls in
  `docs/evidence/E3-T2-red.txt`, `docs/evidence/E3-T2-gate-controls.txt` and
  `docs/evidence/E3-T2-ansi-controls.txt`, the CI-colour fix in
  `docs/evidence/E3-T2-ansi-gate-fix.md`, green PR-head run `46065605891`,
  the dispatched proof above and the green main run above.
- `E3-T3` uses the unchanged 733,000 B login ratchet and the measured
  `675,543 B` result; neither budget nor threshold was lowered.

No test, timeout, matcher, retry count, budget, suite ratchet or row acceptance
command was changed by this promotion.

## Generated scores after promotion

```
PILOT          76.6%  arithmetic 184.60/241  openP0=5  criticalNotCI=6  READY=NO
V1-ACADEMIC    68.1%  arithmetic 75.60/111  openP0=3  criticalNotCI=4  READY=NO
V1-POLYMATH    69.2%  arithmetic 72.00/104  openP0=3  criticalNotCI=4  READY=NO
WORLD-CLASS    57.8%  arithmetic 68.20/118  openP0=4  criticalNotCI=4  READY=NO
```

## What is still blocking PILOT READY

Six critical-path rows are still not `VERIFIED-IN-CI`: `C45`, `C46`, `D02`,
`D03`, `D05`, `D10`. Of those, `C45`, `D03`, `D05` and `D10` require owner-side
staging, credentials, a live hosted AI call and auth redirect configuration.
`C46` and `D02` are `VERIFIED-LOCAL` only; no CI run was repointed to claim
more than was proved. `E15-T1` and `E16-T1` remain open P0 rows.

PILOT therefore does **not** meet the Sprint 86 §1.1 target (score >= 80%,
`openP0=0`, `criticalNotCI=0`, every critical row `VERIFIED-IN-CI`). No final
tag is requested or written here; `v1.17.0` remains gated on the owner's exact
`TAG v1.17.0` instruction and the remaining critical proofs.

## Related observation

The repeated `Flagship learning` boot stall on earlier `main` runs was
investigated separately; see `docs/evidence/sprint86-e2e-boot-stall.md`. It remains
an intermittent real-stack boot stall of unknown root cause. On the third
occurrence the product's response was bounded by Sprint 87
(`docs/evidence/S87-boot-deadline.md`, PR-head run `46131210907`, `main` run
`46131613105` on `e14bac0`); no readiness row was promoted by that fix.
