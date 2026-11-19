# Sprint 25 — Honest answer-source label

Branch: `feat/provider-source-ui-label` (from `origin/main` @ `a9d8b58`, after PR #6 merge).
No push to `main`, no tags, no merge, no deploy, no Vercel/dashboard action.
Spec status: **complete (code/gates; no live E2E)**. Evidence: `docs/evidence/sprint25-answer-source-label.md`.

## Problem

EPIC M1 made every AI call report the rail that actually answered (`hosted_proxy`,
`local_ollama`, `cache`, `placeholder`, `offline`) via `AIResponse.provider` in
`lib/api.ts:27`. No learner-facing surface displays it. `screens/tabs/study.tsx:367`
and `screens/tutor/session.tsx:84` both discard `response.provider`, so a cached or
placeholder answer is indistinguishable from a hosted one. That is a truth defect,
not a cosmetic gap.

## Tasks

- **T1 — pure label mapping.** Add `lib/ai/providerLabels.ts`: a pure function from
  `AIProvider | undefined` to an i18n key. Never claim a model answered when the
  source is `cache`, `placeholder` or `offline`; unknown/undefined fails closed to an
  explicit "source unavailable" label.
- **T2 — localise.** Add the six label strings to `en.json`, `sw.json` and `fr.json`.
- **T3 — wire the answer surfaces.** Persist `provider` on `ChatMessage` and render
  the label on assistant answers in `screens/tabs/study.tsx` and
  `screens/tutor/session.tsx` (via `ChatBubble`). Cache, offline-queued and offline
  replies must carry their own truthful source, not inherit a prior answer's.
- **T4 — prove it.** Unit-test every mapping case. Prove the network-edge-only path
  `fetch` → `askTutor` → label carries the real provider, and prove the rendered
  bubble shows it. Mock only `fetch`/network, never `askTutor`, the selector, the
  reliability wrapper or the component under test.

## Non-negotiables

- One integrated commit for this one concern (code + tests + spec + docs move together); hooks on; no `--no-verify`.
- No test removed, skipped, assertion loosened, timeout raised or budget widened.
- No secret read, printed, committed or echoed.
- Every number in evidence comes from a command run in this session.
- `README.md`, `STATUS.md`, `CHANGELOG.md` move with the behaviour in the same change.
