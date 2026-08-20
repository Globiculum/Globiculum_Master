-- Add unique constraint on curriculum_edges if not already present.
-- This ensures ON CONFLICT / upsert works and prevents duplicate edges.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.curriculum_edges'::regclass
      AND contype = 'u'
      AND conname LIKE '%source_node_id%target_node_id%'
  ) THEN
    ALTER TABLE public.curriculum_edges
      ADD CONSTRAINT curriculum_edges_source_target_type_unique
      UNIQUE (source_node_id, target_node_id, relationship_type);
  END IF;
END;
$$;
