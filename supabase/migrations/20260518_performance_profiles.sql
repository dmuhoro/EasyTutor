CREATE TABLE IF NOT EXISTS public.performance_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

ALTER TABLE public.performance_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own performance profiles"
    ON public.performance_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own performance profiles"
    ON public.performance_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance profiles"
    ON public.performance_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
