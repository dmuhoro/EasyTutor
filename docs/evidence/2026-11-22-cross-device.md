# Evidence — cross-device reality (G-15 / G-16)

Date: 2026-11-22 · Branch: `feat/cross-device` (stacks on Sprint 30 / PR #15) ·
Spec: `sprints/sprint_31_cross_device.md`.

## G-15 — desktop shell and platform-scoped orientation

**Orientation.** `app.json` keeps `expo.orientation: "portrait"` (native phone), while
`public/manifest.json` now declares `"orientation": "any"`. There is no platform-specific
override in `app.json`. The generated, git-ignored
`android/app/src/main/AndroidManifest.xml` was observed with
`screenOrientation="portrait"`, so the native lock is still present where it belongs.
The built `dist/manifest.json` was inspected after `npm run build` and contains
`"orientation": "any"`.

**A false gate was caught during implementation.** The first draft passed a
`sceneContainerStyle` prop to Expo Router's `<Tabs>`. The mocked unit tests passed, but
`npm run typecheck` failed with `TS2322: Property 'sceneContainerStyle' does not exist`.
The code was changed to the typed `screenLayout` prop (verified in the installed
`expo-router/build/layouts/TabsClient.d.ts`), which wraps each scene including its header
but leaves the absolutely positioned rail alone. No test or type check was loosened to
make this pass.

**Responsive shell.** `app/(tabs)/_layout.tsx` now derives `isWide` and `isDesktop` from
`LAYOUT` design tokens (768 / 1024 px), caps the content column at
`LAYOUT.contentMaxWidth` (1080), and computes a centred gutter at 1280 px
(rail 80 + gutter 60 + content 1080 + gutter 60 = 1280). The rail gains a right border.
No new hex values were introduced.

**Negative proof — real production files restored to `HEAD` while keeping the final tests:**

```
npx vitest run tests/config/platform_orientation.test.ts \
  tests/navigation/desktop-shell.test.tsx -c vitest.config.js
  Test Files  2 failed (2)
       Tests  3 failed | 4 passed (7)
  - orientation: expected 'portrait' (web manifest) to be 'any'
  - desktop: expected borderRightWidth 1, received undefined
  - desktop: "layout did not supply screenLayout"
  exit 1
```

**Positive proof (final tree):** `3 files / 15 tests passed` including the existing
`tabs-layout.test.tsx`; 390 px still has a bottom bar, no side rail and no forced width.

**Desktop Lighthouse baseline.** `npm run perf:lighthouse` serves the local `dist/` export,
drives the declared Playwright Chromium with Lighthouse's desktop preset, and prints a
score summary. Two runs on this tree:

```
/       performance=46/100  FCP=0.2s  LCP=3.0s  TBT=2,010ms  CLS=0
/login  performance=64/100  FCP=0.2s  LCP=0.2s  TBT=1,350ms  CLS=0.005

/       performance=45/100  FCP=0.2s  LCP=3.2s  TBT=2,120ms  CLS=0
/login  performance=64/100  FCP=0.2s  LCP=0.2s  TBT=1,320ms  CLS=0.005
```

These are **local baseline measurements**, not Vercel/production scores. The P1 target
≥ 80 remains **NOT MET** by the existing decision; no target, budget or ADR was changed.

## G-16 — repeatable harness, no claimed device proof

`npm run qa:live-preflight` (`scripts/qa/live_proof_harness.mjs`) checks prerequisites by
**name/presence only**: a mode-600 JSON credential file outside the repo, a reachable
browser URL (with an explicit operator-attestation override), the
`Deno.env.get("GROQ_API_KEY")` lookup in the ai-proxy source, and one online adb device.
It never prints a credential value and never marks a live flow as done.

Observed with no credentials supplied:

```
BLOCKED test-user        LIVE_PROOF_USER_FILE is not set [owner: Daniel]
BLOCKED browser-access   E2E_BASE_URL is not set [owner: Daniel]
BLOCKED groq-secret      lookup wired; provider secret not yet confirmed [owner: Daniel]
BLOCKED android-device   no adb device online [owner: Daniel]
UNPROVEN 10 live flows — no proof claimed (see scripts/live-proof-checklist.md).
npm run qa:live-preflight -- --require-ready  → exit 1
```

`--run-local` runs the repeatable, credential-free web checks backing the checklist:

```
PASS build (exit 0)
PASS bundle-guard (exit 0)          # 493 files scanned in source + exported bundle
PASS web-e2e-smoke (exit 0)         # 9 passed @ 390px
PASS desktop-baseline (exit 0)      # scores above
harness exit: 0
```

**Negative proof — the local-run gate fails closed.** A PATH stub made only `npm run
guard:dist` exit 7:

```
PASS build (exit 0)
STUB: forced guard:dist failure
FAIL bundle-guard (exit 7)
PASS web-e2e-smoke (exit 0)
PASS desktop-baseline (exit 0)
harness exit with stubbed failure: 1
```

`docs/evidence/live-proof-pack.md` gives the unblocking sequence, the exact commands and the
ten flows with Daniel as owner. Credentials go in a mode-600 temp file under
`/tmp/opencode`, never in chat, the repo or an evidence file.

## Final gates (final tree)

| Gate | Command | Actual result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | exit 0, 0 errors |
| Lint | `npm run lint` | 0 errors / 149 warnings |
| Declared imports | `npm run check:imports` | PASS — 421 files scanned |
| Tests | `npm test` | **91 files / 510 tests passed** (serial run) |
| Architecture | `node scripts/architecture/validate_boundaries.js` | `[AUDIT PASSED] No architecture violations found.` |
| AI boundary | `npm run check:ai-boundary` | PASS |
| Source guards | `npm run guard:secrets` | 448 files; 2 EXPO_PUBLIC_* names |
| Bundle guard | `npm run guard:dist` | 493 files |
| Web build | `npm run build` | exit 0 |
| 390px E2E smoke | `npm run e2e:smoke` | 9 passed |
| QA runner | `node scripts/qa/qa_runner.js` | 91 files / 510 tests; `[QA] All systems verified. Ready for release.` |
| Full audit | `npm run audit:full` | exit 0; `AUDIT COMPLETE — all verification steps passed` |

One parallel gate run showed 3 failures in `tests/flows/quiz.wrongAnswers.test.ts` under
heavy concurrent load — the previously recorded load-dependent timing flake. The serial
re-run was 510/510 and the QA runner was green. No timeout, assertion, skip or threshold
was changed.

## Not claimed

- No live-network, browser-authenticated or physical-device flow was executed. G-10…G-14
  stay BLOCKED with Daniel as owner.
- Keyboard/hover affordances on the desktop rail were **not** verified in a browser: the
  unauthenticated app redirects to `/login`, so the tab bar cannot be reached without the
  missing test user. This is handed over with the same blocker, not claimed as tested.
- The Stitch desktop screens remain unrouted; G-15 is done for orientation, the responsive
  shell and the measurement only.
- P1 Lighthouse ≥ 80 remains NOT MET; `npm outdated` and `npm audit` still report findings
  and are recorded as diagnostics by `audit:full`.
