-- =============================================================================
-- UPDATE EMBEDDING DIMENSIONS: 2048 → 1536
-- Switching from nvidia/llama-nemotron-embed-vl-1b-v2:free (OpenRouter, 2048-dim)
-- to text-embedding-3-small (OpenAI, 1536-dim).
-- 1536 < 2000, so IVFFlat index can now be applied for fast ANN search.
-- IMPORTANT: Run this BEFORE re-running the embedding generation pipeline.
-- =============================================================================

-- 1. Drop any existing vector indexes on embedding column
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.curriculum_embeddings_embedding_idx;
DROP INDEX IF EXISTS public.idx_curriculum_embeddings_embedding;

-- 2. Drop the old search function that hard-codes vector(2048) in its signature
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_curriculum_semantic(
  vector(2048), FLOAT, INT, TEXT, INT, INT, TEXT
);

-- 3. Clear all existing embeddings (they were 2048-dim; incompatible with 1536)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE public.curriculum_embeddings;

-- 4. Change embedding column from vector(2048) to vector(1536)
-- -----------------------------------------------------------------------------
ALTER TABLE public.curriculum_embeddings
  ALTER COLUMN embedding TYPE vector(1536)
  USING embedding::text::vector(1536);

-- 5. Recreate search_curriculum_semantic with vector(1536) signature
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_curriculum_semantic(
  query_embedding   vector(1536),
  match_threshold   FLOAT   DEFAULT 0.7,
  match_count       INT     DEFAULT 10,
  filter_curriculum TEXT    DEFAULT NULL,
  filter_grade_min  INT     DEFAULT NULL,
  filter_grade_max  INT     DEFAULT NULL,
  filter_node_type  TEXT    DEFAULT NULL
)
RETURNS TABLE (
  node_id           UUID,
  node_name         TEXT,
  node_type         TEXT,
  curriculum_system TEXT,
  grade_level_min   INTEGER,
  grade_level_max   INTEGER,
  description       TEXT,
  metadata          JSONB,
  similarity        FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cn.id                                           AS node_id,
    cn.name                                         AS node_name,
    cn.node_type,
    cn.curriculum_system,
    cn.grade_level_min,
    cn.grade_level_max,
    cn.description,
    cn.metadata,
    1 - (ce.embedding <=> query_embedding)          AS similarity
  FROM curriculum_embeddings ce
  JOIN curriculum_nodes cn ON cn.id = ce.node_id
  WHERE
    1 - (ce.embedding <=> query_embedding) > match_threshold
    AND (filter_curriculum IS NULL OR cn.curriculum_system = filter_curriculum)
    AND (filter_grade_min  IS NULL OR cn.grade_level_max >= filter_grade_min)
    AND (filter_grade_max  IS NULL OR cn.grade_level_min <= filter_grade_max)
    AND (filter_node_type  IS NULL OR cn.node_type = filter_node_type)
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_curriculum_semantic(
  vector(1536), FLOAT, INT, TEXT, INT, INT, TEXT
) TO authenticated;

-- 6. NOTE: Create the IVFFlat index AFTER the embedding generation run is done.
--    Run this separately once all ~200k embeddings have been loaded:
--
--    CREATE INDEX curriculum_embeddings_embedding_idx
--    ON public.curriculum_embeddings
--    USING ivfflat (embedding vector_cosine_ops)
--    WITH (lists = 200);
--
--    This is now possible because 1536 < 2000 (pgvector IVFFlat dim limit).
-- =============================================================================
