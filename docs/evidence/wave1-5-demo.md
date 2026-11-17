# Evidence — W1-5: Phase 1 DONE demo (2026-11-17)

Branch `fix/truth-pass` @ `5296bfd` + W1-5 working tree. Every number below is from a
command run this session. No Vercel, dashboard, production access or provider key used.

## 1. What the harness does and does not prove

`npm run e2e:full` (`playwright.demo.config.js`, `tests/e2e/coreLoop.demo.spec.ts`) drives the
**real exported web app** in headless Chromium at **390 × 736**, against the **real local
easytutor Supabase** (Kong `http://127.0.0.1:54331`, GoTrue, PostgREST under RLS). It is
dev-only test tooling and is deliberately outside the hermetic `npm test` suite.

- The product's fail-closed URL guard (`isValidSupabaseUrl`, https-only) is **untouched**.
  The local stack is plain HTTP, so the harness rewrites **only the embedded URL scheme** in
  the delivered JS bundle (`http://127.0.0.1:54331` → `https://127.0.0.1:54331`) and routes
  those requests back down to the real local HTTP Supabase. No product source is changed for
  this.
- The PWA service worker and HTTP cache are disabled **in the test context only**, otherwise a
  cached, unrewritten bundle is served on reload. Production PWA behaviour is untouched.
- No provider key is available and no edge function is deployed locally, so the
  app → `ai-proxy` HTTP response is stubbed. In the final green run the stub is not reached
  (see gaps) — no claim is made that Groq, an LLM, or embeddings were called.
- No key, JWT, token or token-bearing URL is printed or persisted. Only status codes,
  row counts and UI text are logged.

Port pinning: the spec asserts `EXPO_PUBLIC_SUPABASE_URL` contains `:54331` (easytutor) so it
can never silently hit votechain's `:54321`. `supabase status` was never used for endpoints.

## 2. Fail-first proof — three real defects exposed by the demo

Each defect was observed failing before its fix, in this order:

1. **Onboarding → setup wizard bounced back.** The first run failed at
   `expect(page).toHaveURL(/\/setup-wizard/)`: received `http://127.0.0.1:3002/onboarding`.
   `app/_layout.tsx` treated `/setup-wizard` as a post-onboarding route and redirected to
   `/onboarding`. Fixed by allowing `segments[0] === 'setup-wizard'` while onboarding is
   incomplete.
2. **Setup wizard skipped every step.** `app/setup-wizard/index.tsx` defined `nextStep()` but
   the bottom Continue called `handleComplete()` directly. After fix 1, the demo reached
   `Step 7 of 7` then timed out. The Continue button now calls `nextStep()`.
3. **Review step's Continue was unreachable at 390px.** With 8 review cards in a non-scrolling
   container, Playwright reported the card subtree intercepting pointer events on Continue
   for the full 120 s budget:
   `Test timeout of 120000ms exceeded ... <div ... p-5 rounded-2xl ...> subtree intercepts pointer events`.
   This was a real usability defect, not a selector weakness — the button was genuinely
   covered. Fixed by wrapping the step content in a `ScrollView` with
   `keyboardShouldPersistTaps="handled"`. Instrumented rerun then printed
   `W15: reached review → clicked Continue at review → reached done → clicked Start Learning`.
4. **Profile write silently dropped.** After the wizard completed, the profile row was absent.
   Console capture gave the exact cause:
   `[SETUP] profile write failed Error: [DB WRITE FAILURE] [profiles] Could not find the 'country' column of 'profiles' in the schema cache`.
   The wizard writes `country`, `curriculum_track`, `learning_goal`, `exam_date`,
   `daily_minutes`, `language`, `data_mode`; the live table had none of them. The app showed
   "Setup saved locally" — a silent cloud drop. Fixed with a new forward-only migration
   `supabase/migrations/20261117_setup_wizard_preferences.sql` (7 `ADD COLUMN IF NOT EXISTS`),
   applied locally with `psql -v ON_ERROR_STOP=1`. Post-fix diagnostics:
   `profile diag emailRows=1 idRows=1 emailStatus=200 idStatus=200`.

No assertion was weakened and no timeout was raised to obtain a green result. The demo config's
120 s budget is new-suite tooling; the existing `playwright.config.js` and `npm test` timeouts
are unchanged.

## 3. Final green runs (this session)

| Gate | Command | Result |
|---|---|---|
| W1-5 full demo | `npm run e2e:full` | **3 passed (8.4 s)** — sign-up → onboarding; 7-step wizard + RLS profile row + reload; deep link to Learn |
| No-backend smoke | `npm run e2e:smoke` | **9 passed (55.3 s)** — login render, 4 deep links, SPA fallback, confirmation path, manifest, SW, icons |
| Build | `npm run build` | exit 0, `Exported: dist` |
| Migration | `psql -v ON_ERROR_STOP=1 < ...20261117_setup_wizard_preferences.sql` | `ALTER TABLE` exit 0; 7 columns confirmed present |
| Migration (environment) | `psql -v ON_ERROR_STOP=1 < ...20261117_private_import_fts.sql` | applied; `search_document_chunks_fts` present locally |

The demo asserts, against real GoTrue/PostgREST:
- `POST /auth/v1/signup` returns 200 with a real `user.id` and lands on `/onboarding`
  (local GoTrue has `GOTRUE_MAILER_AUTOCONFIRM=true`, so confirmation is implicit — see gaps).
