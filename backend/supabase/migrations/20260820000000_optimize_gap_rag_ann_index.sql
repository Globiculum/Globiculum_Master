-- =============================================================================
-- OPTIMIZE find_curriculum_gaps_rag FOR LARGE-SCALE US STATE DATA
--
-- Context: ingesting all 50 states + DC + Common Core + NGSS directly from the
-- Common Standards Project API produces far more nodes per curriculum_system
-- than the old Excel-sourced datasets (e.g. Alabama alone: ~27k nodes vs. the
-- previous entire US dataset of ~1.6k). find_curriculum_gaps_rag currently does
-- a brute-force CROSS JOIN between ALL target nodes and ALL source nodes in a
-- grade band, computing a vector distance for every pair — for a single grade
-- 7-9 query against Alabama that's ~221 (NCERT topics) x 12,822 (Alabama
-- nodes) = ~2.8M pairwise comparisons per request, versus the ~45k pairs the
-- prior optimize_gap_function migration (20260713000001) was written to fix.
--
-- Fix: for each target node, use a LATERAL join with `ORDER BY embedding <=>
-- ... LIMIT 1` instead of a full cross join + global sort. With an ANN index
-- on curriculum_embeddings.embedding, Postgres can answer that per-row
-- nearest-neighbor lookup in ~O(log n) instead of O(n), turning the overall
-- query into O(target_count * log(source_count)) instead of
-- O(target_count * source_count).
--
-- IMPORTANT — run this ONLY after all embeddings have been generated for the
-- curricula you intend to query (ingest_us_api.py + generate_embeddings.py).
-- Creating the index on a mostly-empty table wastes the `lists` tuning below;
-- if you re-run this after ingesting significantly more/fewer rows, DROP and
-- recreate the index with `lists` re-tuned to ~sqrt(row_count).
-- =============================================================================

-- 1. ANN index on curriculum_embeddings.embedding (1536-dim, under pgvector's
--    2000-dim IVFFlat limit — this was not possible at 2048 dims).
--    `lists` should be roughly sqrt(N) where N = total embedding rows. Adjust
--    this number based on the actual row count after ingestion completes —
--    this default targets a dataset in the several-hundred-thousand range.
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.curriculum_embeddings_embedding_idx;

CREATE INDEX curriculum_embeddings_embedding_idx
  ON public.curriculum_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 1000);

-- 2. Rewrite find_curriculum_gaps_rag to use a LATERAL nearest-neighbor lookup
--    per target node instead of a CROSS JOIN + global sort.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.find_curriculum_gaps_rag(TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.find_curriculum_gaps_rag(
  source_curriculum       TEXT,
  target_curriculum       TEXT,
  grade_min               INT,
  grade_max               INT,
  similarity_threshold    FLOAT DEFAULT 0.65,
  result_limit            INT   DEFAULT 100,
  source_node_type        TEXT  DEFAULT 'topic',
  target_node_type_filter TEXT  DEFAULT 'standard'
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
  WITH target_nodes AS (
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
      AND sn.grade_level_min <= grade_max
      AND sn.grade_level_max >= grade_min
      AND (source_node_type IS NULL OR sn.node_type = source_node_type)
    ORDER BY se.embedding <=> t.embedding
    LIMIT 1
  ) best ON true
  ORDER BY COALESCE(best.sim, 0) ASC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_curriculum_gaps_rag(
  TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT
) TO authenticated;

-- =============================================================================
-- NOTE ON APPROXIMATE RESULTS: IVFFlat is an approximate nearest-neighbor
-- index, not exact. For gap ANALYSIS (relative ranking into
-- CRITICAL/MAJOR/MODERATE/covered percentile buckets, not exact-match
-- lookups) this tradeoff is appropriate — small ranking noise near bucket
-- boundaries doesn't change the pedagogical recommendation. If exact nearest
-- neighbor is ever required, increase `probes` via
-- `SET LOCAL ivfflat.probes = 10;` before calling this function (costs some
-- speed for more accuracy), or switch to an HNSW index instead.
-- =============================================================================
