# Sprint 21 — Stitch UI wiring (L3): evidence

**Date:** 2026-11-18 · **Branch:** `fix/truth-pass` · **Commit under test:** `73cea7b`
**Spec:** `sprints/sprint_21_stitch_ui_wiring.md` · **Design source:** `docs/design/stitch/`

Every number below was produced by running the command in this session against this
working tree. Nothing here is inherited from an earlier pass.

---

## 1. Gates (all run at `73cea7b`)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors / 166 warnings (all pre-existing; gate enforced) |
| Tests | `npm test` | ✅ 79 files / 441 tests |
| Route smoke | `npx vitest run tests/smoke/routes.smoke.test.tsx` | ✅ 42/42 — exact `toHaveLength(40)` route-file inventory |
| Route ownership | `npx vitest run tests/navigation/route-ownership.test.ts` | ✅ every URL has exactly one owner; no transparent-group routes |
| Boot readiness | `npx vitest run tests/boot/readiness.test.ts` | ✅ 6/6 |
| Locale coverage | `npx vitest run tests/locales/keys.test.ts` | ✅ 4/4 |
| Boundaries | `node scripts/architecture/validate_boundaries.js` | ✅ 0 violations |
| Governance | `node scripts/architecture/governance_audit.js` | ✅ contracts present; 3 pre-existing raw-Supabase warnings in `lib/questionBank.ts`, `lib/recommendations.ts`, `lib/trendEngine.ts` |
| QA runner | `node scripts/qa/qa_runner.js` | ✅ SUCCESS — "All systems verified" |
| Web export | `npm run build` | ✅ exit 0, `dist/` regenerated |
| Entry budget | `npm run perf:budget` | ✅ gzip 437,117 B / 450,000 B; raw 1,671,055 B / 1,750,000 B; 37 route chunks |
| Login ratchet | `npm run perf:login-route` | ✅ 730,677 B / **unchanged** 730,843 B (166 B headroom) |

---

## 2. The startup remount loop (found and fixed)

### Symptom

A 390 px browser probe of `/` with a signed-in, seeded learner showed the URL alternating
`/` ⇄ `/ai-literacy` about ten times per second, indefinitely:

```
{"p":"/","txt":999} → {"p":"/ai-literacy","sk":1,"txt":0} → {"p":"/","txt":999} → …
```

`sk:1` is `[aria-label="Loading EasyTutor"]` — the `AppSkeleton`. So the app was not
navigating: it was swapping the whole root tree, including the `<Stack>`, for the skeleton.

### Root cause

`app/_layout.tsx` rendered `<AppSkeleton />` whenever `!isAppReady`, and
`isAppReady = !authLoading && !isProfileLoading && fontsSettled`. The Supabase
`onAuthStateChange` handler called `setIsProfileLoading(true)` on **every** event. Unmounting
the root layout drops the `onAuthStateChange` subscription; the remount re-subscribes; gotrue
immediately emits `INITIAL_SESSION`; the handler re-arms the skeleton. A self-sustaining
mount/unmount loop, every ~100 ms.

While the stack is unmounted, expo-router re-derives a path from the route tree. With no
child state it resolves to the first root route alphabetically — `ai-literacy`. When the
portals still lived in transparent groups, that first route's path was `/`, so the loop was
**invisible** (the URL never changed). The route-ownership refactor made it visible.

### Fix

1. `lib/boot.ts` — `resolveBootState()` latches the gate: once the shell has painted,
   `isAppReady` stays true for any combination of loading flags. Unit-tested.
2. `app/_layout.tsx` — uses the latch; the auth handler no longer re-arms the gate for
   `TOKEN_REFRESHED` / `SIGNED_OUT`.

### Proof

- Before: 33 URL flips in 6 s (`probe6`, 60 ms sampling).
- After: **0 flips** on three consecutive runs; 1–2 skeleton samples at first paint only;
  Home renders with real store data; `page-errors 0`.
- Prove-the-proof: removing the latch (`isAppReady: isBootReady`) makes 3 of 6 boot tests
  fail; restoring it makes all 6 pass.

---

## 3. Login-route payload (budget not raised)

`npm run perf:login-route` was **already red at `9ca17f9`** (HEAD before this work):
743,599 B against the frozen 730,843 B. Reducing payload, not raising the ceiling:

| Change | Measured effect (transferred bytes) |
|---|---|
| `setup-wizard` moved to `screens/` and made lazy (was the only eager 17.7 KB route) | entry 429,066 → 425,764 B |
| sw/fr locale packs loaded on demand; `onboarding`/`update-password` lazy; `lib/library.ts` loads its chunker/store with `import()` | shared chunk 312,676 → 306,405 B; entry → 423,321 B |
| 64 unreferenced translation keys pruned from all three packs | shared chunk → 305,307 B |
| First-paint latch (no repeated full-tree remounts) | entry → 423,581 B |

Final: **730,677 B** (166 B headroom). The ratchet value in `perf-budget.json` is unchanged.

---

## 4. Visual check

390 × 844 render of `/` compared against `docs/design/stitch/today/screenshot.jpg`:
paper background, teal primary, single "Study plan" card with real roadmap progress,
real weak spots from quiz history, real week strip. No exam countdown, institution or
article copy from the reference.

Tab bar fix: labels were being flex-shrunk to a 9 px box (`overflow:hidden`) and clipped at
the viewport edge. Bar height 60 → 72 px with pinned label metrics (11 px / 12 px line
height); all four tab layouts updated. Verified in the same 390 px render — Home / Learn /
Practice / Library / You all fully legible.

---

## 5. Honest gaps (unchanged or newly recorded)

- `screens/tutor/session.tsx`, `screens/library/index.tsx`, `screens/progress/index.tsx`,
  `screens/setup/index.tsx` remain unreachable; `screens/shared/settings.tsx` and
  `screens/profile.tsx` are archived, not deleted.
- ~1,085 hardcoded hex literals remain outside the tokenised screens.
- Dark mode flips chrome only; per-screen dark variants are not delivered.
- JetBrains Mono is not bundled; formulas use the platform monospace fallback.
- Lighthouse Performance ≥ 80 and the ≤ 300 KB login target are **not** met (166 B headroom
  above 730 KB, not below 300 KB).
- `supabase db reset` from zero still fails on 7 pre-existing migrations.
- GitHub Actions remains unverified for this branch until it is pushed.
