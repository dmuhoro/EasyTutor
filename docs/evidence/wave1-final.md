# Evidence — Wave 1 Final Report (2026-11-17)

**Release:** 1.11.0 · **Branch:** `fix/truth-pass` from `origin/main` @ `cae99d9` ·
**HEAD at handover:** _the release commit that follows this file_ ·
**Status: UNPUSHED BY DESIGN** — Daniel pushes, CI runs, Daniel merges.

Spec: `sprints/sprint_20_wave1_truth_pass.md`. Governance: `CONSTITUTION.md` Articles I–VII,
`AGENTS.md` entry/exit protocol, ADR-009 (`docs/adr/ADR-009-private-import-fts-retrieval.md`).

Every number in this report was produced by a command run in this session against the final
source state (1.11.0 working tree). Historical numbers in `sprints/`, `CHANGELOG.md` and
`docs/perf/` are records, not current claims.

---

## 1. What changed when this context was added

Wave 1 did not add a feature surface — it converted the project's claims into reproducible
facts and made the gates that protect them real:

1. **Truth before polish.** `STATUS.md` was rewritten from verified evidence; CI was shown to be
   RED on both Phase 1 and Phase 2 merge commits, Phase 2 acceptance was shown NOT MET, and its
   seven screens were identified as unwired dead code. The masked `testTimeout: 10000` was removed
   and the root causes of the two CI failures were fixed, not hidden.
2. **Enforcement at the real boundary.** Hosted AI now goes through the server `ai-proxy` with a
   CI gate that rejects the disabled direct rail; Ollama is strictly opt-in; user imports are
   `USER_PRIVATE` and retrieved through an `auth.uid()`-scoped ranked FTS RPC; the login-route
   byte budget was replaced from two dead config fields with a measured, fail-closed ratchet.
3. **The core loop was made testable end to end.** Route smoke mounts real lazy screens inside a
   real error boundary (the old wrapper-only gate was a false positive), the quiz has one abortable
   30 s budget, and auth/recovery was proven against real local GoTrue + Mailpit.

---

## 2. Per-task disposition

| Task | Status | Commit(s) | Evidence |
|---|---|---|---|
| Layer 0 — spec, ADR-009, progress log | **DONE** | `a07c1f1` | `sprints/sprint_20_wave1_truth_pass.md`, `docs/adr/ADR-009-…`, `docs/evidence/wave1-progress.md` |
| W1-0 — truth pass | **DONE** | `2f6f3bd` | `docs/evidence/wave1-0-truth.md` |
| W1-1 — CI green for real | **DONE** | `cb11aca` | `docs/evidence/wave1-1-ci-green.md` |
| W1-2a–e — AI/knowledge boundary (ADR-009) | **DONE** | `8fd0029`, `0202b69`, `55d05a5`, `d08dd9d`, `38e2cc8` | `docs/evidence/wave1-2-boundary.md` |
| W1-3 — local Supabase / RLS / privacy | **DONE** (from-zero reset explicitly NOT DONE) | `9f2729b` | `docs/evidence/wave1-3-local-supabase.md` |
| W1-4/T3 — real route smoke | **DONE** | `9cd617b`, `8c0f675` | `docs/evidence/wave1-4-t3-t6.md` |
| W1-4/T4 — one home / six tabs | **DONE** | `34f816d` | `docs/evidence/wave1-4-t3-t6.md` |
| W1-4 harness — full-suite stability | **DONE** | `2b583db` | `docs/evidence/wave1-progress.md` |
| W1-4/T5 — quiz cancel/offline/failure | **DONE** | `9610979` | `docs/evidence/wave1-4-t3-t6.md` |
| W1-4/T6 — auth E2E | **DONE** (protocol level; Google OAuth manual) | `36fc1d2` | `docs/evidence/wave1-4-t3-t6.md §6` |
| W1-6 — budgets that bite | **DONE** | `5296bfd` | `docs/evidence/wave1-6-budgets.md` |
| W1-5 — 390px core-loop browser demo | **PARTIAL** | `0c65635` | `docs/evidence/wave1-5-demo.md` |
| STATUS reconciliation | **DONE** | `07f1eda` | `STATUS.md` |
| Layer 7 — release + final report | **DONE** | release commit | this file, `CHANGELOG.md [1.11.0]` |

