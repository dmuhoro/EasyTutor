-- ADR-009: FTS-first retrieval for private imports, no embedding required.
-- Forward-only. Adds a generated tsvector + GIN index and a ranked RPC that
-- is explicitly scoped to auth.uid(). Also keeps the vector RPC usable for
-- private imports when an embedding model is enabled.

ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS document_chunks_content_tsv_idx
  ON document_chunks USING gin (content_tsv);

-- Ranked full-text search. SECURITY INVOKER + RLS + explicit auth.uid() filter:
-- a caller can only ever read their own chunks through this function.
CREATE OR REPLACE FUNCTION public.search_document_chunks_fts(
  query_text text,
  portal_type_filter text DEFAULT NULL,
  taxonomy_scope_filter text DEFAULT NULL,
  curriculum_scope_filter text DEFAULT NULL,
  school_scope_filter text DEFAULT NULL,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  rank real
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    dc.id,
    dc.content,
    dc.metadata,
    ts_rank(dc.content_tsv, plainto_tsquery('english', query_text))::real AS rank
  FROM public.document_chunks dc
  WHERE dc.user_id = auth.uid()
    AND dc.content_tsv @@ plainto_tsquery('english', query_text)
    AND (portal_type_filter IS NULL OR dc.portal_type = portal_type_filter)
    AND (taxonomy_scope_filter IS NULL OR dc.taxonomy_scope = taxonomy_scope_filter)
    -- USER_PRIVATE import chunks remain visible to their owner even when the
    -- learner is currently in a curriculum portal with a different label.
    AND (
      curriculum_scope_filter IS NULL
      OR dc.curriculum_scope = curriculum_scope_filter
      OR dc.curriculum_scope = 'USER_PRIVATE'
    )
    AND (school_scope_filter IS NULL OR dc.school_scope = school_scope_filter)
  ORDER BY rank DESC, dc.id
  LIMIT greatest(1, least(match_count, 50));
$$;

REVOKE ALL ON FUNCTION public.search_document_chunks_fts(text, text, text, text, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_document_chunks_fts(text, text, text, text, text, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_document_chunks_fts(text, text, text, text, text, int) TO authenticated;

-- Keep the existing 8-arg vector RPC signature but make it private-aware:
-- explicit owner filter, and USER_PRIVATE imports visible to their owner.
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
  WHERE document_chunks.user_id = auth.uid()
    AND 1 - (document_chunks.embedding <=> query_embedding) >= min_similarity
    AND (portal_type IS NULL OR document_chunks.portal_type = portal_type)
    AND (vector_namespace IS NULL OR document_chunks.vector_namespace = vector_namespace)
    AND (taxonomy_scope IS NULL OR document_chunks.taxonomy_scope = taxonomy_scope)
    AND (
      curriculum_scope IS NULL
      OR document_chunks.curriculum_scope = curriculum_scope
      OR document_chunks.curriculum_scope = 'USER_PRIVATE'
    )
    AND (school_scope IS NULL OR document_chunks.school_scope = school_scope)
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;
