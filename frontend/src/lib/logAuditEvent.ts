import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget audit log call.
 * Never blocks the UI — errors are silently logged to console.
 */
export function logAuditEvent(params: {
  action: string;
  tableName: string;
  recordId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}) {
  // Don't await — fire and forget
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.access_token) return;

    supabase.functions
      .invoke("log-audit-event", {
        body: {
          action: params.action,
          table_name: params.tableName,
          record_id: params.recordId ?? null,
          old_data: params.oldData ?? null,
          new_data: params.newData ?? null,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "X-API-Version": "v1",
        },
      })
      .then(({ error }) => {
        if (error) console.warn("[audit] Failed to log event:", error.message);
      })
      .catch((err) => {
        console.warn("[audit] Fire-and-forget error:", err);
      });
  });
}
