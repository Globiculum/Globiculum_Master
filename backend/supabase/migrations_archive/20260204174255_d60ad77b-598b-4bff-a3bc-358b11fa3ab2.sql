-- Fix: Restrict curriculum_edges SELECT access to match curriculum_nodes protection
-- Only admins or users with student profiles can view curriculum structure

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view curriculum edges" ON curriculum_edges;

-- Create restricted policy matching curriculum_nodes pattern
CREATE POLICY "Users with student profiles or admins can view curriculum edges"
ON curriculum_edges FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') 
  OR EXISTS (
    SELECT 1 FROM student_profiles 
    WHERE student_profiles.user_id = auth.uid()
  )
);