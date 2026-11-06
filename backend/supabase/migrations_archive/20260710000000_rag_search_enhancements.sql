-- =============================================================================
-- RAG SEARCH ENHANCEMENTS
-- Adds missing indexes + replaces search_curriculum_semantic with a full-detail
-- version + adds a dedicated RAG gap-finding function.
-- =============================================================================

-- 1. GIN index on curriculum_nodes.metadata
--    Needed for fast metadata->>source_id deduplication queries during ingestion
--    and for subject/stream/chapter filtering during RAG retrieval.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_metadata_gin
  ON public.curriculum_nodes
  USING GIN (metadata jsonb_path_ops);

-- 2. Composite index for the most common RAG query pattern:
--    curriculum_system + grade range + node_type
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_rag_lookup
  ON public.curriculum_nodes (curriculum_system, grade_level_min, grade_level_max, node_type);

-- 3. Index on metadata source_id for fast deduplication lookups
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_source_id
  ON public.curriculum_nodes ((metadata->>'source_id'));


-- =============================================================================
-- 4. Replace search_curriculum_semantic with full-detail version
--    Original only returned: node_id, node_name, node_type, curriculum_system, similarity
--    RAG needs: + description, grade_level_min/max, metadata (for url, subject, chapter, etc.)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.search_curriculum_semantic(
  query_embedding  vector(1536),
  match_threshold  FLOAT   DEFAULT 0.7,
  match_count      INT     DEFAULT 10,
  filter_curriculum TEXT   DEFAULT NULL,  -- e.g. 'ncert-cbse' or 'us-common-core'
  filter_grade_min  INT   DEFAULT NULL,
  filter_grade_max  INT   DEFAULT NULL,
  filter_node_type  TEXT  DEFAULT NULL    -- 'topic', 'learning_outcome', 'standard'
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


-- =============================================================================
-- 5. RAG gap-finding function
--    Given a target curriculum (NCERT) and a grade band, returns all nodes
--    ordered by their minimum distance to any node in the source curriculum.
--    Used by the Python RAG backend to find gaps between curricula.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.find_curriculum_gaps_rag(
  source_curriculum   TEXT,    -- e.g. 'us-common-core'
  target_curriculum   TEXT,    -- e.g. 'ncert-cbse'
  grade_min           INT,
  grade_max           INT,
  similarity_threshold FLOAT DEFAULT 0.65,
  result_limit        INT   DEFAULT 100
)
RETURNS TABLE (
  target_node_id       UUID,
  target_node_name     TEXT,
  target_node_type     TEXT,
  target_grade_min     INTEGER,
  target_grade_max     INTEGER,
  target_description   TEXT,
  target_metadata      JSONB,
  best_source_match    TEXT,    -- name of the closest source node
  best_similarity      FLOAT,   -- cosine similarity (0–1); NULL = no match found
  gap_exists           BOOLEAN  -- true when best_similarity < threshold
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- All target curriculum nodes in the grade band (with embeddings)
  target_nodes AS (
    SELECT
      cn.id,
      cn.name,
      cn.node_type,
      cn.grade_level_min,
      cn.grade_level_max,
      cn.description,
      cn.metadata,
      ce.embedding
    FROM curriculum_nodes cn
    JOIN curriculum_embeddings ce ON ce.node_id = cn.id
    WHERE
      cn.curriculum_system = target_curriculum
      AND cn.grade_level_min <= grade_max
      AND cn.grade_level_max >= grade_min
  ),
  -- All source curriculum nodes in the grade band (with embeddings)
  source_nodes AS (
    SELECT
      cn.id,
      cn.name,
      ce.embedding
    FROM curriculum_nodes cn
    JOIN curriculum_embeddings ce ON ce.node_id = cn.id
    WHERE
      cn.curriculum_system = source_curriculum
      AND cn.grade_level_min <= grade_max
      AND cn.grade_level_max >= grade_min
  ),
  -- For each target node, find the single best-matching source node
  best_matches AS (
    SELECT DISTINCT ON (t.id)
      t.id             AS target_id,
      s.name           AS source_name,
      1 - (t.embedding <=> s.embedding) AS sim
    FROM target_nodes t
    CROSS JOIN source_nodes s
    ORDER BY t.id, (t.embedding <=> s.embedding)
  )
  SELECT
    t.id,
    t.name,
    t.node_type,
    t.grade_level_min,
    t.grade_level_max,
    t.description,
    t.metadata,
    bm.source_name                                        AS best_source_match,
    bm.sim                                                AS best_similarity,
    (bm.sim IS NULL OR bm.sim < similarity_threshold)     AS gap_exists
  FROM target_nodes t
  LEFT JOIN best_matches bm ON bm.target_id = t.id
  ORDER BY COALESCE(bm.sim, 0) ASC   -- gaps (low sim) first
  LIMIT result_limit;
END;
$$;


-- =============================================================================
-- 6. Grant execute on new functions to authenticated users
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.search_curriculum_semantic(
  vector(1536), FLOAT, INT, TEXT, INT, INT, TEXT
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.find_curriculum_gaps_rag(
  TEXT, TEXT, INT, INT, FLOAT, INT
) TO authenticated;
