-- Fixed Supabase RPC Functions for Resume RAG System
-- Run these in your Supabase SQL Editor to fix parameter order issues

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS match_resume_chunks;

-- Recreate function with correct parameter names based on error message
CREATE OR REPLACE FUNCTION match_resume_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.0,
  filter_doc_id text DEFAULT NULL
)
RETURNS TABLE (
  chunk_id text,
  doc_id text,
  section text,
  idx integer,
  split integer,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.chunk_id,
    rc.doc_id,
    rc.section,
    rc.idx,
    rc.split,
    rc.content,
    rc.metadata,
    (1 - (rc.embedding <=> query_embedding)) AS similarity
  FROM resume_chunks rc
  WHERE 
    (filter_doc_id IS NULL OR rc.doc_id = filter_doc_id)
    AND (1 - (rc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION match_resume_chunks TO anon, authenticated, service_role;

-- Test function with dummy data
-- SELECT * FROM match_resume_chunks(
--   query_embedding := ARRAY[0.1, 0.2, 0.3]::vector(1536),
--   match_count := 5,
--   match_threshold := 0.0,
--   filter_doc_id := NULL
-- );