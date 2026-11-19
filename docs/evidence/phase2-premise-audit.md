# Phase 2 wiring premise audit — 2026-11-19

Verified against the working tree before any Phase 2 screen was flipped. Source of
the stale claim: `STATUS.md` "all seven Phase 2 screens are unwired dead code"
and `docs/evidence/wave1-0-truth.md`.

## Findings

| Claim in STATUS | Verified reality |
| --- | --- |
| `screens/tutor/session.tsx` is unwired | **FALSE** — `app/tutor/session.tsx` lazy-imports it (commit `4f25e28`). |
| `screens/practice/index.tsx` is unwired | **FALSE** — `app/practice/index.tsx` lazy-imports it (commit `4f25e28`). |
| `screens/home/today.tsx` is unwired dead code | **FALSE** — the file does not exist in `screens/`; it is archived at `archive/screens/home/today.tsx`. |
| The settings route uses the Phase 2 screen | **FALSE** — `app/settings.tsx:4` imported `../screens/settings`, which resolves to `screens/settings.tsx`, not `screens/settings/index.tsx`. |
| `screens/library/index.tsx` is unwired | TRUE, and its three library documents and import action are hard-coded (`screens/library/index.tsx:45-115`). |
| `screens/progress/index.tsx` is unwired | TRUE, but it reads real `useProgressStore` / `useRoadmapStore` data; the `setTimeout(300)` is only a skeleton delay. |
| `screens/setup/index.tsx` is unwired | TRUE, and it persists only `setOnboardingComplete`, dropping the live wizard's other setup fields. |

## Why a direct flip is unsafe

- `screens/practice/index.tsx:96-102` generates fake questions
  (`What is the capital of ${topicName}?`, options `Option A…D`) instead of using
  `useQuizQuestionGeneration()` and the governed progress writes in the live
  `screens/tabs/quiz.tsx`.
- `screens/library/index.tsx:45-115` uses three hard-coded documents and a fake
  import; the live screen uses `listPrivateDocuments` / `importPrivateNotes` through
  the governed library layer.
- `screens/tutor/session.tsx` calls `askTutor` directly without the governed
  retrieval, citation building, source labelling, offline cache and pending-request
  queue that `screens/tabs/study.tsx:258-401` implements.
- Flipping `screens/settings/index.tsx` as-is would have dropped Ollama config and
  `PortalSwitcher`; its `router.push('/setup')` target does not exist.
- The Phase 2 screens introduce `t()` keys absent from the shipped locale packs
  (16 keys at audit time). The locale gate only walks keys reachable from `app/`,
  so it passes while the screens remain unwired — a false gate.

## Decision

Port live behaviour into each target screen, prove parity with a route-level test,
then flip in the same commit. Sprint 27 completes the settings slice. The remaining
screens stay on their live routes and are reported as NOT wired.
