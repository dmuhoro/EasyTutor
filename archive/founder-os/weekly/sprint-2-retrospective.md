# Sprint 2 Retrospective (Days 1–4)

## What worked
- Reusing QuizEngine for remediation, review, and spaced micro-quizzes kept velocity high.
- Offline-first progress in `lib/aiLiteracy.ts` survived flaky connectivity patterns.
- Mastery gating (Unit N requires N-1 mastered) created clear progression without new infrastructure.

## What we learned
- Quiz completion callbacks must pass answer payloads before persistence — weakest section depends on `onFinishDetailed`.
- Spaced review at 48 hours is simple to reason about and test deterministically with injected timestamps.
- Portal bridge works best when tied to existing `learningMode` rather than inventing a new recommendation engine.

## Metrics impact (expected)
- Higher return engagement via spaced review cards.
- Better retention signal via weakest-section tracking.
- Smoother AI Literacy → primary portal transition after Unit 3 mastery.

## Day 5 direction
- Optional literacy application prompts inside primary portals.
- Or seed Unit 4 with same mastery/spaced-review contract.
