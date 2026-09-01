-- =============================================================================
-- FIX: find_curriculum_gaps_rag times out when the source curriculum is
-- 'ngss' at the app's standard 3-grade window (grade-1..grade+1).
--
-- Verified directly against production: source=ngss, target=ncert-cbse,
-- grade_min/max=7/9 reliably fails with "57014 canceling statement due to
-- statement timeout" (~8s), while the SAME query at a 2-grade window
-- (8-9) succeeds in ~6.3s -- right at the edge of whatever statement_timeout
-- currently applies to the authenticated role. source=us-common-core at the
-- same 3-grade window and a comparable row count (3279 vs. ngss's 3016
-- nodes) succeeds in under 2s, so this isn't simply "too much data" -- ngss's
-- embedding distribution is just markedly more expensive for this query
-- shape, and 8s isn't enough headroom for it.
--
-- This matters now because merging NGSS into the SOURCE pool (not just the
-- target pool, which the app already did) is required to fix a real
-- correctness bug: when a student's source curriculum is us-common-core,
-- their actual NGSS science background was never counted as coverage for
-- Science-domain target topics, which instead got compared only against
-- irrelevant Math/ELA text.
--
-- Fix: give this specific function more time via a function-level GUC
-- (ALTER FUNCTION ... SET), rather than changing the project-wide
-- statement_timeout. This only affects calls to this one function; the
-- calling edge functions already treat an NGSS-source RPC failure as
-- non-fatal (log + skip), so a slow-but-successful call is strictly better
-- than the previous guaranteed failure, and a call that's still too slow at
-- 20s degrades the same safe way it already did at 8s.
-- =============================================================================

ALTER FUNCTION public.find_curriculum_gaps_rag(
  TEXT, TEXT, INT, INT, FLOAT, INT, TEXT, TEXT, TEXT[]
) SET statement_timeout = '20s';
