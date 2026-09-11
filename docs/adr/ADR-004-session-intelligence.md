# ADR 004: Adaptive Session Intelligence

## Problem
Static quizzes and learning paths lead to student burnout or boredom. If a student is failing, they need a "soft landing"; if they are excelling, they need "academic rigor."

## Decision
Implement a **Session Intelligence Engine** (`lib/sessionIntelligence.ts`).
1. **Dynamic Difficulty:** Adjust quiz question difficulty (Easy -> Medium -> Hard) based on real-time streaks.
2. **Adaptive Batching:** Reduce the number of questions in a session if the student is struggling (wrong streak > 3) to prevent frustration.
3. **Mastery-Aware Explanations:** AI explanations are gated by the student's current mastery percentage (Beginner < 40%, Intermediate 40-70%, Advanced > 70%).

## Reasoning
This mimics a human tutor who notices when a student is overwhelmed or ready for a deeper challenge, maximizing learning effectiveness.

## Consequences
- Requires persistent tracking of streaks and mastery levels in the database.
- AI prompts must be dynamically constructed based on these metrics.

## Future Implications
Foundation for building a fully personalized "AI Professor" that understands a student's cognitive load and learning pace over months of data.
