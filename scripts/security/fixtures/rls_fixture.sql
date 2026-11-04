-- ============================================================================
-- STRUCTURAL TEST FIXTURE — NOT PRODUCT DDL.
-- Regenerated from the committed CREATE TABLE statements so the RLS hardening
-- migration can be proven on a throwaway Postgres container without requiring
-- the pgvector extension (embedding -> text) or the Supabase image.
-- Only table structure is reproduced; no policies, grants, or production data.
-- ============================================================================

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  icon TEXT,
  level TEXT NOT NULL CHECK (level IN ('high_school', 'university', 'self_directed')),
  description TEXT,
  kicd_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtopics JSONB,
  form_level TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.cached_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  response_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 1,
  date TIMESTAMPTZ DEFAULT now(),
  ai_generated BOOLEAN DEFAULT false,
  question_text TEXT,
  options TEXT[],
  correct_index INTEGER,
  explanation TEXT,
  portal_type TEXT NOT NULL DEFAULT 'high_school',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id),
  attempts INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  mastery_level INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT now(),
  portal_type TEXT NOT NULL DEFAULT 'high_school',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  learning_mode TEXT CHECK (learning_mode IN ('high_school', 'university', 'self_directed')),
  onboarding_complete BOOLEAN DEFAULT FALSE,
  xp_total INTEGER DEFAULT 0, -- Task 2.1
  current_streak INTEGER DEFAULT 1, -- Task 2.2
  last_active_date DATE DEFAULT CURRENT_DATE, -- Task 2.2
  streak_freezes INTEGER DEFAULT 1, -- Task 2.2
  created_at TIMESTAMPTZ DEFAULT now()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.cached_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  roadmap_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id),
  learning_mode TEXT,
  checked_tasks JSONB DEFAULT '{}',
  last_opened_at TIMESTAMPTZ,
  completion_status TEXT CHECK (completion_status IN ('not_started', 'in_progress', 'completed')),
  portal_type TEXT NOT NULL DEFAULT 'high_school',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.user_topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'mastered')),
  attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  last_attempted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('roadmap', 'quiz')),
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  feedback_text TEXT,
  topic TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('bad', 'okay', 'good', 'positive', 'negative')),
  comment TEXT,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  portal_type TEXT NOT NULL DEFAULT 'high_school',
  chunk_text TEXT NOT NULL,
  source TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id),
  topic_id UUID REFERENCES topics(id),
  curriculum_scope TEXT,
  school_scope TEXT,
  department_scope TEXT,
  subject_scope TEXT,
  knowledge_domain_scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  topic TEXT NOT NULL,
  portal_type TEXT NOT NULL DEFAULT 'knowledge_explorer',
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  portal_type TEXT NOT NULL DEFAULT 'knowledge_explorer',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- from schema.sql
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT,
  embedding text,
  metadata JSONB NOT NULL DEFAULT '{}',
  portal_type TEXT NOT NULL DEFAULT 'high_school',
  taxonomy_scope TEXT,
  curriculum_scope TEXT,
  school_scope TEXT,
  vector_namespace TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- from migrations/20260506_habit_system.sql
CREATE TABLE IF NOT EXISTS public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- from migrations/20260524_analytics_observability.sql
CREATE TABLE IF NOT EXISTS public.ai_call_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature       TEXT NOT NULL,                        -- 'explanation' | 'quiz' | 'roadmap' | 'other'
  provider      TEXT NOT NULL,                        -- 'hosted_claude' | 'hosted_groq' | 'local_ollama' | 'cache' | 'placeholder'
  model         TEXT,                                 -- Specific model ID (e.g. 'claude-3-5-sonnet')
  portal        TEXT,                                 -- 'high_school' | 'university' | 'self_directed'
  success       BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms    INTEGER,
  attempts_used INTEGER,
  estimated_cost_usd NUMERIC(10, 8) DEFAULT 0,
  error_code    TEXT,                                 -- Specific error code (e.g. 'TIMEOUT', 'VALIDATION_FAILED')
  error_message TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- from migrations/20260527_ai_literacy_units.sql
