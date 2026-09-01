-- =============================================================================
-- FIX 1: grade_level_min = grade_level_max = 0 currently means "invisible"
--
-- Verified against production data: 3.6%-14.2% of standards per curriculum
-- system carry grade_level_min = grade_level_max = 0 (e.g. 271 nodes in
-- us-common-core alone). The existing grade-overlap filter
-- (cn.grade_level_min <= grade_max AND cn.grade_level_max >= grade_min)
-- can never be satisfied by a 0-0 node for any real student grade, because
-- the caller-computed grade_min is always >= 1. Some of these are genuine
-- leaf-level standards that simply lost their grade tag during CSP
-- ingestion (e.g. a Kindergarten-phrasing Common Core item), not just
-- ungraded category headers -- so they were silently unreachable by every
-- gap query, for every student, forever.
--
-- Fix: treat 0-0 as "applies to every grade" instead of "applies to none".
--
-- FIX 2: add an optional target_subjects filter
--
-- Grade 11-12 NCERT data carries real per-node metadata.subject (and
-- metadata.stream: Arts/Commerce/Medical/Non Medical), but the retrieval
-- function had no way to use it -- a Commerce student's grade-11/12 target
-- pool mixed in Medical/Arts/Non-Medical nodes, competing for the same
-- "bottom 35% = gap" ranking slots ahead of the LIMIT cut, with only a soft
-- LLM prompt instruction (not a query filter) to sort it out downstream.
--
-- Fix: accept target_subjects TEXT[] (case-insensitive exact match against
-- metadata.subject). NULL/omitted preserves the exact prior behaviour --
-- fully backward compatible. If a subject filter is supplied but matches
-- ZERO target nodes (e.g. a subject-name mismatch between the frontend's
-- label and the DB's stored value), the function automatically falls back
-- to the unfiltered pool rather than silently returning an empty report --
-- a caller mismatch should degrade to "less precise", never to "broken".
-- =============================================================================

DROP FUNCTION IF EXISTS public.find_curriculum_gaps_rag(TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.find_curriculum_gaps_rag(
  source_curriculum       TEXT,
  target_curriculum       TEXT,
  grade_min               INT,
  grade_max               INT,
  similarity_threshold    FLOAT    DEFAULT 0.65,
  result_limit            INT      DEFAULT 100,
  source_node_type        TEXT     DEFAULT 'topic',
  target_node_type_filter TEXT     DEFAULT 'standard',
  target_subjects         TEXT[]   DEFAULT NULL
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
        OR (sn.grade_level_min <= grade_max AND sn.grade_level_max >= grade_min)
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
  TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT, TEXT[]
) TO authenticated;
