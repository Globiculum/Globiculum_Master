import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Target, AlertTriangle } from "lucide-react";

interface SubjectAlignment {
  subject: string;
  alignmentScore: number;
  sourceCoverage: number;
  targetCoverage: number;
  gapCount: number;
  overlapCount: number;
}

interface AlignmentRecommendation {
  priority: number;
  subject: string;
  action: string;
  timeEstimate: string;
  resources: string[];
}

interface AlignmentOverviewProps {
  overallAlignment: number;
  subjectAlignments: SubjectAlignment[];
  recommendations: AlignmentRecommendation[];
  loading: boolean;
}

const getScoreColor = (score: number) => {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
};

const getScoreLabel = (score: number) => {
  if (score >= 75) return "Well Prepared";
  if (score >= 50) return "Some Preparation Needed";
  return "Key Areas to Prepare";
};

const getPriorityVariant = (priority: number): "default" | "secondary" | "destructive" | "outline" => {
  if (priority === 1) return "destructive";
  if (priority === 2) return "default";
  return "secondary";
};

const getPriorityLabel = (priority: number) => {
  if (priority === 1) return "High";
  if (priority === 2) return "Medium";
  return "Low";
};

const formatSubjectName = (subject: string) =>
  subject.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const AlignmentOverviewCard = ({ overallAlignment, loading }: { overallAlignment: number; loading: boolean }) => {
  if (loading) {
    return (
      <Card className="shadow-medium border-0 bg-gradient-card">
        <CardHeader>
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-48 mt-2" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-20 mx-auto" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium border-0 bg-gradient-card hover:shadow-strong transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <BarChart3 className="h-8 w-8 text-primary" />
          <Badge variant="secondary" className="bg-primary/10 text-primary">Live</Badge>
        </div>
        <CardTitle className="text-xl">Transition Readiness</CardTitle>
        <CardDescription>
          Overall alignment between your current and target curriculum
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-4xl font-bold ${getScoreColor(overallAlignment)}`}>
            {overallAlignment}%
          </div>
          <p className="text-sm text-muted-foreground mt-1">{getScoreLabel(overallAlignment)}</p>
        </div>
        <Progress value={overallAlignment} className="h-3" />
      </CardContent>
    </Card>
  );
};

export const SubjectAlignmentsCard = ({ subjectAlignments, loading }: { subjectAlignments: SubjectAlignment[]; loading: boolean }) => {
  if (loading) {
    return (
      <Card className="shadow-medium border-0 bg-gradient-card">
        <CardHeader>
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-40 mt-2" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium border-0 bg-gradient-card hover:shadow-strong transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Target className="h-8 w-8 text-success" />
          <Badge variant="secondary" className="bg-success/10 text-success">
            {subjectAlignments.length} Subjects
          </Badge>
        </div>
        <CardTitle className="text-xl">Subject Alignment</CardTitle>
        <CardDescription>
          Readiness score by subject area
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subjectAlignments.map((sa) => (
          <div key={sa.subject} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{formatSubjectName(sa.subject)}</span>
              <div className="flex items-center gap-2">
                {sa.gapCount > 0 && (
                  <span className="text-xs text-muted-foreground">{sa.gapCount} gap{sa.gapCount !== 1 ? "s" : ""}</span>
                )}
                <span className={`text-sm font-semibold ${getScoreColor(sa.alignmentScore)}`}>
                  {sa.alignmentScore}%
                </span>
              </div>
            </div>
            <Progress value={sa.alignmentScore} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export const RecommendationsCard = ({ recommendations, loading }: { recommendations: AlignmentRecommendation[]; loading: boolean }) => {
  const top3 = recommendations.slice(0, 3);

  if (loading) {
    return (
      <Card className="shadow-medium border-0 bg-gradient-card">
        <CardHeader>
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-52 mt-2" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium border-0 bg-gradient-card hover:shadow-strong transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <TrendingUp className="h-8 w-8 text-warning" />
          <Badge variant="secondary" className="bg-warning/10 text-warning">
            {recommendations.length} Action{recommendations.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <CardTitle className="text-xl">Preparation Steps</CardTitle>
        <CardDescription>
          Priority areas to focus on for a smooth transition
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {top3.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No specific preparation steps identified — great progress!
          </p>
        )}
        {top3.map((rec) => (
          <div
            key={rec.priority}
            className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{rec.action}</span>
              </div>
              <Badge variant={getPriorityVariant(rec.priority)}>
                {getPriorityLabel(rec.priority)}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatSubjectName(rec.subject)}</span>
              <span>·</span>
              <span>{rec.timeEstimate}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
