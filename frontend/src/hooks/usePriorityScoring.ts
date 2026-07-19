import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface GapInput {
  id: string;
  subject: string;
  topic: string;
  gapType: "content" | "depth" | "timing" | "approach";
  currentMastery: number;
  targetMastery: number;
}

interface PrioritizedGap {
  id: string;
  subject: string;
  topic: string;
  priorityScore: number;
  priorityRank: number;
  priorityLevel: "critical" | "high" | "medium" | "low";
  estimatedTimeToClose: string;
  suggestedSequence: number;
  dependencies: string[];
  blockedBy: string[];
}

interface PriorityScoringResult {
  prioritizedGaps: PrioritizedGap[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalEstimatedHours: number;
    recommendedSequence: string[];
  };
}

interface ScoringContext {
  targetCurriculum: string;
  gradeLevel: number;
  transitionTimeline: "immediate" | "short" | "medium" | "long";
}

export const usePriorityScoring = (
  gaps: GapInput[] | null,
  studentProfileId: string | null,
  context: ScoringContext | null
) => {
  const [data, setData] = useState<PriorityScoringResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gaps || gaps.length === 0 || !studentProfileId || !context) return;

    let cancelled = false;
    const fetchPriorities = async () => {
      setLoading(true);
      try {
        const { data: resp, error } = await supabase.functions.invoke("priority-scoring", {
          body: {
            studentId: studentProfileId,
            gaps,
            context,
          },
        });

        if (cancelled) return;
        if (error) throw error;
        if (resp?.success && resp.data) {
          setData(resp.data);
        } else if (resp?.error) {
          throw new Error(resp.error);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Priority scoring error:", err);
          toast({
            title: "Could not load priority data",
            description: err?.message || "Please try again later.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPriorities();
    return () => { cancelled = true; };
  }, [gaps, studentProfileId, context]);

  return { data, loading };
};

export type { PrioritizedGap, PriorityScoringResult, GapInput, ScoringContext };
