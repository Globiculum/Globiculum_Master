-- =============================================================================
-- UPDATE EMBEDDING DIMENSIONS: 1536 → 2048
-- Switches to nvidia/llama-nemotron-embed-vl-1b-v2 (free on OpenRouter)
-- which outputs 2048-dimensional vectors.
-- Run AFTER curriculum_embeddings is empty (safe since no embeddings exist yet).
-- =============================================================================

-- 1. Drop existing IVFFlat index on embedding column (must be dropped before ALTER)
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.curriculum_embeddings_embedding_idx;
DROP INDEX IF EXISTS public.idx_curriculum_embeddings_embedding;

-- 2. Truncate existing embeddings (empty anyway, but ensures clean ALTER)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE public.curriculum_embeddings;

-- 3. Change vector column from 1536 to 2048 dimensions
-- -----------------------------------------------------------------------------
ALTER TABLE public.curriculum_embeddings
  ALTER COLUMN embedding TYPE vector(2048);

-- 4. Recreate search_curriculum_semantic with vector(2048)
--     (Note: pgvector IVFFlat/HNSW indexes are limited to 2000 dimensions, so we
--     cannot index vector(2048). With only ~10k rows, sequential scans are fast enough.)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_curriculum_semantic(
  vector(1536), FLOAT, INT, TEXT, INT, INT, TEXT
);

CREATE OR REPLACE FUNCTION public.search_curriculum_semantic(
  query_embedding  vector(2048),
  match_threshold  FLOAT   DEFAULT 0.7,
  match_count      INT     DEFAULT 10,
  filter_curriculum TEXT   DEFAULT NULL,
  filter_grade_min  INT   DEFAULT NULL,
  filter_grade_max  INT   DEFAULT NULL,
  filter_node_type  TEXT  DEFAULT NULL
)
RETURNS TABLE (
  node_id          UUID,
  node_name        TEXT,
  node_type        TEXT,
  curriculum_system TEXT,
  grade_level_min  INTEGER,
  grade_level_max  INTEGER,
  description      TEXT,
  metadata         JSONB,
  similarity       FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cn.id                                            AS node_id,
    cn.name                                          AS node_name,
    cn.node_type,
    cn.curriculum_system,
    cn.grade_level_min,
    cn.grade_level_max,
    cn.description,
    cn.metadata,
    1 - (ce.embedding <=> query_embedding)           AS similarity
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

-- 7. Grant execute on updated function
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.search_curriculum_semantic(
  vector(2048), FLOAT, INT, TEXT, INT, INT, TEXT
) TO authenticated;
