import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAlignmentData } from "@/hooks/useAlignmentData";
import { usePriorityScoring } from "@/hooks/usePriorityScoring";
import { useAlerts } from "@/hooks/useAlerts";
import type { GapInput, ScoringContext } from "@/hooks/usePriorityScoring";
import {
  AlignmentOverviewCard,
  SubjectAlignmentsCard,
  RecommendationsCard,
} from "@/components/dashboard/AlignmentOverview";
import { PrioritizedGapsCard } from "@/components/dashboard/PrioritizedGapsCard";
import KnowledgeGraphView from "@/components/KnowledgeGraphView";
import LearningProgressChart from "@/components/dashboard/LearningProgressChart";
import BookSessionModal from "@/components/dashboard/BookSessionModal";
import MySessionsCard from "@/components/dashboard/MySessionsCard";
import InviteGuardianModal from "@/components/dashboard/InviteGuardianModal";
import { 
  BarChart3,
  BookOpen, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Globe, 
  GraduationCap, 
  MessageSquare, 
  Target,
  TrendingUp,
  Video,
  Bell,
  Award,
  FileText,
  Settings,
  UserPlus
} from "lucide-react";

const Dashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sessionRefresh, setSessionRefresh] = useState(0);
  const { alerts, unreadCount, markAsRead } = useAlerts();

  const { alignmentData, loading: alignmentLoading, studentProfile } = useAlignmentData();

  // Build gaps + context for priority-scoring from alignment data
  const gapInputs: GapInput[] | null = useMemo(() => {
    if (!alignmentData?.gaps || alignmentData.gaps.length === 0) return null;
    return alignmentData.gaps.map((g) => ({
      id: g.id,
      subject: g.subject,
      topic: g.topic,
      gapType: g.gapType,
      currentMastery: g.severity === "critical" ? 20 : g.severity === "moderate" ? 50 : 70,
      targetMastery: 85,
    }));
  }, [alignmentData?.gaps]);

  const scoringContext: ScoringContext | null = useMemo(() => {
    if (!studentProfile) return null;
    const gradeLevel = parseInt(studentProfile.current_grade.replace(/\D/g, ""), 10) || 8;
    const tl = studentProfile.transition_timeline?.toLowerCase() || "medium";
    const timeline: ScoringContext["transitionTimeline"] =
      tl.includes("immedi") ? "immediate"
      : tl.includes("short") || tl.includes("3") || tl.includes("month") ? "short"
      : tl.includes("long") || tl.includes("year") ? "long"
      : "medium";
    return {
      targetCurriculum: studentProfile.target_curriculum,
      gradeLevel: Math.min(Math.max(gradeLevel, 1), 12),
      transitionTimeline: timeline,
    };
  }, [studentProfile]);

  const { data: priorityData, loading: priorityLoading } = usePriorityScoring(
    gapInputs,
    studentProfile?.id ?? null,
    scoringContext
  );

  useEffect(() => {
    const checkAdminRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });
        setIsAdmin(!!data);
      }
    };
    checkAdminRole();
  }, []);
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Your <span className="text-primary">Globiculum Dashboard</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Write dashboard content for parents and students, covering gap report, learning plan, culture modules, alerts, and booking.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
          {/* Transition Readiness - from alignment-engine */}
          <AlignmentOverviewCard
            overallAlignment={alignmentData?.overallAlignment ?? 0}
            loading={alignmentLoading}
          />

          {/* Subject Alignment - from alignment-engine */}
          <SubjectAlignmentsCard
            subjectAlignments={alignmentData?.subjectAlignments ?? []}
            loading={alignmentLoading}
          />

          {/* Preparation Steps - from alignment-engine */}
          <RecommendationsCard
            recommendations={alignmentData?.recommendations ?? []}
            loading={alignmentLoading}
          />
          {/* Priority Learning Path - from priority-scoring engine */}
          <PrioritizedGapsCard
            gaps={priorityData?.prioritizedGaps ?? []}
            loading={alignmentLoading || priorityLoading}
          />

          {/* Parent Alerts - Live */}
          <Card className="shadow-medium border-0 bg-gradient-card hover:shadow-strong transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Bell className="h-8 w-8 text-warning" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="bg-destructive/10 text-destructive">
                    {unreadCount} New
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl">Parent Alerts</CardTitle>
              <CardDescription>
                Important reminders, assessment results, upcoming events.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No alerts yet</p>
                ) : (
                  alerts.slice(0, 5).map((alert) => {
                    const colorMap: Record<string, { bg: string; dot: string }> = {
                      high: { bg: "bg-destructive/10 border-destructive/20", dot: "bg-destructive" },
                      urgent: { bg: "bg-destructive/10 border-destructive/20", dot: "bg-destructive" },
                      medium: { bg: "bg-amber-500/10 border-amber-500/20", dot: "bg-amber-500" },
                      low: { bg: "bg-blue-500/10 border-blue-500/20", dot: "bg-blue-500" },
                    };
                    const colors = colorMap[alert.priority] || colorMap.low;

                    return (
                      <button
                        key={alert.id}
                        onClick={() => markAsRead(alert.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-opacity ${colors.bg} ${alert.read ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${colors.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${alert.read ? "font-normal" : "font-medium"}`}>{alert.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                          </div>
                          {!alert.read && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">New</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              
              <Button className="w-full" variant="outline" size="sm">
                View All Alerts
                <MessageSquare className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* My Sessions - Live Data */}
          <MySessionsCard
            refreshTrigger={sessionRefresh}
            onBookClick={() => setBookingOpen(true)}
          />

          {/* Quick Stats Card */}
          <Card className="shadow-medium border-0 bg-gradient-card hover:shadow-strong transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <TrendingUp className="h-8 w-8 text-success" />
                <Badge variant="secondary" className="bg-success/10 text-success">Progress</Badge>
              </div>
              <CardTitle className="text-xl">Overall Progress</CardTitle>
              <CardDescription>
                Your child's learning journey overview and achievements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-primary/10">
                  <div className="text-2xl font-bold text-primary">78%</div>
                  <div className="text-xs text-muted-foreground">Overall Mastery</div>
                </div>
                
                <div className="text-center p-3 rounded-lg bg-success/10">
                  <div className="text-2xl font-bold text-success">24</div>
                  <div className="text-xs text-muted-foreground">Topics Completed</div>
                </div>
                
                <div className="text-center p-3 rounded-lg bg-accent/10">
                  <div className="text-2xl font-bold text-accent-contrast">12</div>
                  <div className="text-xs text-muted-foreground">Weeks Active</div>
                </div>
                
                <div className="text-center p-3 rounded-lg bg-warning/10">
                  <div className="text-2xl font-bold text-warning">5</div>
                  <div className="text-xs text-muted-foreground">Certificates</div>
                </div>
              </div>
              
              <Button className="w-full" variant="outline" size="sm">
                Download Progress Report
                <BarChart3 className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Learning Progress Chart */}
        <div className="mt-8">
          <LearningProgressChart />
        </div>

        {/* Knowledge Graph */}
        {studentProfile && scoringContext && (
          <div className="mt-8 grid grid-cols-1 gap-6">
            <KnowledgeGraphView
              gradeLevel={scoringContext.gradeLevel}
              targetCurriculum={scoringContext.targetCurriculum}
              gapTopics={alignmentData?.gaps?.map((g) => g.topic) ?? []}
              masteredTopics={alignmentData?.subjectAlignments
                ?.filter((s) => s.alignmentScore >= 80)
                .map((s) => s.subject) ?? []}
            />
          </div>
        )}

        {/* Admin Panel - Only visible to admins */}
        {isAdmin && (
          <div className="mt-8">
            <Card className="shadow-medium border-2 border-primary/20 bg-gradient-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Settings className="h-8 w-8 text-primary" />
                  <Badge variant="secondary" className="bg-primary/10 text-primary">Admin</Badge>
                </div>
                <CardTitle className="text-xl">Admin Tools</CardTitle>
                <CardDescription>
                  Access administrative features and content management tools.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/content-export">
                  <Button className="w-full bg-gradient-primary" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Export Content Documentation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Guardian Invite + CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-primary/10 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Share Access with a Guardian</h3>
            <p className="text-muted-foreground mb-6">
              Invite a family member or guardian to view your child's progress in read-only mode.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-primary"
                onClick={() => setInviteOpen(true)}
                disabled={!studentProfile}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Invite Guardian
              </Button>
              <Button variant="outline" size="lg">
                Watch Tutorial
                <Video className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Book Session Modal */}
      <BookSessionModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        gapSubjects={alignmentData?.subjectAlignments
          ?.filter((s) => s.alignmentScore < 60)
          .map((s) => s.subject) ?? []}
        onBooked={() => setSessionRefresh((n) => n + 1)}
      />

      {/* Invite Guardian Modal */}
      <InviteGuardianModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        studentProfileId={studentProfile?.id ?? null}
      />
    </section>
  );
};

export default Dashboard;