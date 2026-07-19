import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListOrdered, Clock, Play, AlertTriangle } from "lucide-react";
import type { PrioritizedGap } from "@/hooks/usePriorityScoring";

const priorityConfig = {
  critical: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    dot: "bg-destructive",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    label: "Critical",
  },
  high: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    dot: "bg-warning",
    badge: "bg-warning/15 text-warning border-warning/30",
    label: "High",
  },
  medium: {
    bg: "bg-[hsl(45,93%,47%)]/10",
    border: "border-[hsl(45,93%,47%)]/30",
    dot: "bg-[hsl(45,93%,47%)]",
    badge: "bg-[hsl(45,93%,47%)]/15 text-[hsl(45,93%,47%)] border-[hsl(45,93%,47%)]/30",
    label: "Medium",
  },
  low: {
    bg: "bg-success/10",
    border: "border-success/30",
    dot: "bg-success",
    badge: "bg-success/15 text-success border-success/30",
    label: "Low",
  },
} as const;

const formatSubject = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface PrioritizedGapsCardProps {
  gaps: PrioritizedGap[];
  loading: boolean;
}

export const PrioritizedGapsCard = ({ gaps, loading }: PrioritizedGapsCardProps) => {
  if (loading) {
    return (
      <Card className="shadow-medium border-0 bg-gradient-card lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-52 mt-2" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (gaps.length === 0) return null;

  return (
    <Card className="shadow-medium border-0 bg-gradient-card hover:shadow-strong transition-all lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <ListOrdered className="h-8 w-8 text-primary" />
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {gaps.length} Gap{gaps.length !== 1 ? "s" : ""} Ranked
          </Badge>
        </div>
        <CardTitle className="text-xl">Priority Learning Path</CardTitle>
        <CardDescription>
          Gaps ranked by importance — focus on the top items first for maximum readiness
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {gaps.map((gap) => {
          const cfg = priorityConfig[gap.priorityLevel];
          return (
            <div
              key={gap.id}
              className={`p-4 rounded-lg border ${cfg.bg} ${cfg.border} flex items-start gap-4`}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-sm font-bold text-foreground">
                {gap.priorityRank}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {gap.topic}
                  </span>
                  <Badge variant="outline" className={cfg.badge}>
                    {cfg.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatSubject(gap.subject)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {gap.estimatedTimeToClose}
                  </span>
                  {gap.dependencies.length > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {gap.dependencies.length} prerequisite{gap.dependencies.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Action */}
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 gap-1"
              >
                <Play className="h-3 w-3" />
                Start Learning
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