CREATE TABLE IF NOT EXISTS public.ai_literacy_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz JSONB NOT NULL DEFAULT '[]'::jsonb,
  portal_type TEXT NOT NULL DEFAULT 'ai_literacy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- from migrations/20260527_ai_literacy_units.sql
CREATE TABLE IF NOT EXISTS public.ai_literacy_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_number INTEGER NOT NULL,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  portal_type TEXT NOT NULL DEFAULT 'ai_literacy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_unit INTEGER,
  last_section INTEGER,
  last_opened_at TIMESTAMPTZ,
  UNIQUE(user_id, unit_number)
);

-- from migrations/20260531_practice_sessions.sql
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'all')),
    score NUMERIC NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- from migrations/20260531_question_bank.sql
CREATE TABLE IF NOT EXISTS public.question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- from migrations/20260531_subject_mastery.sql
CREATE TABLE IF NOT EXISTS public.subject_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_answers INTEGER NOT NULL DEFAULT 0,
    mastery_percent NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, subject, topic)
);

-- from migrations/20260603_learning_recommendations.sql
CREATE TABLE IF NOT EXISTS public.learning_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    recommendation_key TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    reason TEXT NOT NULL,
    action_label TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    confidence_score NUMERIC NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, recommendation_key)
);

-- from migrations/20260603_performance_profiles.sql
CREATE TABLE IF NOT EXISTS public.performance_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    session_count INTEGER NOT NULL DEFAULT 0,
    total_questions_answered INTEGER NOT NULL DEFAULT 0,
    total_correct_answers INTEGER NOT NULL DEFAULT 0,
    average_response_time_ms INTEGER NOT NULL DEFAULT 0,
    fastest_response_time_ms INTEGER NOT NULL DEFAULT 0,
    slowest_response_time_ms INTEGER NOT NULL DEFAULT 0,
    accuracy_score NUMERIC NOT NULL DEFAULT 0,
    confidence_score NUMERIC NOT NULL DEFAULT 0,
    fluency_score NUMERIC NOT NULL DEFAULT 0,
    fluency_level TEXT NOT NULL DEFAULT 'Emerging',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, subject, topic)
);

-- from migrations/20260604_learning_trend_snapshots.sql
CREATE TABLE IF NOT EXISTS public.learning_trend_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    accuracy_score NUMERIC NOT NULL DEFAULT 0,
    confidence_score NUMERIC NOT NULL DEFAULT 0,
    fluency_score NUMERIC NOT NULL DEFAULT 0,
    fluency_level TEXT NOT NULL DEFAULT 'Emerging',
    average_response_time_ms INTEGER NOT NULL DEFAULT 0,
    fastest_response_time_ms INTEGER NOT NULL DEFAULT 0,
    slowest_response_time_ms INTEGER NOT NULL DEFAULT 0,
    response_speed_score NUMERIC NOT NULL DEFAULT 0,
    session_completed BOOLEAN NOT NULL DEFAULT TRUE,
    session_count INTEGER NOT NULL DEFAULT 0,
    total_questions_answered INTEGER NOT NULL DEFAULT 0,
    total_correct_answers INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- from migrations/20260606_learning_identity_graph.sql
CREATE TABLE IF NOT EXISTS public.learning_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learner_type TEXT NOT NULL CHECK (learner_type IN ('secondary', 'university', 'self_directed', 'professional', 'researcher')),
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_learning_style TEXT NOT NULL CHECK (preferred_learning_style IN ('visual', 'auditory', 'kinesthetic', 'text')),
  target_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- from migrations/20260606_learning_identity_graph.sql
