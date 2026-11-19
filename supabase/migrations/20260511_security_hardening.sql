-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Documents: Users can only see/edit their own documents
-- Idempotent: cloud projects bootstrapped from schema.sql already have these
-- policies; a bare CREATE POLICY fails there with SQLSTATE 42710.
DROP POLICY IF EXISTS "Users can manage their own documents" ON documents;
CREATE POLICY "Users can manage their own documents"
ON documents
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Document Chunks: Users can only see chunks for their own documents
-- We use a subquery to check the user_id of the parent document
DROP POLICY IF EXISTS "Users can access their own document chunks" ON document_chunks;
CREATE POLICY "Users can access their own document chunks"
ON document_chunks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = document_chunks.document_id 
    AND documents.user_id = auth.uid()
  )
);

-- Optimize the subquery with an index if not already present
CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks(document_id);

-- Harden user_progress
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own progress" ON user_progress;
CREATE POLICY "Users can manage their own progress"
ON user_progress
FOR ALL
TO authenticated
USING (auth.uid() = user_id);
