import { Textarea } from "@/components/ui/textarea";
import SectionCard from "../shared/SectionCard";
import SectionContainer from "../shared/SectionContainer";
import QuestionCard from "../shared/QuestionCard";
import ConcernCards from "../shared/ConcernCards";
import SupportCards from "../shared/SupportCards";
import VoiceInputButton from "../shared/VoiceInputButton";
import type { ParentStepProps } from "./types";
import nervousIcon from "@/assets/icons-3d/nervous.png";
import areasToImproveIcon from "@/assets/icons-3d/areas-to-improve.png";
import wrapupIcon from "@/assets/icons-3d/wrapup.png";
import communicationIcon from "@/assets/icons-3d/communication.png";
import profileIcon from "@/assets/icons-3d/profile.png";
import curriculumIcon from "@/assets/icons-3d/curriculum.png";
import reviewIcon from "@/assets/icons-3d/review.png";
import emotionalWellbeingIcon from "@/assets/icons-3d/emotional-wellbeing.png";
import learningStyleIcon from "@/assets/icons-3d/learning-style.png";
import notesIcon from "@/assets/icons-3d/notes.png";
import targetGradeIcon from "@/assets/icons-3d/target-grade.png";
import childProfileIcon from "@/assets/icons-3d/child-profile.png";
import supportAtHomeIcon from "@/assets/icons-3d/support-at-home.png";

// Step 4: Concerns & Support.
// "Additional Notes" is a frontend-only field — deliberately excluded from
// parentMapper.ts's payload, so it cannot affect backend compatibility.
//
// Icons: each option maps to the closest fit among the existing 3D icon
// family (frontend/src/assets/icons-3d/) rather than a literal 1:1 asset
// per option — semantic accuracy took priority over per-option uniqueness,
// per explicit instruction. Every option within each grid still gets its
// own distinct icon (no repeats within a single grid).

const TRANSITION_CONCERNS = [
  { value: "Academic rigor gap", icon: areasToImproveIcon },
  { value: "Exam style shift", icon: wrapupIcon },
  { value: "Language barriers", icon: communicationIcon },
  { value: "Classroom culture", icon: profileIcon },
  { value: "Peer adjustment", icon: nervousIcon },
  { value: "Homework pressure", icon: curriculumIcon },
  { value: "Finding a tutor", icon: reviewIcon },
  { value: "Child confidence", icon: emotionalWellbeingIcon },
];

const SUPPORT_NEEDS = [
  { value: "1-on-1 tutoring", icon: learningStyleIcon },
  { value: "Worksheets", icon: notesIcon },
  { value: "Mock Tests", icon: targetGradeIcon },
  { value: "Peer Study", icon: childProfileIcon },
  { value: "Video Lessons", icon: curriculumIcon },
  { value: "Parent Counselling", icon: communicationIcon },
  { value: "Progress Tracking", icon: areasToImproveIcon },
  { value: "Emergency Support", icon: supportAtHomeIcon },
];

const ParentStep4 = ({ formData, onFieldChange, onArrayToggle, fieldErrors }: ParentStepProps) => {
  const childFirstName = formData.childName.trim();
  const title = childFirstName ? `Supporting ${childFirstName}` : "Support";

  return (
    <SectionCard icon={nervousIcon} title={title} description="What concerns you, and how can we help?">
      <SectionContainer
        title="Biggest Concerns"
        description="What worries you most about the move?"
        required
        error={fieldErrors.transitionConcerns}
      >
        <ConcernCards options={TRANSITION_CONCERNS} selected={formData.transitionConcerns} onToggle={(value) => onArrayToggle("transitionConcerns", value)} />
      </SectionContainer>

      <SectionContainer title="Preferred Support" description="What kind of support would help your family most?">
        <SupportCards options={SUPPORT_NEEDS} selected={formData.supportNeeds} onToggle={(value) => onArrayToggle("supportNeeds", value)} />
      </SectionContainer>

      <QuestionCard
        label="Additional Notes"
        htmlFor="additional-notes"
        optional
        tooltip="Share anything else about your child's transition that would help us tailor the report."
      >
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
    </SectionCard>
  );
};

export default ParentStep4;
