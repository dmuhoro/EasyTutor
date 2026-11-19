# Sprint 27 — Phase 2 settings port-and-flip (first slice)

Date: 2026-11-19. Branch `feat/phase2-settings-port` from `origin/main`.

## Spec

Daniel chose "Port behaviour, then flip" for the stale Phase 2 directive. A full
port-and-flip of all seven Phase 2 screens is a multi-sprint refactor; this sprint
delivers one complete, provable slice: the settings route. No screen is flipped
until its live protections are present in the target.

## Verified premise (before any edit)

- `app/settings.tsx:4` imported `../screens/settings`, which resolves to the older
  `screens/settings.tsx` (a file) rather than the Phase 2 `screens/settings/index.tsx`.
- That older screen carries the live Ollama configuration (URL, chat/embedding model,
  `/api/tags` model-status detection) and `<PortalSwitcher />`. A naïve flip to the
  Phase 2 screen would have silently dropped both.
- The Phase 2 settings screen's "re-run onboarding" action pushed `/setup`, a route
  that does not exist (`app/setup-wizard/index.tsx` is the live route).

## Change

1. Ported the live Ollama config, per-role model-status detection and
   `<PortalSwitcher />` into `screens/settings/index.tsx`, using design tokens and
   `t()` strings rather than the older screen's hard-coded copy.
2. Added 11 new keys (`useLocalAI`, `ollamaDesc`, `ollamaServerUrl`,
   `configuredModels`, `configuredModelsDesc`, `reasoningChat`, `embeddingRAG`,
   `modelSlots`, `modelSlotsDesc`, `refresh`, `checking`) to all three locale packs.
3. Fixed the onboarding deep link to `/setup-wizard`.
4. Flipped `app/settings.tsx` to the explicit `screens/settings/index` module and
   its named `ProfileScreen` export. The explicit `/index` is required because the
   older file shadows the directory in module resolution.
5. Added `tests/screens/phase2-settings.test.tsx`, which mounts the **real route**
   and asserts the Phase 2 screen renders Ollama config, model status, the portal
   switcher, and the Phase-2-only locale string.

## Negative proof

With `app/settings.tsx` reverted to the old import, the new test fails:
`AssertionError: expected '…' to contain 'powers document retrieval'`
(`Tests 1 failed (1)`). With the flip restored: `Tests 1 passed (1)`.

## Not done in this sprint

Tutor, practice, library, progress, setup and home remain on their live routes. The
unwired Phase 2 versions of practice/library serve fake questions and fake documents;
the tutor version drops governed retrieval/citations; the setup version drops persisted
preferences. They must not be flipped until their live behaviour is ported and proven.
See `STATUS.md` and `docs/evidence/phase2-premise-audit.md`.
