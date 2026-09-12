-- Polymath mode (Phase C): arbitrary free-form learning identities + real RAG.
-- Added 2026-09-12.

-- 1. Learning goals: per-user journal of free-form ("learn anything") topics.
--    This is the stable learning identity for topics that have no curriculum
--    subject/topic row. Unique on (user_id, topic) so upserts are idempotent.
CREATE TABLE IF NOT EXISTS learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  topic TEXT NOT NULL,
  portal_type TEXT NOT NULL DEFAULT 'knowledge_explorer',
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS learning_goals_user_topic_idx
  ON learning_goals (user_id, topic);

ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view their own learning goals"
  ON learning_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can manage their own learning goals"
  ON learning_goals FOR ALL USING (auth.uid() = user_id);

-- 2. document_chunks: metadata + taxonomy scoping the governed retriever
--    requires (match_document_chunks filters on these). Embedding column was
--    added by 20260508_vector.sql; metadata jsonb is selected by the RPC.
--    Each chunk is self-owned (user_id) so governedWrites can stamp the owner
--    and RLS can scope retrieval to auth.uid() without a join.
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS portal_type TEXT NOT NULL DEFAULT 'high_school',
  ADD COLUMN IF NOT EXISTS taxonomy_scope TEXT,
  ADD COLUMN IF NOT EXISTS curriculum_scope TEXT,
  ADD COLUMN IF NOT EXISTS school_scope TEXT,
  ADD COLUMN IF NOT EXISTS vector_namespace TEXT;

-- documents parent row is written through governedWrite, which stamps
-- portal_type + updated_at as well as user_id.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS portal_type TEXT NOT NULL DEFAULT 'knowledge_explorer',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill self-ownership from the parent document (chunks created before
-- this migration inherit their document owner).
UPDATE document_chunks SET user_id = documents.user_id
  FROM documents
  WHERE document_chunks.document_id = documents.id
    AND document_chunks.user_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_chunks_user_id_not_null'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_chunks' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE document_chunks ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their own document chunks"
  ON document_chunks;
CREATE POLICY "Users can access their own document chunks"
  ON document_chunks FOR ALL
  USING (auth.uid() = user_id);

-- 3. Real, governable semantic matcher. Signature matches lib/retrieval.ts:
--    portal_type / taxonomy_scope / curriculum_scope / school_scope /
--    vector_namespace filters applied against document_chunks metadata.
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(384),
  match_count int DEFAULT 5,
  min_similarity float DEFAULT 0.0,
  portal_type text DEFAULT NULL,
  taxonomy_scope text DEFAULT NULL,
  curriculum_scope text DEFAULT NULL,
  school_scope text DEFAULT NULL,
  vector_namespace text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) >= min_similarity
    AND (portal_type IS NULL OR document_chunks.portal_type = portal_type)
    AND (vector_namespace IS NULL OR document_chunks.vector_namespace = vector_namespace)
    AND (taxonomy_scope IS NULL OR document_chunks.taxonomy_scope = taxonomy_scope)
    AND (curriculum_scope IS NULL OR document_chunks.curriculum_scope = curriculum_scope)
    AND (school_scope IS NULL OR document_chunks.school_scope = school_scope)
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;