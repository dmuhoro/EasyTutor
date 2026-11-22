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

## Honest boundary

Physical-device E2E and the 10-flow live proof **cannot be claimed** without Daniel's test login,
`GROQ_API_KEY` and Vercel access. This sprint delivers the code, the harness and the exact
manual runbook; the blocked proof is handed over with its owner, never marked done.

## Acceptance criteria

- Orientation is platform-scoped and verified by config test.
- Desktop viewport test (≥1280) proves the responsive shell renders; no regression at 390 px.
- Harness + runbook committed; manual steps named with owner.
- Full gates green; evidence recorded; STATUS/CHANGELOG/README updated.
