import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Globe,
  Heart,
  HeartHandshake,
  LifeBuoy,
  LineChart,
  Phone,
  Search,
  Users,
  Video,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import SectionContainer from "../shared/SectionContainer";
import QuestionCard from "../shared/QuestionCard";
import ConcernCards from "../shared/ConcernCards";
import SupportCards from "../shared/SupportCards";
import VoiceInputButton from "../shared/VoiceInputButton";
import type { ParentStepProps } from "./types";

// Step 4: Concerns & Support.
// "Additional Notes" is a frontend-only field — deliberately excluded from
// parentMapper.ts's payload, so it cannot affect backend compatibility.

const TRANSITION_CONCERNS = [
  { value: "Academic rigor gap", icon: BarChart3 },
  { value: "Exam style shift", icon: ClipboardList },
  { value: "Language barriers", icon: Globe },
  { value: "Classroom culture", icon: Users },
  { value: "Peer adjustment", icon: Heart },
  { value: "Homework pressure", icon: BookOpen },
  { value: "Finding a tutor", icon: Search },
  { value: "Child confidence", icon: Heart },
];

const SUPPORT_NEEDS = [
  { value: "1-on-1 tutoring", icon: GraduationCap },
  { value: "Worksheets", icon: FileText },
  { value: "Mock Tests", icon: ClipboardCheck },
  { value: "Peer Study", icon: Users },
  { value: "Video Lessons", icon: Video },
  { value: "Parent Counselling", icon: Phone },
  { value: "Progress Tracking", icon: LineChart },
  { value: "Emergency Support", icon: LifeBuoy },
];

const ParentStep4 = ({ formData, onFieldChange, onArrayToggle }: ParentStepProps) => {
  return (
    <SectionContainer variant="card" icon={HeartHandshake} title="Support" description="What concerns you, and how can we help?">
      <SectionContainer title="Biggest Concerns" description="What worries you most about the move?">
        <ConcernCards options={TRANSITION_CONCERNS} selected={formData.transitionConcerns} onToggle={(value) => onArrayToggle("transitionConcerns", value)} />
      </SectionContainer>

      <SectionContainer title="Preferred Support" description="What kind of support would help your family most?">
        <SupportCards options={SUPPORT_NEEDS} selected={formData.supportNeeds} onToggle={(value) => onArrayToggle("supportNeeds", value)} />
      </SectionContainer>

      <QuestionCard label="Additional Notes" htmlFor="additional-notes" hint="Optional — frontend-only for now, not yet sent to the report generator.">
        <div className="relative">
          <Textarea
            id="additional-notes"
            rows={4}
            placeholder="Anything else you'd like us to know about your child's transition..."
            value={formData.additionalNotes}
            onChange={(e) => onFieldChange("additionalNotes", e.target.value)}
            className="pr-12"
          />
          <VoiceInputButton
            label="Say your notes"
            onResult={(text) => onFieldChange("additionalNotes", formData.additionalNotes ? `${formData.additionalNotes} ${text}` : text)}
            className="absolute right-2 top-2"
          />
        </div>
      </QuestionCard>
    </SectionContainer>
  );
};

export default ParentStep4;
