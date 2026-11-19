# Sprint 25 — honest answer-source label — 2026-11-19

Branch `feat/provider-source-ui-label` from `origin/main` @ `a9d8b58` (PR #6 merged).
Spec: `sprints/sprint_25_provider_source_label.md`. No push to main, tag, merge, deploy or
Vercel/dashboard action by me. No secret read, printed, committed or echoed. Every number below
comes from a command run in this session.

## 1. Problem (verified in code before editing)

M1 made every AI call report the rail that actually answered via `AIResponse.provider`
(`lib/api.ts:84-89`), but no learner-facing surface displayed it:
- `screens/tabs/study.tsx` assistant messages discarded `res.provider`;
- `screens/tutor/session.tsx:95` built the assistant `ChatMessage` without a source.

A cached or placeholder answer was indistinguishable from a hosted one — a truth defect, not a
cosmetic gap. Grepped all seven assistant-message sites in the two screens to find the real
boundary before inserting the label.

## 2. Change

- `lib/ai/providerLabels.ts` (new, pure): `answerSourceLabelKey(AIProvider | undefined)` maps
  `hosted_proxy → answeredByHosted`, `local_ollama → answeredByLocal`, `cache → answeredByCached`,
  `placeholder → answeredByPlaceholder`, `offline → answeredByOffline`; `undefined` **and any
  unknown runtime value** fail closed to `answeredByUnknown`.
- `src/locales/{en,sw,fr}.json`: six label strings. None claims a model answered for a cache,
  placeholder, offline or unknown source.
- `store/studyStore.ts`: `ChatMessage.source?: AIProvider` — the rail that actually answered,
  never inferred from settings.
- `screens/tabs/study.tsx`: every assistant-answer site records its own truthful source —
  text answer `res.provider` (`:382`), cached `cache` (`:281`), offline-with-no-cache `offline`
  (`:294`), queued `offline` (`:398`), and queue-retry `res.provider` (`:185`). Renders the label
  on all assistant messages with `accessibilityLabel`.
- `screens/tutor/session.tsx`: assistant and error messages record `response.provider` (`:95`,
  `:104`); passes `source={msg.source}` to `ChatBubble` (`:205`).
- `components/ui/ChatBubble.tsx`: optional `source` prop; renders the localised label with an
  info icon on assistant bubbles.

Static greeting and voice answers have no rail recorded on this path; they display the explicit
"source unavailable" label rather than a false claim. Recording the voice rail would require
changing `generateExplanation`'s return type across QuizEngine/adaptive/tests — out of scope for
this label task and deliberately not done.

## 3. Proof — network edge mocked only

`tests/flows/answerSourceLabel.test.ts` (new, 5 tests). Only `fetch` is stubbed and only the
Supabase auth boundary is the existing test double; `askTutor`, `selectProvider`,
`executeWithReliability`, `answerSourceLabelKey` and the rendered `ChatBubble` are the real units.

```
$ npx vitest run tests/flows/answerSourceLabel.test.ts
 Test Files  1 passed (1)
      Tests  5 passed (5)
   Duration  3.66s
```

Covered: all seven mapping cases (incl. unknown/undefined fail-closed); real
`fetch → askTutor → answerSourceLabelKey` returning `answeredByHosted` with the call going to
`/functions/v1/ai-proxy`; real `ChatBubble` renders hosted, cached, offline and unknown labels
(react-test-renderer, `Text` nodes only). The cached-bubble test also asserts the hosted label is
absent.

## 4. Gates (this session)

```
$ npm run typecheck                         → 0 errors (empty output)
$ npm run lint                              → 158 problems (0 errors, 158 warnings)
$ npm test                                  → Test Files 85 passed (85); Tests 489 passed (489); 68.47s
$ node scripts/architecture/validate_boundaries.js
                                            → [AUDIT PASSED] No architecture violations found.
$ node scripts/qa/check-ai-boundary.mjs     → [AI BOUNDARY] PASS — no disabled direct rail call;
                                              Ollama default URL is empty.
$ npm run build                             → exit 0 — Exported: dist
```

Test delta from M1: 84 files / 484 tests → 85 files / 489 tests (+1 file, +5 tests). No test was
removed, skipped, assertion-loosened, timeout-raised or budget-widened. Lint warning count is
unchanged (158) and none are in changed files.

## 5. Not claimed

- No live cloud provider call, deployed proxy, real-device or browser E2E of the rendered label.
- No version bump or tag; release discipline remains with Daniel after merge.
- The Supabase policy idempotency fix (`docs/evidence/m1-supabase-policy-idempotency.md`) is in
  PR #7 and is a separate concern from this label change.
