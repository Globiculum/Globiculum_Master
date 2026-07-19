import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GuardianStudent {
  studentUserId: string;
  studentName: string;
  studentProfileId: string;
  relationshipId: string;
}

export function useGuardianMode() {
  const [isGuardian, setIsGuardian] = useState(false);
  const [guardianStudents, setGuardianStudents] = useState<GuardianStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<GuardianStudent | null>(null);
  const [loading, setLoading] = useState(true);

  const checkGuardianStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsGuardian(false);
        setLoading(false);
        return;
      }

      // Check if user has their own student profile (they're a parent/student)
      const { data: ownProfile } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      // If they have their own profile, they're not a guardian-only user
      if (ownProfile) {
        setIsGuardian(false);
        setLoading(false);
        return;
      }

      // Check for pending invitations and auto-accept them
      const { data: pendingInvites } = await supabase
        .from("guardian_invitations" as any)
        .select("id, parent_user_id, student_profile_id")
        .eq("guardian_email", user.email)
        .eq("status", "pending");

      if (pendingInvites && pendingInvites.length > 0) {
        for (const invite of pendingInvites) {
          // Get the student's user_id from the student profile
          const { data: studentProfile } = await supabase
            .from("student_profiles")
            .select("user_id")
            .eq("id", (invite as any).student_profile_id)
            .single();

          if (studentProfile) {
            // Create guardian_relationship
            const { error: relError } = await supabase
              .from("guardian_relationships")
              .insert({
                guardian_user_id: user.id,
                student_user_id: studentProfile.user_id,
                relationship_type: "guardian",
                access_level: "limited",
                verified: true,
                verified_at: new Date().toISOString(),
              });

            if (!relError) {
              // Mark invitation as accepted
              await supabase
                .from("guardian_invitations" as any)
                .update({ status: "accepted", accepted_at: new Date().toISOString() } as any)
                .eq("id", (invite as any).id);
            }
          }
        }
      }

      // Check verified guardian relationships
      const { data: relationships } = await supabase
        .from("guardian_relationships")
        .select("id, student_user_id")
        .eq("guardian_user_id", user.id)
        .eq("verified", true);

      if (relationships && relationships.length > 0) {
        const students: GuardianStudent[] = [];
        for (const rel of relationships) {
          // Check expiry
          if ((rel as any).expires_at && new Date((rel as any).expires_at) < new Date()) continue;

          const { data: profile } = await supabase
            .from("student_profiles")
            .select("id, student_name")
            .eq("user_id", rel.student_user_id)
            .maybeSingle();

          if (profile) {
            students.push({
              studentUserId: rel.student_user_id,
              studentName: profile.student_name,
              studentProfileId: profile.id,
              relationshipId: rel.id,
            });
          }
        }

        if (students.length > 0) {
          setIsGuardian(true);
          setGuardianStudents(students);
          setSelectedStudent(students[0]);
        }
      }
    } catch (err) {
      console.error("Guardian mode check error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkGuardianStatus();
  }, [checkGuardianStatus]);

  return {
    isGuardian,
    guardianStudents,
    selectedStudent,
    setSelectedStudent,
    loading,
    refresh: checkGuardianStatus,
  };
}