**Why W1-5 is PARTIAL, not DONE:** sign-up → onboarding, the seven-step wizard with an RLS-backed
profile row that survives reload, and a Learn deep link are proven in a real browser at 390 px
against local Supabase. Cited answers, quiz generation, weak-spot review, note import, browser
offline/online and explicit confirmation are **NOT DONE** in that demo; they are recorded in
`docs/evidence/wave1-5-demo.md §5` and remain gaps in `STATUS.md`.

---

## 3. Final gate results (all commands run this session, final HEAD)

| Gate | Command | Result |
|---|---|---|
| Production web export | `npm run build` | exit 0, `dist/` regenerated (SPA fallback + PWA injection) |
| Typecheck | `npm run typecheck` | 0 errors |
| Lint | `npm run lint` | 0 errors / 186 warnings (gate enforced, no `\|\| true`) |
| Tests | `npm test` | 73 files / 409 tests passed |
| Declared imports | `npm run check:imports` | PASS — 400 files scanned |
| AI boundary | `npm run check:ai-boundary` | PASS — no disabled direct rail; Ollama default URL empty |
| Secret exposure | `npm run guard:secret-exposure` | PASS — 272 client files scanned |
| Public env allowlist | `npm run guard:public-env` | PASS — 2 `EXPO_PUBLIC_*` names checked |
| Architecture boundaries | `node scripts/architecture/validate_boundaries.js` | 0 violations |
| QA runner | `node scripts/qa/qa_runner.js` | SUCCESS — 73 files / 409 tests |
| Web entry budget | `npm run perf:budget` | PASS — gzip 443,144 B / 450,000 B; raw 1,700,567 B / 1,750,000 B; 37 route chunks (min 30) |
| Login-route ratchet | `npm run perf:login-route` | PASS — 730,799 B / frozen 730,843 B ceiling, 44 B headroom |
| Core-loop demo | `npm run e2e:full` | 3/3 passed (7.8 s), real 390 px app + local Supabase |
| No-backend smoke | `npm run e2e:smoke` | 9/9 passed (55.0 s) |
| RLS matrix (W1-3) | self-checking `psql` harness | 104/104 cases |
| Two-user RPC privacy (W1-3) | real SQL | 9/9 cases |
| Governance harness | `bash scripts/security/run_rls_matrix_local.sh` | 247/247 pass |

**Gate integrity:** no assertion, timeout or threshold was weakened in this wave. The 26 B
login-route regression introduced by the W1-5 layout fix was reclaimed by removing three
debug-only console statements in `app/_layout.tsx` (one of which logged auth events that can carry
session tokens) and flattening a redundant `else { if }`. The budget value was never raised;
error/failure diagnostics were retained. Several candidate removals made the minified bundle
larger through variable renaming — they were measured and reverted. See
`docs/evidence/wave1-6-budgets.md §5b`.

---

## 4. Honest gaps — NOT DONE

| Gap | Why it remains | Owner / follow-up |
|---|---|---|
| `supabase db reset` from zero | 7 pre-existing migrations assume `schema.sql`, which the CLI does not replay; fails at `20260505_progress_system.sql`. Local privacy proof bootstraps from `schema.sql` instead. | Named migration-repair project; `docs/evidence/wave1-3-local-supabase.md §1, §7` |
| W1-5 demo uncovered steps | cited answer, quiz, weak-spot, import, browser offline/online, explicit confirmation not exercised in the browser demo | `docs/evidence/wave1-5-demo.md §5` |
| Full-demo CI job | `e2e:full` needs a live local Supabase stack; only the no-backend `e2e:smoke` is wired into GitHub Actions | follow-up CI task using `supabase/setup-cli` |
| GitHub Actions has not run on this branch | branch is unpushed by design | Daniel (§5) |
| Lighthouse mobile Performance ≥ 80 | measured 26 (FCP 9.7 s, LCP 20.4 s, TBT 3,980 ms); Phase 2 acceptance NOT MET | separate perf sprint; `docs/evidence/wave1-6-budgets.md` |
| Login JS ≤ 300 KB | measured 730,799 B; enforced as a decreasing ratchet, target not reached | investigation note only, no claim |
| Google OAuth round-trip | manual-only — no provider credentials; local allow-list not enforced | Daniel (§5, Auth URL settings) |
| Real cloud Supabase + physical Ollama round-trips | no staging/production credentials, no `ai-proxy` deployment here | Daniel (§5) |
| Cross-device progress/momentum round-trip | structural code + unit coverage only, not live-proven | follow-up |
| Open product defect: pre-onboarding profile sync | `[PROGRESS_syncFromCloud_failed] … Invalid or missing portal_type: undefined` and `[PROFILE FATAL] … Max retries reached` with a "Profile sync failed" banner; root cause is `PortalContextResolver.resolve()` → `requireActivePortalType()` reading an unresolved `active.learningMode` during pre-onboarding sync. Not fixed in Wave 1 (out of scope). | separate fix at the resolver boundary |
| Phase 2 screens / design approval | unwired dead code by spec decision; `DESIGN.md` still Draft | external design phase — intentionally untouched |
| `deno.lock` | untracked by a Deno tool invocation; deliberately never committed | leave untracked |

