import { supabase } from "@/integrations/supabase/client";

interface AuditLogData {
  action: string;
  table_name: string;
  record_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
}

/**
 * Log an audit event with IP address and user agent tracking
 * Use this for sensitive operations that need enhanced tracking
 */
export const logAuditEvent = async (data: AuditLogData): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('log-audit-event', {
      body: data,
    });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

/**
 * Log a role change audit event
 */
export const logRoleChange = async (
  userId: string,
  oldRole: string | null,
  newRole: string,
  recordId: string
) => {
  await logAuditEvent({
    action: oldRole ? 'UPDATE' : 'INSERT',
    table_name: 'user_roles',
    record_id: recordId,
    old_data: oldRole ? { role: oldRole } : undefined,
    new_data: { role: newRole, user_id: userId },
  });
};

/**
 * Log a profile update audit event
 */
export const logProfileUpdate = async (
  profileId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) => {
  await logAuditEvent({
    action: 'UPDATE',
    table_name: 'profiles',
    record_id: profileId,
    old_data: oldData,
    new_data: newData,
  });
};

/**
 * Log an alert creation audit event
 */
export const logAlertCreation = async (
  alertId: string,
  alertData: Record<string, any>
) => {
  await logAuditEvent({
    action: 'INSERT',
    table_name: 'alerts',
    record_id: alertId,
    new_data: alertData,
  });
};

/**
 * Log a sensitive data access event
 */
export const logDataAccess = async (
  tableName: string,
  recordId: string,
  accessType: 'VIEW' | 'EXPORT' | 'DOWNLOAD'
) => {
  await logAuditEvent({
    action: accessType,
    table_name: tableName,
    record_id: recordId,
  });
};