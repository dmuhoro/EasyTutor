# E3 — De-flake and budget headroom

Branch `fix/e3-defake-headroom` from `origin/main` @ `859b9dc`. No PR opened: two PRs are
already open (#19 R0, #20 E1) and the directive caps open PRs at two. No threshold, budget,
timeout or assertion was changed.

## Part 1 — GT-09 flake: DONE

### Premise

Ground truth §2.1: `tests/flows/quiz.wrongAnswers.test.ts` › "generates structured single
question…" timed out at 5035 ms in 1 of 20 full-suite runs (4 workers) while taking 221–285 ms
solo. The `warmLearningPort()` hook was already present; the remaining cold path was the
default `PipelineExecutor` router, whose `resolveProviderSelection()` performs an Ollama
reachability probe (1.5 s timeout) and a Supabase session lookup on first use.

### Change

Injected the deterministic router already proven in `quiz.wrongAnswers.noOllama.test.ts`
through the existing `PipelineExecutor` constructor seam. The real pipeline, retrieval stub,
prompt building, output parsing, mastery evaluation and **all assertions** are unchanged; the
5 s test budget is untouched. Provider selection is still covered by the reliability and
orchestration tests; this test's unit is the pipeline's structured-output contract.

### Proof

| Command | Result |
|---|---|
| `for i in $(seq 1 20); do npm test \|\| exit 1; done` | **20/20 PASS**, 92 files / 515 tests each run (`ALL_20_PASS`) |
| Logs | `/tmp/work/e3-full-1.log` … `/tmp/work/e3-full-20.log` |

Run 15 — the exact index that failed in the audit — passed.

## Part 2 — GT-10 budget headroom: NOT DONE

Measured on the existing web export (`npm run perf:login-route`, exit 0):

```
__expo-metro-runtime-…js   1,893 B
__common-…js             306,406 B
entry-…js                424,460 B
total transferred        732,759 B (budget 733,000 B)  → 241 B, 0.03 % headroom
```

The roadmap requires **≥5 % headroom**, i.e. ≤ 696,350 B transferred: a **36,409 B** reduction.
The login route loads the root-layout `entry` chunk, which carries auth/profile boot
(`Database.governedQuery`, `getAuthenticatedUser`, all persisted stores) plus the shared
`__common` dependency chunk. There is no config knob or single dead import that yields 36 KB;
a real reduction needs an architectural split of authenticated boot from the public route shell,
with a re-measurement after rebuilding. That is not a safe change to make blind under the current
memory budget, and no budget value was changed to manufacture headroom.

This part is therefore reported **NOT DONE**, not partially green: the existing gate still
passes, but the epic's headroom goal is unmet.

## Honest handover

Safe: the confirmed 1-in-20 flake is gone under the exact 20× acceptance. Open: 241 B of
login-route headroom remains, so the next dependency bump can still break CI. Recommended next
step: split the authenticated boot providers behind a route-scoped layout, rebuild, re-measure.
Daniel-only: none.
