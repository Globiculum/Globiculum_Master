-- Fast RPC to return distinct curriculum_system values.
-- Used by embedding generation to discover which systems need embeddings
-- without fetching all 200K+ rows client-side.

CREATE OR REPLACE FUNCTION public.get_distinct_curriculum_systems()
RETURNS TABLE(curriculum_system TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT DISTINCT curriculum_system
  FROM public.curriculum_nodes
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_distinct_curriculum_systems()
  TO authenticated, service_role;
