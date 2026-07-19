import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Alert {
  id: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  read: boolean;
  created_at: string;
  user_id: string;
}

const priorityToastStyle: Record<string, { className: string }> = {
  high: { className: "border-destructive bg-destructive/10" },
  urgent: { className: "border-destructive bg-destructive/10" },
  medium: { className: "border-amber-500 bg-amber-500/10" },
  low: { className: "border-blue-500 bg-blue-500/10" },
};

export const useAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const unreadCount = alerts.filter((a) => !a.read).length;

  // Fetch existing alerts
  const fetchAlerts = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setAlerts(data as Alert[]);
    }
  }, []);

  // Mark single alert as read
  const markAsRead = useCallback(async (alertId: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ read: true })
      .eq("id", alertId);

    if (!error) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
      );
    }
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const uid = session.user.id;
      setUserId(uid);
      await fetchAlerts(uid);

      // Realtime subscription filtered by user_id
      channel = supabase
        .channel("user-alerts")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "alerts",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const newAlert = payload.new as Alert;
            setAlerts((prev) => [newAlert, ...prev]);

            // Show toast with priority color
            const style = priorityToastStyle[newAlert.priority] || priorityToastStyle.low;
            toast(newAlert.title, {
              description: newAlert.message,
              className: style.className,
            });
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchAlerts]);

  return { alerts, unreadCount, markAsRead, userId };
};
