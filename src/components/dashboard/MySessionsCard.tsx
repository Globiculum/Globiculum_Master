import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Loader2, Video } from "lucide-react";
import { format, isPast } from "date-fns";

interface TutorSession {
  id: string;
  subject: string;
  session_type: string;
  scheduled_at: string;
  notes: string | null;
  status: string;
}

interface MySessionsCardProps {
  refreshTrigger?: number;
  onBookClick?: () => void;
}

const MySessionsCard = ({ refreshTrigger, onBookClick }: MySessionsCardProps) => {
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tutor_sessions" as any)
      .select("id, subject, session_type, scheduled_at, notes, status")
      .eq("user_id", userData.user.id)
      .order("scheduled_at", { ascending: true })
      .limit(5);

    if (!error && data) {
      setSessions(data as unknown as TutorSession[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]);

  const getStatusBadge = (status: string, scheduledAt: string) => {
    const past = isPast(new Date(scheduledAt));
    if (status === "cancelled") {
      return <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">Cancelled</Badge>;
    }
    if (status === "confirmed") {
      return <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Confirmed</Badge>;
    }
    if (past) {
      return <Badge variant="secondary" className="text-xs">Past</Badge>;
    }
    return <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">Pending</Badge>;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "diagnostic": return "Diagnostic";
      case "tutoring": return "Tutoring";
      case "consultation": return "Consultation";
      default: return type;
    }
  };

  const upcomingSessions = sessions.filter(
    (s) => s.status !== "cancelled" && !isPast(new Date(s.scheduled_at))
  );

  return (
    <Card className="shadow-medium border-0 bg-gradient-card hover:shadow-strong transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Calendar className="h-8 w-8 text-primary" />
          {upcomingSessions.length > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {upcomingSessions.length} Upcoming
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl">My Sessions</CardTitle>
        <CardDescription>Your upcoming tutoring and consultation sessions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-6">
            <Video className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No sessions booked yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="p-3 rounded-lg border bg-background/50 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{session.subject}</span>
                  {getStatusBadge(session.status, session.scheduled_at)}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(session.scheduled_at), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(session.scheduled_at), "h:mm a")}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {getTypeLabel(session.session_type)}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <Button className="w-full" size="sm" onClick={onBookClick}>
          Book a New Session
          <Calendar className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default MySessionsCard;
