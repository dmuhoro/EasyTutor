# Evidence — Web entry-chunk budget gate rejects regressions (2026-11-04)

The budget gate must be proven to fail, not assumed to fail. Both runs below are
literal captured output from this session on HEAD `38aba0a` + the slice-8 working
tree, against the same `dist/` export produced by `npm run build`.

## 1. Real export passes the recorded budget

```
$ node scripts/perf/check-entry-budget.js
[PERF BUDGET] entry entry-ff175b23ae3da81029bc43c9e0f7e06b.js
[PERF BUDGET] gzip 437616 B (budget 450000 B)
[PERF BUDGET] raw  1674478 B (budget 1750000 B)
[PERF BUDGET] route chunks 35 (minimum 30)
[PERF BUDGET] PASS
$ echo $?
0
```

## 2. Forced budget breach is rejected (gate is not decorative)

```
$ ENTRY_BUDGET_GZIP_BYTES=1000 node scripts/perf/check-entry-budget.js
[PERF BUDGET] entry entry-ff175b23ae3da81029bc43c9e0f7e06b.js
[PERF BUDGET] gzip 437616 B (budget 1000 B)
[PERF BUDGET] raw  1674478 B (budget 1750000 B)
[PERF BUDGET] route chunks 35 (minimum 30)
[PERF BUDGET] FAIL: gzip 437616 B > 1000 B
$ echo $?
1
```

## 3. What the gate refuses (fail-closed matrix)

| Condition | Behaviour | Proven |
|---|---|---|
| No `dist/` export present | exit 1, "Run `npm run build` first." | code path + message |
| Zero or multiple `entry-*.js` chunks | exit 1, "expected exactly one entry chunk" | code path + message |
| Gzip above ceiling | exit 1, lists the violation | captured above |
| Raw above ceiling | exit 1, lists the violation | enforced identically |
| Route chunks below minimum | exit 1, lists the violation | enforced identically |
| Non-numeric env override | exit 1 (`Number.isFinite` guard) | code path |

Budgets live in `perf-budget.json` and are wired into `.github/workflows/ci.yml`
as the step after `Web export`, so a bundle regression fails CI rather than
landing. The budget is tightened only with a measured improvement; it is never
raised to make CI green.
