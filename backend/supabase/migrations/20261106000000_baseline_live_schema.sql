-- Baseline: the live database structure (project ocrpjxpntzqzcsmedqwm) on 2026-11-06,
-- taken with `supabase db dump --linked` (structure only, no data).
--
-- It replaces the 49 earlier migration files, kept in ../migrations_archive/ for reference.
-- Those files had drifted from production: the live database was built through Lovable,
-- the dashboard and hand-run SQL, and never recorded any of them (no history table).
-- This baseline is recorded as applied on the live database, so `supabase db push`
-- only runs migrations added after it. Do not edit it; make changes in new migration files.



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."alert_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."alert_priority" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'moderator',
    'student',
    'parent'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."curriculum_type" AS ENUM (
    'US',
    'Indian',
    'IB',
    'Other'
);


ALTER TYPE "public"."curriculum_type" OWNER TO "postgres";


CREATE TYPE "public"."session_status" AS ENUM (
    'scheduled',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."session_status" OWNER TO "postgres";


CREATE TYPE "public"."session_type" AS ENUM (
    'tutoring',
    'counseling',
    'live_class'
);


ALTER TYPE "public"."session_type" OWNER TO "postgres";


CREATE TYPE "public"."subject_name" AS ENUM (
    'Math',
    'Science',
    'English',
    'Social Studies',
    'Hindi',
    'Sanskrit',
    'Computer Science',
    'Other'
);


ALTER TYPE "public"."subject_name" OWNER TO "postgres";


CREATE TYPE "public"."tutor_session_status" AS ENUM (
    'pending',
    'confirmed',
    'cancelled'
);


ALTER TYPE "public"."tutor_session_status" OWNER TO "postgres";


CREATE TYPE "public"."tutor_session_type" AS ENUM (
    'diagnostic',
    'tutoring',
    'consultation'
);


ALTER TYPE "public"."tutor_session_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_curriculum_gaps_rag"("source_curriculum" "text", "target_curriculum" "text", "grade_min" integer, "grade_max" integer, "similarity_threshold" double precision DEFAULT 0.65, "result_limit" integer DEFAULT 100, "source_node_type" "text" DEFAULT 'topic'::"text", "target_node_type_filter" "text" DEFAULT 'standard'::"text", "target_subjects" "text"[] DEFAULT NULL::"text"[], "source_grade_min" integer DEFAULT NULL::integer, "source_grade_max" integer DEFAULT NULL::integer, "source_subjects" "text"[] DEFAULT NULL::"text"[], "source_subjects_exclude" "text"[] DEFAULT NULL::"text"[]) RETURNS TABLE("target_node_id" "uuid", "target_node_name" "text", "target_node_type" "text", "target_grade_min" integer, "target_grade_max" integer, "target_description" "text", "target_metadata" "jsonb", "best_source_match" "text", "best_similarity" double precision, "gap_exists" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "statement_timeout" TO '20s'
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


ALTER FUNCTION "public"."find_curriculum_gaps_rag"("source_curriculum" "text", "target_curriculum" "text", "grade_min" integer, "grade_max" integer, "similarity_threshold" double precision, "result_limit" integer, "source_node_type" "text", "target_node_type_filter" "text", "target_subjects" "text"[], "source_grade_min" integer, "source_grade_max" integer, "source_subjects" "text"[], "source_subjects_exclude" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_canonical_subjects"("p_curriculum_system" "text", "p_grade_min" integer DEFAULT NULL::integer, "p_grade_max" integer DEFAULT NULL::integer, "p_core_only" boolean DEFAULT false, "p_grade_specific" boolean DEFAULT false) RETURNS TABLE("canonical_subject" "text", "domain" "text", "is_core" boolean, "node_count" bigint, "raw_subjects" "text"[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH bounds AS (
    SELECT
      COALESCE(p_grade_min, p_grade_max) AS gmin,
      COALESCE(p_grade_max, p_grade_min) AS gmax
  ),
  scoped AS (
    SELECT
      si.subject AS raw_subject,
      SUM(si.node_count) AS n_all,
      SUM(si.node_count) FILTER (WHERE si.grade_level_max - si.grade_level_min <= 3) AS n_graded
    FROM public.curriculum_subject_index si, bounds b
    WHERE si.curriculum_system = p_curriculum_system
      AND (
        b.gmin IS NULL
        OR (NOT p_grade_specific AND si.grade_level_min = 0 AND si.grade_level_max = 0)
        OR (si.grade_level_min <= b.gmax AND si.grade_level_max >= b.gmin)
      )
    GROUP BY si.subject
  ),
  counted AS (
    SELECT
      sm.canonical_subject, sm.domain, sm.is_core, sm.vintage_end, s.raw_subject,
      CASE
        WHEN NOT p_grade_specific THEN s.n_all
        WHEN sm.canonical_subject = 'World Languages' AND COALESCE(b.gmin, 12) >= 6 THEN s.n_all
        ELSE COALESCE(s.n_graded, 0)
      END AS n
    FROM scoped s
    JOIN public.subject_mappings sm ON sm.raw_subject = s.raw_subject
    CROSS JOIN bounds b
    WHERE sm.canonical_subject IS NOT NULL
      AND (NOT p_core_only OR sm.is_core)
      AND NOT (p_grade_specific AND sm.canonical_subject = 'Personal Finance' AND COALESCE(b.gmax, 12) < 9)
  ),
  mapped AS (
    SELECT c.*, (c.vintage_end IS NULL OR c.vintage_end >= EXTRACT(YEAR FROM now())::INT) AS is_current
    FROM counted c
    WHERE c.n > 0
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


ALTER FUNCTION "public"."get_canonical_subjects"("p_curriculum_system" "text", "p_grade_min" integer, "p_grade_max" integer, "p_core_only" boolean, "p_grade_specific" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_curriculum_subjects"("p_curriculum_system" "text", "p_grade" integer DEFAULT NULL::integer, "p_stream" "text" DEFAULT NULL::"text") RETURNS TABLE("subject" "text", "node_count" bigint, "streams" "text"[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH scoped AS (
    SELECT
      cn.metadata->>'subject' AS subject,
      CASE
        WHEN jsonb_typeof(cn.metadata->'streams') = 'array'
        THEN cn.metadata->'streams'
        ELSE '[]'::jsonb
      END AS streams_json
    FROM public.curriculum_nodes cn
    WHERE cn.curriculum_system = p_curriculum_system
      AND cn.metadata->>'subject' IS NOT NULL
      AND cn.metadata->>'subject' <> ''
      -- Grade 0 means "applies to every grade" (see 20260828000000), so it must
      -- not be excluded by a specific-grade request.
      AND (
        p_grade IS NULL
        OR (cn.grade_level_min = 0 AND cn.grade_level_max = 0)
        OR (cn.grade_level_min <= p_grade AND cn.grade_level_max >= p_grade)
      )
      AND (
        p_stream IS NULL
        OR cn.metadata->'streams' @> to_jsonb(p_stream)
      )
  ),
  counts AS (
    SELECT s.subject, COUNT(*) AS node_count
    FROM scoped s
    GROUP BY s.subject
  ),
  -- Flattened separately from counts: a subject's streams live in a jsonb array
  -- per node, so they need expanding before they can be de-duplicated. An empty
  -- array yields no rows here, which the LEFT JOIN below turns back into '{}'.
  stream_map AS (
    SELECT s.subject, array_agg(DISTINCT el ORDER BY el) AS streams
    FROM scoped s
    CROSS JOIN LATERAL jsonb_array_elements_text(s.streams_json) AS el
    GROUP BY s.subject
  )
  SELECT
    c.subject,
    c.node_count,
    COALESCE(sm.streams, ARRAY[]::TEXT[]) AS streams
  FROM counts c
  LEFT JOIN stream_map sm ON sm.subject = c.subject
  ORDER BY 1;
$$;


ALTER FUNCTION "public"."get_curriculum_subjects"("p_curriculum_system" "text", "p_grade" integer, "p_stream" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_curriculum_subjects"("p_curriculum_system" "text", "p_grade" integer, "p_stream" "text") IS 'Distinct subjects for a curriculum_system at a grade, optionally filtered by stream. Drives the assessment form subject list instead of hardcoded arrays.';



CREATE OR REPLACE FUNCTION "public"."get_distinct_curriculum_systems"() RETURNS TABLE("curriculum_system" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT DISTINCT curriculum_system FROM public.curriculum_nodes ORDER BY 1;
$$;


ALTER FUNCTION "public"."get_distinct_curriculum_systems"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_graph_from_node"("start_node_id" "uuid", "max_depth" integer) RETURNS TABLE("id" "uuid", "node_type" "text", "name" "text", "depth" integer, "path" "uuid"[])
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  validated_max_depth INTEGER;
BEGIN
  IF max_depth IS NULL OR max_depth < 1 THEN
    validated_max_depth := 3;
  ELSIF max_depth > 10 THEN
    validated_max_depth := 10;
  ELSE
    validated_max_depth := max_depth;
  END IF;

  RETURN QUERY
  WITH RECURSIVE graph_traversal AS (
    SELECT cn.id, cn.node_type, cn.name, 0 AS depth, ARRAY[cn.id] AS path
    FROM public.curriculum_nodes cn
    WHERE cn.id = start_node_id

    UNION ALL

    SELECT cn.id, cn.node_type, cn.name, gt.depth + 1, gt.path || cn.id
    FROM graph_traversal gt
    JOIN public.curriculum_edges e ON e.source_node_id = gt.id
    JOIN public.curriculum_nodes cn ON cn.id = e.target_node_id
    WHERE gt.depth < validated_max_depth
      AND NOT (cn.id = ANY(gt.path))
  )
  SELECT * FROM graph_traversal;
END;
$$;


ALTER FUNCTION "public"."get_graph_from_node"("start_node_id" "uuid", "max_depth" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_audit_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_curriculum_subject_index"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "statement_timeout" TO '10min'
    AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.curriculum_subject_index;
$$;


ALTER FUNCTION "public"."refresh_curriculum_subject_index"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_curriculum_semantic"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 10, "filter_curriculum" "text" DEFAULT NULL::"text", "filter_grade_min" integer DEFAULT NULL::integer, "filter_grade_max" integer DEFAULT NULL::integer, "filter_node_type" "text" DEFAULT NULL::"text") RETURNS TABLE("node_id" "uuid", "node_name" "text", "node_type" "text", "curriculum_system" "text", "grade_level_min" integer, "grade_level_max" integer, "description" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."search_curriculum_semantic"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_curriculum" "text", "filter_grade_min" integer, "filter_grade_max" integer, "filter_node_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete"("table_name" "text", "record_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
BEGIN
  EXECUTE format('UPDATE %I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL', table_name)
  USING record_id;
  RETURN FOUND;
END;
$_$;


ALTER FUNCTION "public"."soft_delete"("table_name" "text", "record_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."traverse_curriculum_graph"("start_node_id" "uuid", "max_depth" integer DEFAULT 3, "relationship_types" "text"[] DEFAULT NULL::"text"[]) RETURNS TABLE("node_id" "uuid", "node_type" "text", "name" "text", "depth" integer, "path" "uuid"[])
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  validated_max_depth INTEGER;
BEGIN
  IF max_depth IS NULL OR max_depth < 1 THEN
    validated_max_depth := 3;
  ELSIF max_depth > 10 THEN
    validated_max_depth := 10;
  ELSE
    validated_max_depth := max_depth;
  END IF;

  RETURN QUERY
  WITH RECURSIVE graph_traversal AS (
    SELECT cn.id AS node_id, cn.node_type, cn.name, 0 AS depth, ARRAY[cn.id] AS path
    FROM public.curriculum_nodes cn
    WHERE cn.id = start_node_id

    UNION ALL

    SELECT cn.id AS node_id, cn.node_type, cn.name, gt.depth + 1, gt.path || cn.id
    FROM graph_traversal gt
    JOIN public.curriculum_edges e ON e.source_node_id = gt.node_id
    JOIN public.curriculum_nodes cn ON cn.id = e.target_node_id
    WHERE gt.depth < validated_max_depth
      AND NOT (cn.id = ANY(gt.path))
      AND (relationship_types IS NULL OR e.relationship_type = ANY(relationship_types))
  )
  SELECT * FROM graph_traversal;
END;
$$;


ALTER FUNCTION "public"."traverse_curriculum_graph"("start_node_id" "uuid", "max_depth" integer, "relationship_types" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "priority" "public"."alert_priority" DEFAULT 'medium'::"public"."alert_priority" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "student_profile_id" "uuid" NOT NULL,
    "assessment_data" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "company" "text",
    "message" "text" NOT NULL
);


ALTER TABLE "public"."contact_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cultural_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "module_type" "text" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "progress_percentage" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cultural_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curriculum_alignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_curriculum" "text" NOT NULL,
    "target_curriculum" "text" NOT NULL,
    "source_node_id" "uuid" NOT NULL,
    "target_node_id" "uuid" NOT NULL,
    "alignment_score" numeric NOT NULL,
    "gap_type" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."curriculum_alignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curriculum_edges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_node_id" "uuid" NOT NULL,
    "target_node_id" "uuid" NOT NULL,
    "relationship_type" "text" NOT NULL,
    "weight" numeric DEFAULT 1.0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."curriculum_edges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curriculum_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "node_id" "uuid" NOT NULL,
    "embedding" "public"."vector"(1536),
    "embedding_model" "text" DEFAULT 'text-embedding-ada-002'::"text" NOT NULL,
    "content_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."curriculum_embeddings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curriculum_nodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "node_type" "text" NOT NULL,
    "description" "text",
    "curriculum_system" "text",
    "grade_level_min" integer,
    "grade_level_max" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."curriculum_nodes" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."curriculum_subject_index" AS
 SELECT "curriculum_system",
    ("metadata" ->> 'subject'::"text") AS "subject",
    "grade_level_min",
    "grade_level_max",
    "count"(*) AS "node_count"
   FROM "public"."curriculum_nodes" "cn"
  WHERE ((("metadata" ->> 'subject'::"text") IS NOT NULL) AND (("metadata" ->> 'subject'::"text") <> ''::"text"))
  GROUP BY "curriculum_system", ("metadata" ->> 'subject'::"text"), "grade_level_min", "grade_level_max"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."curriculum_subject_index" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "accessed_user_id" "uuid",
    "access_type" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."data_access_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reason" "text",
    "notes" "text",
    "processed_by" "uuid",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."data_deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."diagnostic_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "student_profile_id" "uuid" NOT NULL,
    "assessment_id" "uuid",
    "diagnostic_type" "text" DEFAULT 'full'::"text" NOT NULL,
    "overall_score" integer DEFAULT 0 NOT NULL,
    "readiness_level" "text" DEFAULT 'needs-bridging'::"text" NOT NULL,
    "subject_scores" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "strength_areas" "text"[] DEFAULT '{}'::"text"[],
    "gap_areas" "text"[] DEFAULT '{}'::"text"[],
    "recommendations" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."diagnostic_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."encryption_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key_identifier" "text" NOT NULL,
    "purpose" "text" NOT NULL,
    "algorithm" "text" DEFAULT 'AES-256-GCM'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "expires_at" timestamp with time zone,
    "rotated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."encryption_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "report_id" "uuid",
    "feedback_type" "text" NOT NULL,
    "content" "text",
    "rating" integer,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gap_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "subject" "public"."subject_name" NOT NULL,
    "mastery_percentage" integer DEFAULT 0 NOT NULL,
    "gaps_identified" "text"[],
    "recommendations" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."gap_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guardian_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_user_id" "uuid" NOT NULL,
    "student_profile_id" "uuid" NOT NULL,
    "guardian_email" "text" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."guardian_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guardian_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guardian_user_id" "uuid" NOT NULL,
    "student_user_id" "uuid" NOT NULL,
    "relationship_type" "text" NOT NULL,
    "access_level" "text" DEFAULT 'full'::"text" NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "verified_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."guardian_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_magnet_signups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "resource_type" "text" NOT NULL
);


ALTER TABLE "public"."lead_magnet_signups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_pathways" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "subject" "public"."subject_name" NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "due_date" timestamp with time zone,
    "resources" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."learning_pathways" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "grade_min" integer NOT NULL,
    "grade_max" integer NOT NULL,
    "resource_type" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "title" "text" NOT NULL,
    "url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "level" "text",
    CONSTRAINT "learning_resources_board_check" CHECK (("board" = ANY (ARRAY['cbse'::"text", 'isc'::"text", 'icse'::"text", 'any'::"text"]))),
    CONSTRAINT "learning_resources_check" CHECK ((("grade_max" >= "grade_min") AND ("grade_max" <= 12))),
    CONSTRAINT "learning_resources_grade_min_check" CHECK ((("grade_min" >= 1) AND ("grade_min" <= 12))),
    CONSTRAINT "learning_resources_level_check" CHECK ((("level" IS NULL) OR ("level" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text"])))),
    CONSTRAINT "learning_resources_resource_type_check" CHECK (("resource_type" = ANY (ARRAY['textbook'::"text", 'video'::"text", 'practice'::"text", 'reference'::"text"])))
);


ALTER TABLE "public"."learning_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."progress_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "topics_completed" integer DEFAULT 0 NOT NULL,
    "overall_mastery" integer DEFAULT 0 NOT NULL,
    "active_weeks" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."progress_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_artifacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "report_id" "uuid" NOT NULL,
    "artifact_type" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text",
    "file_size" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."report_artifacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" DEFAULT 'Curriculum Alignment Report'::"text" NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "form_data" "jsonb" NOT NULL,
    "analysis_data" "jsonb" NOT NULL,
    "prev_report_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."saved_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "session_type" "public"."session_type" NOT NULL,
    "status" "public"."session_status" DEFAULT 'scheduled'::"public"."session_status" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "duration_minutes" integer DEFAULT 60 NOT NULL,
    "meeting_link" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "report_id" "uuid" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shared_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "student_name" "text" NOT NULL,
    "age" integer NOT NULL,
    "current_grade" "text" NOT NULL,
    "current_country" "text" NOT NULL,
    "previous_curriculum" "public"."curriculum_type" NOT NULL,
    "target_curriculum" "public"."curriculum_type" NOT NULL,
    "transition_timeline" "text",
    "curriculum_analysis" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."student_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subject_mappings" (
    "raw_subject" "text" NOT NULL,
    "canonical_subject" "text",
    "domain" "text",
    "is_core" boolean DEFAULT false NOT NULL,
    "vintage_end" integer,
    "excluded_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subject_mappings_mapped_or_excluded" CHECK (((("canonical_subject" IS NOT NULL) AND ("domain" IS NOT NULL) AND ("excluded_reason" IS NULL)) OR (("canonical_subject" IS NULL) AND ("domain" IS NULL) AND ("excluded_reason" IS NOT NULL))))
);


ALTER TABLE "public"."subject_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board" "text" NOT NULL,
    "grade" integer NOT NULL,
    "subject" "text" NOT NULL,
    "topic" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "title" "text" NOT NULL,
    "url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "topic_resources_board_check" CHECK (("board" = ANY (ARRAY['cbse'::"text", 'icse'::"text", 'isc'::"text"]))),
    CONSTRAINT "topic_resources_grade_check" CHECK ((("grade" >= 1) AND ("grade" <= 12))),
    CONSTRAINT "topic_resources_resource_type_check" CHECK (("resource_type" = ANY (ARRAY['textbook'::"text", 'video'::"text", 'practice'::"text"])))
);


ALTER TABLE "public"."topic_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tutor_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "session_type" "public"."tutor_session_type" NOT NULL,
    "status" "public"."tutor_session_status" DEFAULT 'pending'::"public"."tutor_session_status" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tutor_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "consent_type" "text" NOT NULL,
    "granted" boolean DEFAULT false NOT NULL,
    "granted_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "version" "text" DEFAULT '1.0'::"text" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_consents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."validation_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_name" "text" NOT NULL,
    "rule_type" "text" NOT NULL,
    "conditions" "jsonb" NOT NULL,
    "error_message" "text" NOT NULL,
    "severity" "text" DEFAULT 'error'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."validation_rules" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_submissions"
    ADD CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cultural_modules"
    ADD CONSTRAINT "cultural_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curriculum_alignments"
    ADD CONSTRAINT "curriculum_alignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curriculum_edges"
    ADD CONSTRAINT "curriculum_edges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curriculum_edges"
    ADD CONSTRAINT "curriculum_edges_source_target_type_unique" UNIQUE ("source_node_id", "target_node_id", "relationship_type");



ALTER TABLE ONLY "public"."curriculum_embeddings"
    ADD CONSTRAINT "curriculum_embeddings_node_id_key" UNIQUE ("node_id");



ALTER TABLE ONLY "public"."curriculum_embeddings"
    ADD CONSTRAINT "curriculum_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curriculum_nodes"
    ADD CONSTRAINT "curriculum_nodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_access_logs"
    ADD CONSTRAINT "data_access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_deletion_requests"
    ADD CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."diagnostic_results"
    ADD CONSTRAINT "diagnostic_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."encryption_keys"
    ADD CONSTRAINT "encryption_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gap_reports"
    ADD CONSTRAINT "gap_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guardian_invitations"
    ADD CONSTRAINT "guardian_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guardian_relationships"
    ADD CONSTRAINT "guardian_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_magnet_signups"
    ADD CONSTRAINT "lead_magnet_signups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_pathways"
    ADD CONSTRAINT "learning_pathways_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_resources"
    ADD CONSTRAINT "learning_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."progress_stats"
    ADD CONSTRAINT "progress_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."progress_stats"
    ADD CONSTRAINT "progress_stats_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_artifacts"
    ADD CONSTRAINT "report_artifacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_reports"
    ADD CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_reports"
    ADD CONSTRAINT "shared_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."subject_mappings"
    ADD CONSTRAINT "subject_mappings_pkey" PRIMARY KEY ("raw_subject");



ALTER TABLE ONLY "public"."topic_resources"
    ADD CONSTRAINT "topic_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tutor_sessions"
    ADD CONSTRAINT "tutor_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_consents"
    ADD CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."validation_rules"
    ADD CONSTRAINT "validation_rules_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "curriculum_subject_index_key" ON "public"."curriculum_subject_index" USING "btree" ("curriculum_system", "subject", "grade_level_min", "grade_level_max");



CREATE INDEX "idx_curriculum_nodes_rag_lookup" ON "public"."curriculum_nodes" USING "btree" ("curriculum_system", "grade_level_min", "grade_level_max", "node_type");



CREATE UNIQUE INDEX "idx_curriculum_nodes_system_source_unique" ON "public"."curriculum_nodes" USING "btree" ("curriculum_system", (("metadata" ->> 'source_id'::"text"))) WHERE (("metadata" ->> 'source_id'::"text") IS NOT NULL);



CREATE INDEX "idx_subject_mappings_canonical" ON "public"."subject_mappings" USING "btree" ("canonical_subject") WHERE ("canonical_subject" IS NOT NULL);



CREATE INDEX "learning_resources_lookup" ON "public"."learning_resources" USING "btree" ("board", "grade_min", "grade_max");



CREATE INDEX "topic_resources_lookup" ON "public"."topic_resources" USING "btree" ("board", "grade");



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."cultural_modules"
    ADD CONSTRAINT "cultural_modules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."curriculum_alignments"
    ADD CONSTRAINT "curriculum_alignments_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "public"."curriculum_nodes"("id");



ALTER TABLE ONLY "public"."curriculum_alignments"
    ADD CONSTRAINT "curriculum_alignments_target_node_id_fkey" FOREIGN KEY ("target_node_id") REFERENCES "public"."curriculum_nodes"("id");



ALTER TABLE ONLY "public"."curriculum_edges"
    ADD CONSTRAINT "curriculum_edges_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "public"."curriculum_nodes"("id");



ALTER TABLE ONLY "public"."curriculum_edges"
    ADD CONSTRAINT "curriculum_edges_target_node_id_fkey" FOREIGN KEY ("target_node_id") REFERENCES "public"."curriculum_nodes"("id");



ALTER TABLE ONLY "public"."curriculum_embeddings"
    ADD CONSTRAINT "curriculum_embeddings_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "public"."curriculum_nodes"("id");



ALTER TABLE ONLY "public"."diagnostic_results"
    ADD CONSTRAINT "diagnostic_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id");



ALTER TABLE ONLY "public"."diagnostic_results"
    ADD CONSTRAINT "diagnostic_results_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id");



ALTER TABLE ONLY "public"."diagnostic_results"
    ADD CONSTRAINT "diagnostic_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."saved_reports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."gap_reports"
    ADD CONSTRAINT "gap_reports_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id");



ALTER TABLE ONLY "public"."gap_reports"
    ADD CONSTRAINT "gap_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."guardian_invitations"
    ADD CONSTRAINT "guardian_invitations_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id");



ALTER TABLE ONLY "public"."learning_pathways"
    ADD CONSTRAINT "learning_pathways_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."progress_stats"
    ADD CONSTRAINT "progress_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."report_artifacts"
    ADD CONSTRAINT "report_artifacts_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."saved_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_artifacts"
    ADD CONSTRAINT "report_artifacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."saved_reports"
    ADD CONSTRAINT "saved_reports_prev_report_id_fkey" FOREIGN KEY ("prev_report_id") REFERENCES "public"."saved_reports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."shared_reports"
    ADD CONSTRAINT "shared_reports_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."saved_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_profiles"
    ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can sign up for lead magnets" ON "public"."lead_magnet_signups" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can submit contact form" ON "public"."contact_submissions" FOR INSERT WITH CHECK ((("name" IS NOT NULL) AND ("email" IS NOT NULL) AND ("length"("name") > 0) AND ("length"("email") > 0)));



CREATE POLICY "Authenticated users can read validation rules" ON "public"."validation_rules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Learning resources are readable" ON "public"."learning_resources" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "No public read access to contact submissions" ON "public"."contact_submissions" FOR SELECT USING (false);



CREATE POLICY "No public read access to lead signups" ON "public"."lead_magnet_signups" FOR SELECT USING (false);



CREATE POLICY "Subject mappings are readable" ON "public"."subject_mappings" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Topic resources are readable" ON "public"."topic_resources" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Users can delete own assessments" ON "public"."assessments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own diagnostic results" ON "public"."diagnostic_results" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own reports" ON "public"."saved_reports" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own shared reports" ON "public"."shared_reports" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own student profiles" ON "public"."student_profiles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own assessments" ON "public"."assessments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own diagnostic results" ON "public"."diagnostic_results" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own reports" ON "public"."saved_reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own shared reports" ON "public"."shared_reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own student profile" ON "public"."student_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own assessments" ON "public"."assessments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own diagnostic results" ON "public"."diagnostic_results" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own student profile" ON "public"."student_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own assessments" ON "public"."assessments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own diagnostic results" ON "public"."diagnostic_results" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own reports" ON "public"."saved_reports" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own shared reports" ON "public"."shared_reports" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own student profile" ON "public"."student_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cultural_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curriculum_alignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curriculum_edges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curriculum_embeddings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curriculum_nodes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."diagnostic_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."encryption_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gap_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guardian_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guardian_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_magnet_signups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learning_pathways" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learning_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."progress_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_artifacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subject_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tutor_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_consents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."validation_rules" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_curriculum_gaps_rag"("source_curriculum" "text", "target_curriculum" "text", "grade_min" integer, "grade_max" integer, "similarity_threshold" double precision, "result_limit" integer, "source_node_type" "text", "target_node_type_filter" "text", "target_subjects" "text"[], "source_grade_min" integer, "source_grade_max" integer, "source_subjects" "text"[], "source_subjects_exclude" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."find_curriculum_gaps_rag"("source_curriculum" "text", "target_curriculum" "text", "grade_min" integer, "grade_max" integer, "similarity_threshold" double precision, "result_limit" integer, "source_node_type" "text", "target_node_type_filter" "text", "target_subjects" "text"[], "source_grade_min" integer, "source_grade_max" integer, "source_subjects" "text"[], "source_subjects_exclude" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_curriculum_gaps_rag"("source_curriculum" "text", "target_curriculum" "text", "grade_min" integer, "grade_max" integer, "similarity_threshold" double precision, "result_limit" integer, "source_node_type" "text", "target_node_type_filter" "text", "target_subjects" "text"[], "source_grade_min" integer, "source_grade_max" integer, "source_subjects" "text"[], "source_subjects_exclude" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_canonical_subjects"("p_curriculum_system" "text", "p_grade_min" integer, "p_grade_max" integer, "p_core_only" boolean, "p_grade_specific" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_canonical_subjects"("p_curriculum_system" "text", "p_grade_min" integer, "p_grade_max" integer, "p_core_only" boolean, "p_grade_specific" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_canonical_subjects"("p_curriculum_system" "text", "p_grade_min" integer, "p_grade_max" integer, "p_core_only" boolean, "p_grade_specific" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_curriculum_subjects"("p_curriculum_system" "text", "p_grade" integer, "p_stream" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_curriculum_subjects"("p_curriculum_system" "text", "p_grade" integer, "p_stream" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_curriculum_subjects"("p_curriculum_system" "text", "p_grade" integer, "p_stream" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_distinct_curriculum_systems"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_distinct_curriculum_systems"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_distinct_curriculum_systems"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_graph_from_node"("start_node_id" "uuid", "max_depth" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_graph_from_node"("start_node_id" "uuid", "max_depth" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_graph_from_node"("start_node_id" "uuid", "max_depth" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_audit_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_event"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."refresh_curriculum_subject_index"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."refresh_curriculum_subject_index"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_curriculum_semantic"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_curriculum" "text", "filter_grade_min" integer, "filter_grade_max" integer, "filter_node_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_curriculum_semantic"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_curriculum" "text", "filter_grade_min" integer, "filter_grade_max" integer, "filter_node_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_curriculum_semantic"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_curriculum" "text", "filter_grade_min" integer, "filter_grade_max" integer, "filter_node_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."soft_delete"("table_name" "text", "record_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."soft_delete"("table_name" "text", "record_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."traverse_curriculum_graph"("start_node_id" "uuid", "max_depth" integer, "relationship_types" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."traverse_curriculum_graph"("start_node_id" "uuid", "max_depth" integer, "relationship_types" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."traverse_curriculum_graph"("start_node_id" "uuid", "max_depth" integer, "relationship_types" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."alerts" TO "anon";
GRANT ALL ON TABLE "public"."alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."alerts" TO "service_role";



GRANT ALL ON TABLE "public"."assessments" TO "anon";
GRANT ALL ON TABLE "public"."assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."assessments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."contact_submissions" TO "anon";
GRANT ALL ON TABLE "public"."contact_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."cultural_modules" TO "anon";
GRANT ALL ON TABLE "public"."cultural_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."cultural_modules" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_alignments" TO "anon";
GRANT ALL ON TABLE "public"."curriculum_alignments" TO "authenticated";
GRANT ALL ON TABLE "public"."curriculum_alignments" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_edges" TO "anon";
GRANT ALL ON TABLE "public"."curriculum_edges" TO "authenticated";
GRANT ALL ON TABLE "public"."curriculum_edges" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."curriculum_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."curriculum_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_nodes" TO "anon";
GRANT ALL ON TABLE "public"."curriculum_nodes" TO "authenticated";
GRANT ALL ON TABLE "public"."curriculum_nodes" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_subject_index" TO "service_role";



GRANT ALL ON TABLE "public"."data_access_logs" TO "anon";
GRANT ALL ON TABLE "public"."data_access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."data_access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."data_deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."data_deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."data_deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."diagnostic_results" TO "anon";
GRANT ALL ON TABLE "public"."diagnostic_results" TO "authenticated";
GRANT ALL ON TABLE "public"."diagnostic_results" TO "service_role";



GRANT ALL ON TABLE "public"."encryption_keys" TO "anon";
GRANT ALL ON TABLE "public"."encryption_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."encryption_keys" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."gap_reports" TO "anon";
GRANT ALL ON TABLE "public"."gap_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."gap_reports" TO "service_role";



GRANT ALL ON TABLE "public"."guardian_invitations" TO "anon";
GRANT ALL ON TABLE "public"."guardian_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."guardian_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."guardian_relationships" TO "anon";
GRANT ALL ON TABLE "public"."guardian_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."guardian_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."lead_magnet_signups" TO "anon";
GRANT ALL ON TABLE "public"."lead_magnet_signups" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_magnet_signups" TO "service_role";



GRANT ALL ON TABLE "public"."learning_pathways" TO "anon";
GRANT ALL ON TABLE "public"."learning_pathways" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_pathways" TO "service_role";



GRANT ALL ON TABLE "public"."learning_resources" TO "anon";
GRANT ALL ON TABLE "public"."learning_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_resources" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."progress_stats" TO "anon";
GRANT ALL ON TABLE "public"."progress_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."progress_stats" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."report_artifacts" TO "anon";
GRANT ALL ON TABLE "public"."report_artifacts" TO "authenticated";
GRANT ALL ON TABLE "public"."report_artifacts" TO "service_role";



GRANT ALL ON TABLE "public"."saved_reports" TO "anon";
GRANT ALL ON TABLE "public"."saved_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_reports" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."shared_reports" TO "anon";
GRANT ALL ON TABLE "public"."shared_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_reports" TO "service_role";



GRANT ALL ON TABLE "public"."student_profiles" TO "anon";
GRANT ALL ON TABLE "public"."student_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."student_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."subject_mappings" TO "anon";
GRANT ALL ON TABLE "public"."subject_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."subject_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."topic_resources" TO "anon";
GRANT ALL ON TABLE "public"."topic_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_resources" TO "service_role";



GRANT ALL ON TABLE "public"."tutor_sessions" TO "anon";
GRANT ALL ON TABLE "public"."tutor_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."tutor_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."user_consents" TO "anon";
GRANT ALL ON TABLE "public"."user_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."user_consents" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."validation_rules" TO "anon";
GRANT ALL ON TABLE "public"."validation_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."validation_rules" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































