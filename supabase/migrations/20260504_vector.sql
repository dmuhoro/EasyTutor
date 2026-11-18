CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS embedding vector(384);

CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(384),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    content,
    1 - (embedding <=> query_embedding)
      AS similarity
  FROM document_chunks
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
