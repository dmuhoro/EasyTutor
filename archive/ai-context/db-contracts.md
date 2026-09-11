# Database Contracts: EasyTutor

## Core Tables & Schema

### `profiles`
- **id:** UUID (PK, references auth.users).
- **email:** TEXT (NOT NULL).
- **learning_mode:** TEXT (CHECK: 'high_school', 'university', 'self_directed').
- **onboarding_complete:** BOOLEAN (DEFAULT FALSE).
- **level:** INTEGER (DEFAULT 1).
- **xp_total:** INTEGER (DEFAULT 0).
- **current_streak:** INTEGER (DEFAULT 1).
- **last_active_date:** DATE (DEFAULT CURRENT_DATE).
- **streak_freezes:** INTEGER (DEFAULT 1).
- **RLS:** Users can only view/update their own profile.

### `subjects`
- **id:** TEXT (PK, default UUID string).
- **name:** TEXT (NOT NULL).
- **level:** TEXT (NOT NULL, CHECK: 'high_school', 'university', 'self_directed').
- **icon:** TEXT.
- **description:** TEXT.
- **kicd_ref:** TEXT (for High School portal).
- **UNIQUE:** (name, level) - enables idempotent upserts.
- **RLS:** Publicly readable.

### `topics`
- **id:** UUID (PK).
- **subject_id:** TEXT (FK references subjects.id).
- **title:** TEXT (NOT NULL).
- **subtopics:** JSONB.
- **form_level:** TEXT (e.g., 'Form 1').
- **sort_order:** INTEGER.
- **UNIQUE:** (subject_id, title) - enables idempotent upserts.
- **RLS:** Publicly readable.

### `user_progress`
- **id:** UUID (PK).
- **user_id:** UUID (FK references profiles.id).
- **topic_id:** UUID (FK references topics.id).
- **mastery_level:** INTEGER (0-100).
- **attempts:** INTEGER.
- **correct_answers:** INTEGER.
- **last_activity:** TIMESTAMPTZ.
- **RLS:** Users can only access their own progress data.

### `user_events` (AI Interactions & Tracking)
- **id:** UUID (PK).
- **user_id:** UUID (FK references profiles.id).
- **event_type:** TEXT.
- **payload:** JSONB.
- **created_at:** TIMESTAMPTZ.

### `performance_profiles`
- **id:** UUID (PK).
- **user_id:** UUID (FK references auth.users.id).
- **subject:** TEXT.
- **topic:** TEXT.
- **session_count:** INTEGER.
- **total_questions_answered:** INTEGER.
- **total_correct_answers:** INTEGER.
- **average_response_time_ms:** INTEGER.
- **fastest_response_time_ms:** INTEGER.
- **slowest_response_time_ms:** INTEGER.
- **accuracy_score:** NUMERIC.
- **confidence_score:** NUMERIC.
- **fluency_score:** NUMERIC.
- **fluency_level:** TEXT.
- **updated_at:** TIMESTAMPTZ.
- **RLS:** Users can only read and write their own performance profile rows.

### `learning_recommendations`
- **id:** UUID (PK).
- **user_id:** UUID (FK references auth.users.id).
- **recommendation_key:** TEXT.
- **subject:** TEXT.
- **topic:** TEXT.
- **title:** TEXT.
- **reason:** TEXT.
- **action_label:** TEXT.
- **recommendation_type:** TEXT.
- **priority:** INTEGER.
- **confidence_score:** NUMERIC.
- **metadata:** JSONB.
- **updated_at:** TIMESTAMPTZ.
- **RLS:** Users can only read and write their own recommendations.

### `learning_trend_snapshots`
- **id:** UUID (PK).
- **user_id:** UUID (FK references auth.users.id).
- **subject:** TEXT.
- **topic:** TEXT.
- **accuracy_score:** NUMERIC.
- **confidence_score:** NUMERIC.
- **fluency_score:** NUMERIC.
- **fluency_level:** TEXT.
- **average_response_time_ms:** INTEGER.
- **fastest_response_time_ms:** INTEGER.
- **slowest_response_time_ms:** INTEGER.
- **response_speed_score:** NUMERIC.
- **session_completed:** BOOLEAN.
- **session_count:** INTEGER.
- **total_questions_answered:** INTEGER.
- **total_correct_answers:** INTEGER.
- **completed_at:** TIMESTAMPTZ.
- **created_at:** TIMESTAMPTZ.
- **Indexes:** `(user_id, completed_at DESC)` and `(user_id, subject, topic)` for time-window trend queries and topic-level history lookups.
- **RLS:** Users can only insert and read their own trend snapshots.

### `learning_retention_profiles` (Sprint 4)
- **id:** UUID (PK).
- **user_id:** UUID (FK references auth.users.id).
- **subject_id:** TEXT.
- **topic_id:** TEXT.
- **subtopic_id:** TEXT.
- **level:** TEXT.
- **last_reviewed_at:** TIMESTAMPTZ.
- **review_count:** INTEGER.
- **retention_score:** NUMERIC.
- **forgetting_risk:** NUMERIC.
- **next_review_date:** TIMESTAMPTZ.
- **review_stage:** INTEGER.
- **RLS:** Users can only CRUD own retention profiles.

### `learning_risk_predictions` (Sprint 4)
- **id:** UUID (PK).
- **user_id:** UUID (FK references auth.users.id).
- **topicId:** TEXT.
- **subjectId:** TEXT.
- **riskScore:** NUMERIC (0-100).
- **severity:** TEXT ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').
- **confidence:** NUMERIC (0-100).
- **reason:** TEXT.
- **intervention:** TEXT.
- **RLS:** Users can only CRUD own risk predictions.

### `learning_interventions` (Sprint 4)
- **id:** UUID (PK).
- **user_id:** UUID (FK references auth.users.id).
- **topicId:** TEXT.
- **subjectId:** TEXT.
- **type:** TEXT (InterventionType).
- **priorityScore:** NUMERIC (0-100).
- **plan:** TEXT.
- **expectedOutcome:** TEXT.
- **estimatedImprovement:** NUMERIC.
- **rationale:** TEXT.
- **RLS:** Users can only CRUD own interventions.

### `learning_plans` (Sprint 4)
- **id:** UUID (PK).
- **user_id:** UUID (FK references auth.users.id).
- **generatedAt:** TIMESTAMPTZ.
- **weeklyPlan:** JSONB.
- **studyPriorities:** JSONB.
- **recoveryPlan:** JSONB.
- **reinforcementPlan:** JSONB.
- **RLS:** Users can only CRUD own learning plans.

### `documents` & `document_chunks` (RAG)
- **documents:** Store title, user_id, and metadata.
- **document_chunks:** Store content and `embedding` (vector(384)).
- **RPC:** `match_document_chunks` for cosine similarity search.

## Invariants & Rules
1. **Deterministic IDs:** Subject IDs must be resolved using name + level hashes if not explicitly provided, ensuring portal consistency.
2. **Cascading Deletes:** Subjects → Topics → Progress must use `ON DELETE CASCADE`.
3. **Audit Trail:** All meaningful AI generations should be logged in `user_events`.
4. **Vector Consistency:** Embeddings must be 384-dimensional to match the local `qwen2.5-coder:1.5b` output.
