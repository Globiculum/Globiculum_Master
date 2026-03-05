import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

interface AlignmentGap {
  id: string;
  subject: string;
  topic: string;
  gapType: "content" | "depth" | "timing" | "approach";
  severity: "critical" | "moderate" | "minor";
  description: string;
  bridgeTime: string;
}

interface AlignmentData {
  overallAlignment: number;
  subjectAlignments: SubjectAlignment[];
  gaps: AlignmentGap[];
  recommendations: AlignmentRecommendation[];
  timestamp: string;
}

interface CurriculumAnalysis {
  overallAlignment?: { percentage?: number; subjectsNeedingBridge?: string[]; estimatedDuration?: string };
  subjectAnalysis?: Array<{ subject: string; topicsCovered: number; totalTopics: number; alignmentLevel: string; keyGaps: string[] }>;
  criticalGaps?: string[];
  bridgeTimeline?: Record<string, { name: string; duration: string; bullets: string[] }>;
  recommendations?: { study?: string[]; skillStrategy?: string[]; resources?: string[]; culturalLanguage?: string[] };
}

interface StudentProfile {
  id: string;
  previous_curriculum: string;
  target_curriculum: string;
  current_grade: string;
  transition_timeline: string | null;
  curriculum_analysis: CurriculumAnalysis | null;
}

export const useAlignmentData = () => {
  const [alignmentData, setAlignmentData] = useState<AlignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    const fetchAlignment = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        // Fetch student profile
        const { data: profile, error: profileError } = await supabase
          .from("student_profiles")
          .select("id, previous_curriculum, target_curriculum, current_grade, transition_timeline, curriculum_analysis")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile) {
          setLoading(false);
          return;
        }

        const typedProfile: StudentProfile = {
          id: profile.id,
          previous_curriculum: profile.previous_curriculum,
          target_curriculum: profile.target_curriculum,
          current_grade: profile.current_grade,
          transition_timeline: profile.transition_timeline,
          curriculum_analysis: (profile as any).curriculum_analysis ?? null,
        };
        setStudentProfile(typedProfile);

        // Parse grade level number from string like "Grade 10" or "10"
        const gradeLevel = parseInt(profile.current_grade.replace(/\D/g, ""), 10) || 8;

        // Call alignment-engine edge function
        const { data, error } = await supabase.functions.invoke("alignment-engine", {
          body: {
            sourceCurriculum: profile.previous_curriculum,
            targetCurriculum: profile.target_curriculum,
            gradeLevel: Math.min(Math.max(gradeLevel, 1), 12),
          },
        });

        if (error) throw error;

        if (data?.success && data.data) {
          setAlignmentData(data.data);
        } else if (data?.error) {
          throw new Error(data.error);
        } else if (typedProfile.curriculum_analysis) {
          // Fallback: use pre-populated curriculum_analysis from onboarding
          const ca = typedProfile.curriculum_analysis;
          const fallback: AlignmentData = {
            overallAlignment: ca.overallAlignment?.percentage ?? 0,
            subjectAlignments: (ca.subjectAnalysis ?? []).map((s) => ({
              subject: s.subject,
              alignmentScore: Math.round((s.topicsCovered / Math.max(s.totalTopics, 1)) * 100),
              sourceCoverage: s.topicsCovered,
              targetCoverage: s.totalTopics,
              gapCount: s.keyGaps?.length ?? 0,
              overlapCount: s.topicsCovered,
            })),
            gaps: (ca.criticalGaps ?? []).map((desc, i) => ({
              id: `ca-gap-${i}`,
              subject: ca.subjectAnalysis?.[0]?.subject ?? "general",
              topic: desc,
              gapType: "content" as const,
              severity: i < 2 ? "critical" as const : "moderate" as const,
              description: desc,
              bridgeTime: ca.overallAlignment?.estimatedDuration ?? "3-6 months",
            })),
            recommendations: (ca.recommendations?.study ?? []).slice(0, 3).map((action, i) => ({
              priority: i + 1,
              subject: ca.subjectAnalysis?.[i]?.subject ?? "general",
              action,
              timeEstimate: ca.overallAlignment?.estimatedDuration ?? "3-6 months",
              resources: ca.recommendations?.resources ?? [],
            })),
            timestamp: new Date().toISOString(),
          };
          setAlignmentData(fallback);
        }
      } catch (err: any) {
        console.error("Alignment fetch error:", err);
        toast({
          title: "Could not load alignment data",
          description: err?.message || "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAlignment();
  }, []);

  return { alignmentData, loading, studentProfile };
};