**Prior pilot recommendation is unchanged: NO-GO** until the from-zero migration repair, a live
cloud round-trip and the full core-loop CI proof exist. Wave 1 makes the blockers explicit; it does
not claim they are cleared.

---

## 5. Daniel's exact steps

1. **Push the branch:**
   `git push -u origin fix/truth-pass`
2. **Watch CI** (single `build` job, in order): `npm ci` →
   `check:imports` → `check:ai-boundary` → `typecheck` → `lint` → `npm test` →
   `lint:cycles` → architecture audit → `guard:secret-exposure` → `guard:public-env` →
   QA runner → `npx playwright install --with-deps chromium` → `build` →
   `perf:budget` → `perf:login-route` → `e2e:smoke`. All 16 steps were green from a fresh
   working copy locally (`docs/evidence/wave1-1-ci-green.md`); only GitHub's run is outstanding.
3. **Merge to main once CI is green.** If the merge is a squash, the local `v1.11.0` tag points
   at the pre-merge commit — either push it as the branch-release tag or recreate it at the merge
   commit and push that ref; verify with
   `git ls-remote --tags origin refs/tags/v1.11.0`. Do not push the branch or tag from this
   handover — both are local only.
4. **Supabase Auth URL settings** — Site URL, four redirect URLs, email confirmation ON in prod,
   Google callback: `docs/evidence/wave1-4-t3-t6.md §6`.
5. **Apply migrations in order** (staging then production): `supabase/schema.sql` on a fresh
   project, `CREATE EXTENSION IF NOT EXISTS vector;` before vector migrations, then the chain,
   then the three W1 forward migrations last and in this order:
   `20261117_private_import_fts.sql`, `20261117_relabel_user_chunks_private.sql`,
   `20261117_setup_wizard_preferences.sql`. Exact order and post-apply checks:
   `docs/evidence/wave1-3-local-supabase.md §7` and `README.md §3`.
6. **Set the provider key server-side only:** `GROQ_API_KEY` in the `ai-proxy` edge-function
   environment — never in `.env.local`, a commit or a PR description.
7. **Optional:** pull Ollama models and enable local AI in Settings only on a reachable LAN URL.

---

## 6. Release discipline

- **Version:** 1.11.0 in `package.json`, `package-lock.json` (root entries only — the two
  `@emnapi/*` 1.10.0 dependency entries were left untouched), `app.json` and `STATUS.md`.
- **CHANGELOG:** the Wave 1 `[Unreleased] … IN PROGRESS` header was converted to a dated
  `[1.11.0] — 2026-11-17` release header with a release summary.
- **Tag:** local annotated `v1.11.0` created at the release commit; **not pushed**.
- **Branch:** `fix/truth-pass`, 19 commits ahead of `origin/main`, **not pushed**.
- The pre-commit hook (lint, typecheck, `npm test`) ran on every commit including this release;
  no commit used `--no-verify`.

Final verification after this release commit: rebuild and re-run `perf:budget`,
`perf:login-route`, `npm test` and both browser suites; confirm the remote refs only after Daniel
pushes.
