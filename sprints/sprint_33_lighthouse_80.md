# Sprint 33 — Lighthouse ≥ 80 on the real exported routes

## Context

`STATUS.md:92` records the P1 Lighthouse target as **≥ 80** and previously **NOT MET**.
No target, budget or ADR was changed when the gap was recorded. The user has now explicitly
asked for the requirement to be met, so this sprint closes the gap by **real work**, not by
moving the goalposts.

`docs/evidence/2026-11-22-cross-device.md` recorded local desktop baselines of
`/` 40–46 and `/login` 62–64. Re-running the declared `npm run perf:lighthouse` on the
final `feat/cross-device` tree (after the `zod` pin) now gives three fresh runs:

```
/       performance=77/100  FCP=0.2s  LCP=1.5–1.6s  TBT=280–380ms  CLS=0
/login  performance=90–92/100 FCP=0.2s LCP=1.2–1.3s TBT=180–200ms CLS=0.005
```

The score is variable under load, so a single lucky run is not evidence. `/` is the
route that still dips below 80.

Lighthouse trace analysis (`/tmp/opencode/lh-root.json`, `/tmp/opencode/lh-login.json`)
attributes the remaining main-thread work to:

- `/_expo/static/js/web/entry-*.js` — 635 ms on `/`, 523 ms on `/login`;
- `/_expo/static/js/web/index-*.js` — 201 ms on `/` only;
- long tasks beginning at ~1.0 s, 1.25 s and 1.37 s.

`app/_layout.tsx:156-175` schedules non-critical startup work (knowledge-store
initialisation, failed-sync retry, remote sync, analytics event) with a **100 ms**
`setTimeout`. That work runs squarely inside Lighthouse's TBT window on every route,
including the login route, even though none of it is required for first paint, auth
gating or navigation.

## Real path and boundary

- The measured path is the exported SPA served from `dist/` by the declared `serve`
  dependency and driven by the declared Playwright Chromium plus `lighthouse@13.6.0`
  via `scripts/perf/lighthouse_desktop.mjs`.
- `app/_layout.tsx` is the real root layout mounted for both `/` and `/login`; the
  deferred block above is on that path. It is not a test-only helper.
- The optimisation boundary is the scheduling of that non-critical work. It must still
  execute exactly once and log its failure explicitly; it must not be removed, skipped
  or converted into a silent no-op.

## Change

1. Add a typed idle-scheduling helper that uses `requestIdleCallback` where available
   and a **2 s** `setTimeout` fallback otherwise. The fallback is not a test timeout;
   it is the browser-idle substitute for browsers without `requestIdleCallback`.
2. Replace the 100 ms critical-path timer in `app/_layout.tsx` with that helper.
3. Apply the same idle boundary to the non-visual sync block in
   `screens/tabs/index.tsx` (`updateStreak`, `preloadQuizCache`, `syncQueuedTasks`,
   `syncPendingProgress`, `fetchSavedRoadmaps`). The rendered values still come from
   local stores first; only the background work moves off the interaction window.
4. Keep the tab navigator unmounted while an unauthenticated visitor is being
   redirected to `/login`. Lighthouse attributes a separate 145–201 ms task to the
   home chunk on `/`; rendering the destination route instead of a transient home
   screen removes that cost without changing the redirect itself.
5. Add adversarial tests proving:
   - the deferred work is **not** run by a 100 ms timer any more;
   - it **is** run when the browser reports idle;
   - it **is** run by the fallback path when `requestIdleCallback` is absent;
   - a rejection in the deferred work is logged, never silently dropped;
   - both the root layout and home screen use the idle helper instead of their
     former eager timers.
6. Turn `scripts/perf/lighthouse_desktop.mjs` from a measurement-only printer into a
   fail-closed gate: `--min-score` defaults to 80, below-minimum routes and unmeasurable
   routes exit non-zero with an explicit reason, and malformed/unknown arguments are
   rejected so a typo cannot silently disable the gate.
7. Re-run `npm run perf:lighthouse` three times and require **both** routes ≥ 80 on
   every run, with TBT materially below the baseline. Record all three runs. Prove the
   gate rejects a below-minimum result (`--min-score 100` adversarial probe, exit 1)
   without changing the shipped default of 80.
8. Keep every existing gate green. Do not raise the Lighthouse target, the bundle
   budgets, the login-route ratchet, a test timeout, or a threshold.

## Evidence and documentation

- New evidence file `docs/evidence/2026-11-23-lighthouse-80.md` with before/after
  tables, three runs, trace attribution, negative proofs and the full gate table.
- Update `STATUS.md`, `CHANGELOG.md`, `README.md`, `docs/COMPLETION_TRACKER.md` and
  the existing cross-device evidence so desktop MET and mobile NOT MET are both
  explicit and cannot be confused.
- Record Vercel CLI access and the remaining protected-deployment browser-access
  caveat honestly; a local export measurement is not a production/Vercel score.

## Non-goals

- No merge, tag, release or deploy.
- No change to Deployment Protection, Trusted Sources, OAuth or Supabase Auth settings.
- No weakening or deletion of any test, guard or budget.
- No claim of physical-device, live-network or browser-authenticated proof.
- No secret value is read, printed or committed; only variable names are inspected.

## Result — 2026-11-23

- Desktop target **MET**: three consecutive `npm run perf:lighthouse` runs gave
  `/` 89/92/91 and `/login` 91/92/91, with TBT 180–220 ms and CLS 0.005. Every
  measurement is ≥ 80; no threshold or budget was moved.
- The harness is now a real fail-closed gate, not a printed score: `npm run perf:lighthouse`
  exits 0 at the default 80 minimum, exits 1 for the `--min-score 100` negative probe
  (both routes explicitly rejected) and exits 1 for an unknown argument. The default was
  not raised; 100 was a one-off adversarial input.
- The user confirmed on 2026-11-23 that the desktop preset is the requirement to close.
  The mobile preset is **still NOT MET** (`/` 45, `/login` 46 on the same export) and is
  recorded as such in the evidence and status.
- `tests/perf/idle-startup.test.ts` is 5/5 on the final tree. It failed 1/5 against each
  of three pre-fix variants: the 100 ms root timer, the eager home sync block and the
  missing unauthenticated render gate.
- Vercel CLI access was confirmed (`vercel whoami`, `vercel project inspect`, `vercel ls`,
  `vercel curl`). Browser Lighthouse on Vercel is **not** claimed: `vercel curl` bypasses
  protection for HTTP, but the development OIDC header still receives 302 on preview and
  production. No protection setting was changed.
- Full gate table and trace details: `docs/evidence/2026-11-23-lighthouse-80.md`.

## Acceptance criteria

- `npm run perf:lighthouse` reports `/` ≥ 80 and `/login` ≥ 80 on three consecutive runs,
  and the harness exits non-zero when a route is below its configured minimum (proved with
  `--min-score 100`) or when its arguments are malformed.
- The new idle-scheduling tests fail against the pre-fix scheduling and pass after it.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:imports`, boundaries,
  AI boundary, `npm run guard:secrets`, `npm run guard:dist`, `npm run perf:budget`,
  `npm run perf:login-route`, `npm run build`, E2E smoke, QA runner and
  `npm run audit:full` are all green on the final tree.
- Evidence, sprint result, tracker, status, changelog and README are updated in the
  same change.
