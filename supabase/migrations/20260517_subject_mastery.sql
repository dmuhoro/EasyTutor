CREATE TABLE IF NOT EXISTS public.subject_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- RLS
ALTER TABLE public.subject_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own mastery"
    ON public.subject_mastery FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own mastery"
    ON public.subject_mastery FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own mastery"
    ON public.subject_mastery FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
