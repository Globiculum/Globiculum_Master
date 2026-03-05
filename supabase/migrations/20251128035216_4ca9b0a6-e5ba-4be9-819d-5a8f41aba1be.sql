-- Fix alerts table INSERT policy to prevent spoofing
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert alerts" ON public.alerts;

-- Create a new admin-only INSERT policy
CREATE POLICY "Only admins can insert alerts" ON public.alerts 
  FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));