# Spec 046: Sprint 4 Day 5 — Spaced Repetition Engine

## Status: IN-PROGRESS

## Goal
Create a robust spaced repetition engine to protect learned knowledge from being forgotten. The engine will track retention at Subject, Topic, and Subtopic levels and schedule reviews across defined stages.

## Scope
- New library: `lib/spacedRepetitionEngine.ts` exposing core utilities.
- Data model fields: `lastReviewedAt`, `reviewCount`, `retentionScore`, `forgettingRisk`, `nextReviewDate`, `reviewStage`.
- Review stages with intervals:
  1️⃣ Same day
  2️⃣ +1 day
  3️⃣ +3 days
  4️⃣ +7 days
  5️⃣ +14 days
  6️⃣ +30 days
  7️⃣ +60+ days
- Utilities:
  - `scheduleReview()` – compute next review date based on stage.
  - `calculateRetention()` – update retentionScore using exponential decay.
  - `calculateForgettingRisk()` – derive risk from retention and time since last review.
  - `getDueReviews()` – fetch items due for review today or earlier.
  - `getAtRiskKnowledge()` – fetch items with high forgettingRisk.
- Integration hooks for mastery, confidence, performance, recommendation, and trend engines.
- Extend recommendation engine to surface:
  - Review Today
  - High Risk Topics
  - Retention Warnings
  - Upcoming Reviews
- Dashboard UI addition: **Memory Health** section showing retention metrics.
- Persistence via AsyncStorage and Supabase with sync helpers.
- Database migration `learning_retention_profiles` with indexes, RLS, constraints, and contracts.
- Test suite `tests/spacedRepetitionEngine.test.ts` covering core calculations and scheduling.

## Verification
- `npm run typecheck` ✅
- `npm run test` ✅ (once tests added)
- `node scripts/qa/qa_runner.js` ✅

## Audit Trail
- Implemented by: Antigravity AI Agent
- Date: 2026-06-06
