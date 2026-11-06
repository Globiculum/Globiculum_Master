-- =============================================================================
-- Adds source_subjects + source_subjects_exclude to find_curriculum_gaps_rag,
-- on top of the currently-live 11-param signature (source_grade_min/max from
-- 20260829010000 confirmed live; target_subjects from 20260828000000 confirmed
-- live; the earlier 20260907000000_gap_rag_source_subjects.sql that first
-- introduced source_subjects was NEVER applied — this migration supersedes it
-- and adds the exclude list it was missing).
--
-- WHY: architecture change — US students whose curriculum is "Regular U.S.
-- school curriculum" now use their OWN STATE's standards as the PRIMARY
-- source for Math, English, Science, AND Social Studies (not just Social
-- Studies layered on top of Common Core/NGSS as before). A whole state pool
-- is too large to scan per target row (California's 17,262 in-range nodes
-- time out at 20s), so each subject is queried separately, scoped to its own
-- slice of that state's data (measured: 800-6,500 nodes per subject, same
-- scale as us-common-core's 3,279, which runs in ~2s).
--
-- source_subjects_exclude is new: a bare 'source_subjects ILIKE %science%'
-- pattern also matches "History-Social Science" (California's own subject
-- name), the same substring collision already fixed once for
-- canonicalSubjectDomain(). Rather than rely on prefix-anchoring surviving
-- every state's naming convention, the science query explicitly excludes
-- anything matching the social-studies patterns.
--
-- Both new params default to NULL — fully backward compatible with every
-- existing caller.
-- =============================================================================

DROP FUNCTION IF EXISTS public.find_curriculum_gaps_rag(TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT, TEXT[], INT, INT);

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
      AND (
        source_subjects IS NULL
        OR sn.metadata->>'subject' ILIKE ANY (source_subjects)
      )
      AND (
        source_subjects_exclude IS NULL
        OR NOT (sn.metadata->>'subject' ILIKE ANY (source_subjects_exclude))
      )
    ORDER BY se.embedding <=> t.embedding
    LIMIT 1
  ) best ON true
  ORDER BY COALESCE(best.sim, 0) ASC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_curriculum_gaps_rag(
  TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT, TEXT[], INT, INT, TEXT[], TEXT[]
) TO authenticated;
