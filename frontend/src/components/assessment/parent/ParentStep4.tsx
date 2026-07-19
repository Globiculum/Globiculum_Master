import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Globe,
  Heart,
  Landmark,
  Languages,
  LifeBuoy,
  LineChart,
  MessageCircle,
  Phone,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import SectionContainer from "../shared/SectionContainer";
import QuestionCard from "../shared/QuestionCard";
import ConcernCards from "../shared/ConcernCards";
import SupportCards from "../shared/SupportCards";
import type { ParentStepProps } from "./types";

// Step 4: Concerns & Support.
// Transition Concerns / Support Needs are ported verbatim from
// AssessmentForm.tsx's renderEducationalAssessment(). "Additional Notes" is
// a NEW frontend-only field (no equivalent existed before) — captured here
// but deliberately excluded from parentMapper.ts's payload, so it cannot
// affect backend compatibility.

const TRANSITION_CONCERNS = [
  { value: "Academic rigor differences", icon: BarChart3 },
  { value: "Language barriers (Hindi/Regional)", icon: Languages },
  { value: "Cultural integration challenges", icon: Globe },
  { value: "Assessment style adaptation", icon: ClipboardList },
  { value: "Peer interaction difficulties", icon: Users },
  { value: "Teacher-student relationship norms", icon: UserCheck },
  { value: "Homework expectations", icon: BookOpen },
  { value: "Extracurricular differences", icon: Trophy },
];

const SUPPORT_NEEDS = [
  { value: "1-on-1 tutoring sessions", icon: GraduationCap },
  { value: "Peer learning groups", icon: Users },
  { value: "Worksheets & practice papers", icon: FileText },
  { value: "Mock tests", icon: ClipboardCheck },
  { value: "Group study programs", icon: MessageCircle },
  { value: "Parent counseling calls", icon: Phone },
  { value: "Cultural mentorship", icon: Heart },
  { value: "Regular progress tracking", icon: LineChart },
  { value: "Emergency academic support", icon: LifeBuoy },
  { value: "College admission guidance", icon: Landmark },
];

const ParentStep4 = ({ formData, onFieldChange, onArrayToggle }: ParentStepProps) => {
  return (
    <div className="space-y-10">
      <SectionContainer title="Primary Transition Concerns" description="What worries you most about the move?">
        <ConcernCards options={TRANSITION_CONCERNS} selected={formData.transitionConcerns} onToggle={(value) => onArrayToggle("transitionConcerns", value)} />
      </SectionContainer>

      <SectionContainer title="Support Preferences" description="What kind of support would help your family most?">
        <SupportCards options={SUPPORT_NEEDS} selected={formData.supportNeeds} onToggle={(value) => onArrayToggle("supportNeeds", value)} />
      </SectionContainer>

      <QuestionCard label="Additional Notes" htmlFor="additional-notes" hint="Optional — frontend-only for now, not yet sent to the report generator.">
        <Textarea
          id="additional-notes"
          rows={4}
          placeholder="Anything else you'd like us to know about your child's transition..."
          value={formData.additionalNotes}
          onChange={(e) => onFieldChange("additionalNotes", e.target.value)}
        />
      </QuestionCard>
    </div>
  );
};

export default ParentStep4;
