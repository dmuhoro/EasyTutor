# Evidence — core-loop truth on the wired routes (G-01 / G-02)

Date: 2026-11-22 · Branch: `feat/core-loop-truth` (stacks on PR #13, `27690a7`) ·
Spec: `sprints/sprint_29_core_loop_truth.md`.

## What changed

| Gap | Before (observed at `27690a7`) | After |
| --- | --- | --- |
| G-01 | `screens/practice/index.tsx` fabricated `What is the capital of ${topicName}?` with `Option A…D` behind a 500 ms `setTimeout`; `markTopicDone`/`recordWrongAnswer` destructured but never called; `window.location.href` in the timed toggle crashed on device. | Real route calls `useQuizQuestionGeneration().generateQuizQuestion({ subject_id, topic_id })` (auth + portal + offline short-circuit + 30 s deadline + cancel). Renders governed question/options/explanation; honest `notCovered` state; `recordWrongAnswer` on a wrong pick; `addQuizScore` on finish; router-native `setParams` for timed mode. No `any` casts on route params. |
| G-02 | `screens/tutor/session.tsx` sent a hardcoded `You are a helpful tutor for …` prompt, passed `citations={[]}` to every bubble, and hid the composer whenever the message list was empty (so a learner could never ask a first question). | Real route runs governed `retrieveRelevantChunks` (portal + authenticated owner, subject-scoped, top 3), builds citation markers with the real `buildCitation`, injects them with `buildSystemPrompt` + an explicit CITE-YOUR-SOURCES instruction, and credits only exact rendered markers via `citedSources`. Fails closed when nothing is retrieved: no AI call, no invented citation, honest "not in your notes" state. `ChatBubble` now receives `msg.citations`; the answer source stays the rail that actually answered. Composer always available. |

Both routes are the **wired deep links** (`app/practice/index.tsx:4`, `app/tutor/session.tsx:4`),
not helper copies. Tests mount the real route with the real lazy screen preloaded; only the
governed/network edges are substituted with spies.

## Negative proofs — new tests fail without the fix

Run against `git show HEAD:screens/practice/index.tsx` and `git show HEAD:screens/tutor/session.tsx`
(the pre-fix files), with the **final** test code, then the implemented files restored.

```
npx vitest run tests/screens/phase2-practice.test.tsx -c vitest.config.js
  Test Files  1 failed (1)   Tests  3 failed (3)
  - generateQuizQuestion never called
  - governed option "Option x = 4" not found
  - render tree still contains "What is the capital of linear-equations?" / "Option A…D"

npx vitest run tests/screens/phase2-tutor-session.test.tsx -c vitest.config.js
  Test Files  1 failed (1)   Tests  2 failed (2)
  - TextInput not found: pre-fix screen early-returns the empty state when messages.length === 0
    and never renders a composer
```

With the fix: `phase2-practice` 3/3 pass, `phase2-tutor-session` 2/2 pass.
No timeout, assertion, skip or threshold was changed in either direction.

## Gate outputs (this branch, final tree)

| Gate | Command | Actual result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | exit 0, 0 errors |
| Lint | `npm run lint` | 0 errors / 149 warnings (down from 158: unused `any`/dead destructures removed) |
| Tests | `npm test` | 88 files / 498 tests passed (was 86 / 493) |
| Architecture | `node scripts/architecture/validate_boundaries.js` | `[AUDIT PASSED] No architecture violations found.` |
| AI boundary | `npm run check:ai-boundary` | `[AI BOUNDARY] PASS — no disabled direct rail call; Ollama default URL is empty.` |
| Secret guards | `npm run guard:secrets` | secret guard 274 files scanned, exit 0; public-env guard 2 names, exit 0 |
| Web build | `npm run build` | exit 0; Expo export completed, PWA assets injected |
| QA runner | `node scripts/qa/qa_runner.js` | `[QA] All systems verified. Ready for release.` (88 / 498 tests) |

## Not claimed

- No physical-device, browser, live Supabase or Vercel proof. These remain Daniel-owned blockers
  (G-10…G-14) and are tracked in the one-session live-proof pack.
- Quiz `notCovered` and retrieval-empty states are proven at the route boundary with stubbed
  network edges; live grounding depends on imported notes and `GROQ_API_KEY` (G-11).
- Lighthouse P1 target ≥ 80 remains **NOT MET** by Daniel's 2026-11-19 decision; no budget changed.