CREATE TABLE IF NOT EXISTS public.knowledge_nodes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty_level INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('domain', 'subject', 'topic', 'concept')),
  prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_mastery_time_mins INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- from migrations/20260606_learning_identity_graph.sql
CREATE TABLE IF NOT EXISTS public.knowledge_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_goal TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb, -- Ordered list of node IDs
  current_node_id TEXT REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- from migrations/20260606_learning_interventions.sql
CREATE TABLE IF NOT EXISTS public.learning_interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  "topicId" text not null,
  "subjectId" text not null,
  type text not null check (type in (
    'review_topic',
    'active_recall',
    'spaced_repetition',
    'teach_back',
    'confidence_rebuild',
    'practice_questions',
    'mixed_topic_reinforcement',
    'targeted_remediation'
  )),
  "priorityScore" numeric not null default 0 check ("priorityScore" >= 0 and "priorityScore" <= 100),
  plan text not null default '',
  "expectedOutcome" text not null default '',
  "estimatedImprovement" numeric not null default 0,
  rationale text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- from migrations/20260606_learning_plans.sql
CREATE TABLE IF NOT EXISTS public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  "generatedAt" timestamp with time zone not null default now(),
  -- Store the full plan as JSONB for flexibility
  "weeklyPlan" jsonb not null default '{}',
  "studyPriorities" jsonb not null default '[]',
  "recoveryPlan" jsonb,
  "reinforcementPlan" jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- from migrations/20260606_learning_risk_predictions.sql
CREATE TABLE IF NOT EXISTS public.learning_risk_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  "topicId" text not null,
  "subjectId" text not null,
  "riskScore" numeric not null default 0 check ("riskScore" >= 0 and "riskScore" <= 100),
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 100),
  reason text not null default '',
  intervention text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- from migrations/20260607_learning_coach_reports.sql
CREATE TABLE IF NOT EXISTS public.learning_coach_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  coaching_summary TEXT NOT NULL,
  learner_state TEXT NOT NULL DEFAULT 'unknown',
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  root_causes JSONB NOT NULL DEFAULT '[]'::jsonb,
  opportunities TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  risks TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  recommendations TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  next_actions TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  learning_health_trajectory TEXT NOT NULL CHECK (learning_health_trajectory IN ('improving', 'stable', 'declining', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, analysis_date)
);

-- from migrations/20260701_adaptive_learning_paths.sql
CREATE TABLE IF NOT EXISTS public.adaptive_learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  current_position jsonb not null,
  destination jsonb not null,
  recommended_path jsonb not null,
  recovery_path jsonb,
  acceleration_path jsonb,
  skippable_nodes jsonb,
  prerequisite_gaps jsonb,
  estimated_completion timestamp,
  confidence double precision,
  explanation text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- from migrations/20260701_learning_retention_profiles.sql
CREATE TABLE IF NOT EXISTS public.learning_retention_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  subject_id text not null,
  topic_id text not null,
  subtopic_id text,
  level text not null check (level in ('subject','topic','subtopic')),
  last_reviewed_at timestamp with time zone not null default now(),
  review_count integer not null default 0,
  retention_score numeric not null default 100,
  forgetting_risk numeric not null default 0,
  next_review_date timestamp with time zone not null default now(),
  review_stage integer not null default 1,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- from migrations/20261102_learning_evidence.sql
CREATE TABLE IF NOT EXISTS public.learning_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_event_id text not null,
  skill_id text not null,
  activity_id text not null,
  item_id text,
  item_version integer not null default 1,
  dimension text not null check (dimension in ('recall','understanding','application','analysis','reasoning','evaluation','creation','transfer','retention')),
  response text,
  score numeric(5,4) not null check (score >= 0 and score <= 1),
  independent boolean not null default false,
  hints integer not null default 0 check (hints >= 0),
  provenance text not null default 'learner_action',
  validation_status text not null default 'validated' check (validation_status in ('validated','provisional','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_event_id)
);

-- End structural fixture.
