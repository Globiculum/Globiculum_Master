-- =============================================================================
-- OPTIMIZE find_curriculum_gaps_rag
-- Adds optional source_node_type / target_node_type parameters so callers can
-- restrict the CROSS JOIN to chapter-level (topic) nodes only.
-- 221 NCERT topics × 204 CC standards = 45k ops vs 360k ops with subtopics.
-- =============================================================================

DROP FUNCTION IF EXISTS public.find_curriculum_gaps_rag(TEXT, TEXT, INT, INT, FLOAT, INT);

CREATE OR REPLACE FUNCTION public.find_curriculum_gaps_rag(
  source_curriculum     TEXT,
  target_curriculum     TEXT,
  grade_min             INT,
  grade_max             INT,
  similarity_threshold  FLOAT DEFAULT 0.65,
  result_limit          INT   DEFAULT 100,
  source_node_type      TEXT  DEFAULT 'topic',    -- 'topic' = NCERT chapters (rich embeddings)
  target_node_type_filter TEXT DEFAULT 'standard' -- 'standard' = CC standards
)
RETURNS TABLE (
  target_node_id       UUID,
  target_node_name     TEXT,
  target_node_type     TEXT,
  target_grade_min     INTEGER,
  target_grade_max     INTEGER,
  target_description   TEXT,
  target_metadata      JSONB,
  best_source_match    TEXT,
  best_similarity      FLOAT,
  gap_exists           BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
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
      AND (target_node_type_filter IS NULL OR cn.node_type = target_node_type_filter)
  ),
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
      AND (source_node_type IS NULL OR cn.node_type = source_node_type)
  ),
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
  ORDER BY COALESCE(bm.sim, 0) ASC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_curriculum_gaps_rag(
  TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT
) TO authenticated;
