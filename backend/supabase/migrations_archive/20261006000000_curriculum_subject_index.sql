-- Pre-aggregated subject counts, so subject lookups don't scan curriculum_nodes.
--
-- get_canonical_subjects grouped every node of a state by metadata->>'subject'
-- on each call, detoasting each row's large metadata JSON to read one key.
-- Measured with the anon key the assessment form uses (single grade):
--   Florida 1.0s, Ohio 2.2s, California 3.1s, Texas and Georgia TIMED OUT
--   (anon's ~3s statement_timeout), so those states always fell back to the
--   five core subjects. The gap engine calls it over a whole grade window,
--   which is slower still.
--
-- The aggregate has one row per (curriculum, label, grade range): about 9,000
-- rows in place of 1.15 million, built in ~10s. It changes only when curriculum data is
-- re-imported; ingestion calls refresh_curriculum_subject_index() afterwards.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.curriculum_subject_index AS
SELECT
  cn.curriculum_system,
  cn.metadata->>'subject' AS subject,
  cn.grade_level_min,
  cn.grade_level_max,
  COUNT(*)::BIGINT AS node_count
FROM public.curriculum_nodes cn
WHERE cn.metadata->>'subject' IS NOT NULL
  AND cn.metadata->>'subject' <> ''
GROUP BY 1, 2, 3, 4;

-- Unique so the refresh can run CONCURRENTLY, without blocking readers.
CREATE UNIQUE INDEX IF NOT EXISTS curriculum_subject_index_key
  ON public.curriculum_subject_index (curriculum_system, subject, grade_level_min, grade_level_max);

-- Read only through the SECURITY DEFINER functions below. Materialized views
-- have no RLS, so the API roles are not given direct access.
REVOKE ALL ON public.curriculum_subject_index FROM anon, authenticated;
GRANT SELECT ON public.curriculum_subject_index TO service_role;


-- Same contract as 20261005000000; only the source of the counts changes.
CREATE OR REPLACE FUNCTION public.get_canonical_subjects(
  p_curriculum_system TEXT,
  p_grade_min         INT     DEFAULT NULL,
  p_grade_max         INT     DEFAULT NULL,
  p_core_only         BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  canonical_subject TEXT,
  domain            TEXT,
  is_core           BOOLEAN,
  node_count        BIGINT,
  raw_subjects      TEXT[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      COALESCE(p_grade_min, p_grade_max) AS gmin,
      COALESCE(p_grade_max, p_grade_min) AS gmax
  ),
  scoped AS (
    SELECT si.subject AS raw_subject, SUM(si.node_count) AS n
    FROM public.curriculum_subject_index si, bounds b
    WHERE si.curriculum_system = p_curriculum_system
      AND (
        b.gmin IS NULL
        OR (si.grade_level_min = 0 AND si.grade_level_max = 0)
        OR (si.grade_level_min <= b.gmax AND si.grade_level_max >= b.gmin)
      )
    GROUP BY si.subject
  ),
  mapped AS (
    SELECT
      sm.canonical_subject, sm.domain, sm.is_core, sm.vintage_end, s.raw_subject, s.n,
      (sm.vintage_end IS NULL OR sm.vintage_end >= EXTRACT(YEAR FROM now())::INT) AS is_current
    FROM scoped s
    JOIN public.subject_mappings sm ON sm.raw_subject = s.raw_subject
    WHERE sm.canonical_subject IS NOT NULL
      AND (NOT p_core_only OR sm.is_core)
  ),
  currency AS (
    SELECT
      m.canonical_subject,
      bool_or(m.is_current)                              AS any_current,
      max(m.vintage_end) FILTER (WHERE NOT m.is_current) AS latest_superseded
    FROM mapped m
    GROUP BY m.canonical_subject
  )
  SELECT
    m.canonical_subject,
    m.domain,
    m.is_core,
    SUM(m.n)::BIGINT AS node_count,
    array_agg(m.raw_subject ORDER BY m.raw_subject) AS raw_subjects
  FROM mapped m
  JOIN currency c ON c.canonical_subject = m.canonical_subject
  WHERE (c.any_current AND m.is_current)
     OR (NOT c.any_current AND m.vintage_end = c.latest_superseded)
  GROUP BY m.canonical_subject, m.domain, m.is_core
  ORDER BY m.is_core DESC, m.canonical_subject;
$$;

GRANT EXECUTE ON FUNCTION public.get_canonical_subjects(TEXT, INT, INT, BOOLEAN)
  TO anon, authenticated, service_role;


-- Rebuild the aggregate after curriculum data changes. Service role only: the
-- ingestion scripts call it; it is not something a visitor should trigger.
CREATE OR REPLACE FUNCTION public.refresh_curriculum_subject_index()
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
SET statement_timeout = '10min'
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.curriculum_subject_index;
$$;

REVOKE ALL ON FUNCTION public.refresh_curriculum_subject_index() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_curriculum_subject_index() TO service_role;
