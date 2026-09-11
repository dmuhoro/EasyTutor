# Sprint 3 Day 1: KCSE Question Bank

## Objective
Build the first version of the KCSE Question Bank.

## Rules
* Reuse existing QuizEngine.
* Reuse analytics track().
* Offline-first.
* No AI tutor.
* No adaptive learning yet.
* No architecture rewrite.

## Tasks
1. Create `question_bank` schema (fields: id, subject, topic, difficulty, question, options, correct_answer, explanation, created_at).
2. Create `lib/questionBank.ts` with:
   * getQuestionsBySubject()
   * getQuestionsByTopic()
   * getRandomQuestionSet()
3. Seed Mathematics (25) and Biology (25) questions (50 total KCSE-style).
4. Create simple Question Bank screen showing Subject, Question count, Start Practice button.
5. Analytics: `question_bank_started`, `question_bank_completed`.
6. Tests: retrieval, filtering, random selection.
7. Verify with `npm run typecheck`, `npm run test`, `node scripts/qa/qa_runner.js`.
8. Update `ai-context/current_state.md`.
