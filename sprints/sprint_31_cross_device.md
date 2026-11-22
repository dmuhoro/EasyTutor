# Sprint 31 — Cross-device reality (G-15 / G-16)

Branch: `feat/cross-device` (planned, stacks after Sprint 30).
Date: 2026-11-22. Spec before code.

## Directive

- **G-15** desktop is effectively unsupported: global `orientation: portrait` (`app.json:6`,
  `public/manifest.json:8`, `AndroidManifest.xml:19`), the only viewport rule is an 80 px rail
  at ≥768 px (`app/(tabs)/_layout.tsx:12-46`), and there is no desktop Lighthouse measurement.
- **G-16** Android E2E is unproven; `android/` is git-ignored prebuild output (`.gitignore:41`)
  and `expo-dev-client` (`eas.json:8`) means a dev build, not Expo Go.

## Scope

1. Platform-scoped orientation: portrait on phone/native, unrestricted on web. No global loosen.
2. A real responsive shell for ≥1024/1280 px (centred content container, sane max width,
   keyboard/hover-safe controls) built from design tokens — no new hardcoded hex.
3. A repeatable device/Web E2E harness command that runs the live-proof checklist steps against
   a supplied test user (credentials from a temp file, never chat or repo).
4. Desktop Lighthouse measurement command + recorded baseline.

## Result — 2026-11-22 (code/harness/measurement DONE; live proof blocked)

- **G-15:** native orientation stays portrait in `app.json`; the shipped web manifest is
  `any` (verified in `dist/manifest.json`). The tab layout now uses typed `screenLayout`
  with `LAYOUT` tokens: 80 px rail, centred 1080 px content cap, fixed gutter below 1024.
  An initial `sceneContainerStyle` draft was rejected by `tsc` (TS2322) and replaced;
  no type rule was loosened. New tests fail 3/7 against the pre-fix files and pass 15/15
  on the final tree. A reproducible desktop Lighthouse command recorded local baselines
  of `/` 45–46 and `/login` 64 (≥80 still NOT MET; no budget changed).
- **G-16:** `npm run qa:live-preflight` reports all prerequisites BLOCKED and all 10 flows
  UNPROVEN with Daniel as owner; `--require-ready` exits 1. `--run-local` runs the
  credential-free build/bundle-guard/390px E2E/Lighthouse checks (all PASS), and a forced
  `guard:dist` exit 7 made the harness exit 1. `docs/evidence/live-proof-pack.md` carries the
  one-session unblocking sequence.
- Gates: typecheck 0; lint 0 errors / 149 warnings; imports PASS (421 files); tests
  91 files / 510 tests; boundaries 0; AI boundary PASS; guards 448 / 493 files; build
  exit 0; E2E smoke 9 passed; QA green; full audit exit 0.
  Full proofs: `docs/evidence/2026-11-22-cross-device.md`.

## Honest boundary

Physical-device E2E and the 10-flow live proof **cannot be claimed** without Daniel's test login,
`GROQ_API_KEY` and Vercel access. This sprint delivers the code, the harness and the exact
manual runbook; the blocked proof is handed over with its owner, never marked done.

## Acceptance criteria

- Orientation is platform-scoped and verified by config test.
- Desktop viewport test (≥1280) proves the responsive shell renders; no regression at 390 px.
- Harness + runbook committed; manual steps named with owner.
- Full gates green; evidence recorded; STATUS/CHANGELOG/README updated.
