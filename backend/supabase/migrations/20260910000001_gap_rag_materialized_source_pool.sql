-- =============================================================================
-- FIX: find_curriculum_gaps_rag times out for large-state subject pools
-- (confirmed live: Texas English ~6,930-row source pool, Texas Science
-- ~4,053-row source pool both hit the 20s statement_timeout even with the
-- subject_source_subjects filter from 20260908000000 applied. Texas Math
-- ~3,373 rows and Texas Social Studies both succeeded; California succeeded
-- on all 4 subjects, ~1,000-2,000 rows each).
--
-- ROOT CAUSE (confirmed via EXPLAIN on the live DB): the LATERAL subquery's
-- WHERE clause (curriculum_system + node_type + grade band + subject ILIKE)
-- is NOT selective enough for Postgres to use the ivfflat index on
-- curriculum_embeddings.embedding for the nearest-neighbor ORDER BY — it
-- instead does an Index Scan on idx_curriculum_nodes_rag_lookup to fetch the
-- filtered candidate rows, then a full in-memory Sort by vector distance.
-- That filter-then-sort work is currently repeated FROM SCRATCH for every
-- single target row (the LATERAL join re-evaluates it once per outer row) —
-- for ~127 NCERT English target rows against Texas's ~6,930-row English
-- pool, that's the index scan + JSONB ILIKE filter run 127 times before any
-- sorting even starts.
--
-- FIX: hoist the subject/grade/curriculum-filtered source pool into its own
-- CTE so Postgres computes it ONCE, then has each LATERAL invocation sort
-- that already-filtered, already-materialized set instead of re-scanning and
-- re-filtering the base tables per target row. This doesn't change the
-- result semantics (same filters, same ORDER BY, same LIMIT 1) — only how
-- many times the filtering work happens.
--
-- Both new params from 20260908000000 (source_subjects, source_subjects_exclude)
-- are preserved with identical semantics.
-- =============================================================================

DROP FUNCTION IF EXISTS public.find_curriculum_gaps_rag(TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT, TEXT[], INT, INT, TEXT[], TEXT[]);

CREATE OR REPLACE FUNCTION public.find_curriculum_gaps_rag(
  source_curriculum       TEXT,
  target_curriculum       TEXT,
  grade_min               INT,
  grade_max               INT,
  similarity_threshold    FLOAT    DEFAULT 0.65,
  result_limit            INT      DEFAULT 100,
  source_node_type        TEXT     DEFAULT 'topic',
  target_node_type_filter TEXT     DEFAULT 'standard',
  target_subjects         TEXT[]   DEFAULT NULL,
  source_grade_min        INT      DEFAULT NULL,
  source_grade_max        INT      DEFAULT NULL,
  source_subjects         TEXT[]   DEFAULT NULL,
  source_subjects_exclude TEXT[]   DEFAULT NULL
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
SET statement_timeout = '20s'
AS $$
DECLARE
  src_grade_min INT := COALESCE(source_grade_min, grade_min);
  src_grade_max INT := COALESCE(source_grade_max, grade_max);
BEGIN
  RETURN QUERY
  WITH filtered_target_nodes AS (
    SELECT
      cn.id, cn.name, cn.node_type, cn.grade_level_min, cn.grade_level_max,
      cn.description, cn.metadata, ce.embedding
    FROM curriculum_nodes cn
    JOIN curriculum_embeddings ce ON ce.node_id = cn.id
    WHERE
      cn.curriculum_system = target_curriculum
      AND (
        (cn.grade_level_min = 0 AND cn.grade_level_max = 0)
        OR (cn.grade_level_min <= grade_max AND cn.grade_level_max >= grade_min)
      )
      AND (target_node_type_filter IS NULL OR cn.node_type = target_node_type_filter)
      AND (
        target_subjects IS NULL
        OR LOWER(cn.metadata->>'subject') IN (SELECT LOWER(s) FROM unnest(target_subjects) s)
      )
  ),
  target_nodes AS (
    SELECT * FROM filtered_target_nodes
    UNION ALL
    SELECT
      cn.id, cn.name, cn.node_type, cn.grade_level_min, cn.grade_level_max,
      cn.description, cn.metadata, ce.embedding
    FROM curriculum_nodes cn
    JOIN curriculum_embeddings ce ON ce.node_id = cn.id
    WHERE
      target_subjects IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM filtered_target_nodes)
      AND cn.curriculum_system = target_curriculum
      AND (
        (cn.grade_level_min = 0 AND cn.grade_level_max = 0)
        OR (cn.grade_level_min <= grade_max AND cn.grade_level_max >= grade_min)
      )
      AND (target_node_type_filter IS NULL OR cn.node_type = target_node_type_filter)
  ),
  -- Computed ONCE regardless of how many target rows there are — this is
  -- the fix. MATERIALIZED forces Postgres to build this as a standalone
  -- temp result rather than potentially inlining it back into a per-row
  -- re-evaluation.
  source_pool AS MATERIALIZED (
    SELECT
      sn.id, sn.name, se.embedding
    FROM curriculum_nodes sn
    JOIN curriculum_embeddings se ON se.node_id = sn.id
    WHERE
      sn.curriculum_system = source_curriculum
      AND (
        (sn.grade_level_min = 0 AND sn.grade_level_max = 0)
        OR (sn.grade_level_min <= src_grade_max AND sn.grade_level_max >= src_grade_min)
      )
      AND (source_node_type IS NULL OR sn.node_type = source_node_type)
      AND (
        source_subjects IS NULL
        OR sn.metadata->>'subject' ILIKE ANY (source_subjects)
      )
      AND (
        source_subjects_exclude IS NULL
        OR NOT (sn.metadata->>'subject' ILIKE ANY (source_subjects_exclude))
      )
  )
  SELECT
    t.id,
    t.name,
    t.node_type,
    t.grade_level_min,
    t.grade_level_max,
    t.description,
    t.metadata,
    best.name                                             AS best_source_match,
    best.sim                                               AS best_similarity,
    (best.sim IS NULL OR best.sim < similarity_threshold)  AS gap_exists
  FROM target_nodes t
  LEFT JOIN LATERAL (
    SELECT
      sp.name,
      1 - (sp.embedding <=> t.embedding) AS sim
    FROM source_pool sp
    ORDER BY sp.embedding <=> t.embedding
    LIMIT 1
  ) best ON true
  ORDER BY COALESCE(best.sim, 0) ASC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_curriculum_gaps_rag(
  TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT, TEXT[], INT, INT, TEXT[], TEXT[]
) TO authenticated;
