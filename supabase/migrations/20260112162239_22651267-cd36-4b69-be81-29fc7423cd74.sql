-- Fix warning-level issues: Add authentication requirements to RLS policies

-- 1. audit_logs - Update admin-only SELECT to require authentication
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. encryption_keys - Update policies to require authentication
DROP POLICY IF EXISTS "Admins can view encryption keys" ON public.encryption_keys;
DROP POLICY IF EXISTS "Admins can manage encryption keys" ON public.encryption_keys;
CREATE POLICY "Authenticated admins can view encryption keys"
ON public.encryption_keys
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated admins can manage encryption keys"
ON public.encryption_keys
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. data_access_logs - Update to require authentication
DROP POLICY IF EXISTS "Users can view own access logs" ON public.data_access_logs;
DROP POLICY IF EXISTS "Admins can view all access logs" ON public.data_access_logs;
CREATE POLICY "Authenticated users can view own access logs"
ON public.data_access_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = accessed_user_id);

CREATE POLICY "Authenticated admins can view all access logs"
ON public.data_access_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. user_roles - Update to require authentication  
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. alerts - Update to require authentication
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Admins can insert alerts" ON public.alerts;
CREATE POLICY "Authenticated users can view own alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated admins can insert alerts"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. learning_pathways - Update to require authentication
DROP POLICY IF EXISTS "Users can view their own learning pathways" ON public.learning_pathways;
DROP POLICY IF EXISTS "Users can create their own learning pathways" ON public.learning_pathways;
DROP POLICY IF EXISTS "Users can update their own learning pathways" ON public.learning_pathways;
DROP POLICY IF EXISTS "Users can delete their own learning pathways" ON public.learning_pathways;
DROP POLICY IF EXISTS "Guardians can view student learning pathways" ON public.learning_pathways;
CREATE POLICY "Authenticated users can view own learning pathways"
ON public.learning_pathways
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.guardian_relationships
    WHERE guardian_user_id = auth.uid()
    AND student_user_id = user_id
    AND verified = true
    AND (expires_at IS NULL OR expires_at > now())
  )
);

CREATE POLICY "Authenticated users can create own learning pathways"
ON public.learning_pathways
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own learning pathways"
ON public.learning_pathways
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own learning pathways"
ON public.learning_pathways
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 7. gap_reports - Update to require authentication
DROP POLICY IF EXISTS "Users can view their own gap reports" ON public.gap_reports;
DROP POLICY IF EXISTS "Users can create their own gap reports" ON public.gap_reports;
DROP POLICY IF EXISTS "Users can update their own gap reports" ON public.gap_reports;
DROP POLICY IF EXISTS "Users can delete their own gap reports" ON public.gap_reports;
DROP POLICY IF EXISTS "Guardians can view student gap reports" ON public.gap_reports;
CREATE POLICY "Authenticated users can view own gap reports"
ON public.gap_reports
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.guardian_relationships
    WHERE guardian_user_id = auth.uid()
    AND student_user_id = user_id
    AND verified = true
    AND (expires_at IS NULL OR expires_at > now())
  )
);

CREATE POLICY "Authenticated users can create own gap reports"
ON public.gap_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own gap reports"
ON public.gap_reports
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own gap reports"
ON public.gap_reports
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 8. progress_stats - Update to require authentication
DROP POLICY IF EXISTS "Users can view their own progress stats" ON public.progress_stats;
DROP POLICY IF EXISTS "Users can create their own progress stats" ON public.progress_stats;
DROP POLICY IF EXISTS "Users can update their own progress stats" ON public.progress_stats;
DROP POLICY IF EXISTS "Guardians can view student progress" ON public.progress_stats;
CREATE POLICY "Authenticated users can view own progress stats"
ON public.progress_stats
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.guardian_relationships
    WHERE guardian_user_id = auth.uid()
    AND student_user_id = user_id
    AND verified = true
    AND (expires_at IS NULL OR expires_at > now())
  )
);

CREATE POLICY "Authenticated users can create own progress stats"
ON public.progress_stats
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own progress stats"
ON public.progress_stats
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 9. cultural_modules - Update to require authentication
DROP POLICY IF EXISTS "Users can view their own cultural modules" ON public.cultural_modules;
DROP POLICY IF EXISTS "Users can create their own cultural modules" ON public.cultural_modules;
DROP POLICY IF EXISTS "Users can update their own cultural modules" ON public.cultural_modules;
DROP POLICY IF EXISTS "Users can delete their own cultural modules" ON public.cultural_modules;
CREATE POLICY "Authenticated users can view own cultural modules"
ON public.cultural_modules
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create own cultural modules"
ON public.cultural_modules
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own cultural modules"
ON public.cultural_modules
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own cultural modules"
ON public.cultural_modules
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 10. user_consents - Update to require authentication
DROP POLICY IF EXISTS "Users can view own consents" ON public.user_consents;
DROP POLICY IF EXISTS "Users can manage own consents" ON public.user_consents;
CREATE POLICY "Authenticated users can view own consents"
ON public.user_consents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own consents"
ON public.user_consents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own consents"
ON public.user_consents
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);