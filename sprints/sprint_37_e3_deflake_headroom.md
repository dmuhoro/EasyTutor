# Sprint 37 — E3 de-flake and budget headroom

## Context

Wave 1 epic 3. Ground truth GT-09 (1/20 in-suite timeout) and GT-10 (241 B login-route
headroom). Roadmap §E3. Two PRs were already open, so no third PR was created; the branch was
pushed for Daniel to open a PR when a slot frees.

## Spec / boundary

- No threshold raised: 5,000 ms test timeout, 733,000 B login budget and 450,000/1,750,000 B
  entry budgets are untouched.
- No matcher loosened, no test skipped or renamed. The router injection uses a seam already
  proven in a sibling test.
- No UI work, no features outside the epic.

## Work done

1. Confirmed the cold path: `PipelineExecutor`'s default router calls
   `resolveProviderSelection()` (Ollama probe + Supabase session) on first use.
2. Injected the deterministic router into the single flaky test, keeping all assertions.
3. Ran the exact acceptance: 20 consecutive full suites — 20/20 PASS, 92 files / 515 tests each.
4. Measured `npm run perf:login-route`: 732,759 / 733,000 B (241 B, 0.03 %). Did **not** attempt
   a 36 KB cut via an unproven auth-boot/chunk split and did not touch the budget.

## Evidence

- `docs/evidence/E3-defake-headroom.md`
- 20 logs `/tmp/work/e3-full-1.log` … `-20.log`, final line `ALL_20_PASS`

## Honest handover

DONE: GT-09 flake, proven at the exact failing run index. NOT DONE: GT-10 headroom — the gate
passes but has 241 B of slack; reaching 5 % needs a measured architectural split. Open P1 item
remains in the register. Daniel-only: none.