- Every wizard step is reached in order (`2 · Your level` … `7 · Review` → `Setup complete!`).
- `profiles` has a row with `learning_mode: 'self_directed'`, `onboarding_complete: true`
  under RLS, and the app still renders after a full reload.
- A direct link to `/study?topic=Braking` renders the wired Learn screen with the free-form
  topic and question input.

## 3b. Keeping the W1-6 login-route ratchet honest after the W1-5 app fix

W1-6 froze `loginRouteTransferredBytes: 730843` from the pre-W1-5 build. The W1-5
root-layout fix (allowing `/setup-wizard`) added ~30 B to the eager `entry` chunk, so the
first post-W1-5 measurement was **730,869 B — FAIL (26 B over)**. The budget was **not**
raised and no assertion or timeout was weakened. Instead, three debug-only console
statements in `app/_layout.tsx` were removed and a redundant `else { if }` was flattened:

- `[AUTH] event` log — auth events can carry session tokens; logging them is a real
  exposure risk, so removing it is a security improvement, not a test concession.
- `[PROFILE] Sync start:` — logged the user id on every sync (PII in console).
- `[PROFILE] Missing. Creating...` — routine debug chatter.

All **error/failure diagnostics were retained** (`[PROFILE FATAL]`, `[PROFILE FETCH ERROR]`,
retry warning, `logSupabaseError`), so no rejection became silent. Minified variable renaming
made some candidate removals counterproductive (measured, reverted, not kept); the final
combination landed at **730,799 B transferred (44 B under the unchanged 730,843 B budget),
`npm run perf:login-route` PASS**. Detail in `docs/evidence/wave1-6-budgets.md §5b`.

`npm test` also went red once when Vitest collected this new Playwright `.spec.ts`
(`Playwright Test did not expect test.describe() to be called here`, 1 failed suite / 409
tests still passing). Fixed at the real boundary: `vitest.config.js` now excludes
`**/tests/e2e/*.spec.ts` as a class, not just the one filename, so any future Playwright
spec cannot turn the hermetic suite red again. Post-fix `npm test`: **73 files / 409 tests**.

## 4. CI wiring (what is and is not verified)

- Added `npx playwright install --with-deps chromium` before the Playwright-based steps.
  Without it, the W1-6 `perf:login-route` gate would fail in a clean CI runner.
- Added `npm run e2e:smoke` (no-backend subset) to the existing `build` job. This is the
  "main CI keeps a no-backend smoke subset" requirement; the command was verified locally
  (9/9 above).
- **NOT DONE:** a separate GitHub Actions job using `supabase/setup-cli` for `npm run e2e:full`.
  It cannot be verified from this branch (branch is intentionally unpushed, CI has not run)
  and would require Docker/service containers in the runner. It is not claimed as a working
  capability.

## 5. Explicit gaps (no silent PARTIAL)

The sprint listed nine demo steps. Status:

| Step | Status | Reason |
|---|---|---|
| Sign up | DONE | real UI → real GoTrue; 200 + session |
| Confirm | PARTIAL | local GoTrue `GOTRUE_MAILER_AUTOCONFIRM=true` makes it implicit; the explicit unconfirmed-user + `resend` proof is W1-4/T6 (`docs/evidence/wave1-4-t3-t6.md` §6), not repeated here |
| Onboard (survives reload) | DONE | 7 steps in order, RLS row asserted, reload renders |
| Import notes | NOT DONE | JSONL/file-picker flow not driven in this pass; ADR-009 FTS migration applied locally but no import round-trip claimed |
| Cited answer | NOT DONE | after send, the Learn screen navigates away before the proxy boundary is hit (`proxyCalls=0`); root cause not isolated within W1-5 — logged here, not papered over with a direct-store assertion |
| Quiz | NOT DONE | requires the same AI boundary; not exercised |
| Weak-spot review | NOT DONE | depends on quiz results; not exercised |
| Deep link | DONE | `/study?topic=Braking` renders wired Learn screen |
| Offline then online | NOT DONE | web `NetInfo` does not honour Playwright offline emulation; offline short-circuit is covered by `tests/flows/quiz.reliability.test.tsx` (W1-4/T5), not by this browser demo |

**Open product defect observed (not fixed in W1-5):** on startup the app still logs
`[PROGRESS_syncFromCloud_failed] ... Invalid or missing portal_type: undefined` and
`[PROFILE FATAL] Error: Max retries reached`, and shows a "Profile sync failed" banner. Root
cause: `PortalContextResolver.resolve()` → `requireActivePortalType()` reads an unresolved
`active.learningMode` during pre-onboarding sync. The wizard's own write now succeeds, so the
user's persisted profile is correct; this is a separate bootstrap-sync defect to fix in a
follow-up with its own fail-first test.

## 6. Honest status

- **DONE:** real 390px browser sign-up, onboarding with a real RLS profile write that survives
  reload, and a deep link; four real defects fixed at their real boundaries with fail-first
  evidence; no-backend smoke in CI; Playwright browser install in CI.
- **PARTIAL / NOT DONE:** cited answer, quiz, weak-spot review, import notes, explicit email
  confirmation, browser offline/online, and the full-demo CI job — all itemised above, none
  hidden behind a weaker gate.
