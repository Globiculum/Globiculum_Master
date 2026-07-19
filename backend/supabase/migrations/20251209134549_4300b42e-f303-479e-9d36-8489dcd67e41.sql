-- Add explicit tamper protection policies for audit_logs table
-- Deny all INSERT operations (only database triggers should insert)
CREATE POLICY "Deny direct inserts to audit_logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Deny all UPDATE operations (audit logs should never be modified)
CREATE POLICY "Deny updates to audit_logs"
  ON public.audit_logs
  FOR UPDATE
  TO authenticated
  USING (false);

-- Deny all DELETE operations (audit logs should never be deleted)
CREATE POLICY "Deny deletes to audit_logs"
  ON public.audit_logs
  FOR DELETE
  TO authenticated
  USING (false);