-- =============================================================================
-- FIX: source-side grade filtering was symmetric (grade-1..grade+1) — the
-- SAME narrow band used for the target grade was also applied to the
-- SOURCE curriculum, meaning a student's cumulative prior learning outside
-- that 3-grade window was invisible to matching. E.g. for an 8th grader,
-- only US grades 7-9 content could ever count as "already known" — a
-- grade-3 arithmetic concept the student obviously already has is never
-- considered, even though it's exactly the kind of prior knowledge that
-- should make an equivalent NCERT topic look "covered" rather than a gap.
--
-- Fix: split the grade window in two. `grade_min`/`grade_max` keep their
-- existing meaning (which TARGET-grade content is being assessed).
-- New `source_grade_min`/`source_grade_max` control the SOURCE side
-- independently and default to grade_min/grade_max when omitted (so any
-- existing caller that doesn't pass them gets the exact prior behavior —
-- fully backward compatible). The three edge functions are updated
-- alongside this migration to pass source_grade_min=1 (the floor) and
-- source_grade_max=grade+1, i.e. "everything the student has been taught
-- so far, plus a small lookahead buffer" — not just a 3-grade slice of it.
--
-- This also re-applies the statement_timeout bump from
-- 20260829000000_gap_rag_statement_timeout.sql, since adding a parameter
-- requires dropping and recreating the function (its old ALTER FUNCTION
-- setting would otherwise be silently lost).
-- =============================================================================

DROP FUNCTION IF EXISTS public.find_curriculum_gaps_rag(TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT, TEXT[]);

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
  source_grade_max        INT      DEFAULT NULL
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
      sn.name,
      1 - (se.embedding <=> t.embedding) AS sim
    FROM curriculum_nodes sn
    JOIN curriculum_embeddings se ON se.node_id = sn.id
    WHERE
      sn.curriculum_system = source_curriculum
      AND (
        (sn.grade_level_min = 0 AND sn.grade_level_max = 0)
        OR (sn.grade_level_min <= src_grade_max AND sn.grade_level_max >= src_grade_min)
      )
      AND (source_node_type IS NULL OR sn.node_type = source_node_type)
    ORDER BY se.embedding <=> t.embedding
    LIMIT 1
  ) best ON true
  ORDER BY COALESCE(best.sim, 0) ASC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_curriculum_gaps_rag(
  TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT, TEXT[], INT, INT
) TO authenticated;
