# 047-weakness-prediction-engine.md

## Specification: Weakness Prediction Engine

**Goal**: Predict future learning problems before they manifest.

### Features
- Analyze mastery, performance, confidence, trend history, and retention profiles.
- Generate risk signals: mastery decline, confidence decline, retention failure, stagnation, topic abandonment.
- Compute risk score (0‑100), severity (LOW, MEDIUM, HIGH, CRITICAL), confidence level, reason, and recommended intervention.
- Expose helper methods: `predictWeaknesses`, `calculateRiskScore`, `detectStagnation`, `detectDecline`, `detectKnowledgeDecay`, `generateInterventions`.
- Persist predictions via AsyncStorage and Supabase (`learning_risk_predictions` table).
- Integrate predictions into recommendation engine and learning dashboard as a "Learning Risks" section.
- Provide unit tests covering scoring, detection, and intervention generation.

### Data Flow
1. Fetch latest profiles from existing stores.
2. Run `predictWeaknesses(userId)` → array of `WeaknessPrediction`.
3. Store results locally and remotely.
4. Recommendation engine augments dashboard with `learning_risks`.

### Acceptance Criteria
- TypeScript type‑checks with no errors.
- QA runner passes.
- Dashboard displays at‑risk topics with severity badges and actionable interventions.
