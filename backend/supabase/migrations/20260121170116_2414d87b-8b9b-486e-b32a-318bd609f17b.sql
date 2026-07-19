-- Fix: Restrict curriculum_nodes access to users with active student profiles or admins
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view curriculum nodes" ON public.curriculum_nodes;

-- Create a new restrictive SELECT policy that only allows:
-- 1. Users who have an active student profile
-- 2. Admin users who need to manage content
CREATE POLICY "Users with student profiles or admins can view curriculum nodes"
ON public.curriculum_nodes
FOR SELECT
TO authenticated
USING (
  -- Allow admins
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Allow users with active student profiles
  EXISTS (
    SELECT 1 FROM public.student_profiles
    WHERE student_profiles.user_id = auth.uid()
  )
);