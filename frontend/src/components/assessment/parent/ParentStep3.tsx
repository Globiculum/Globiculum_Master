import SectionCard from "../shared/SectionCard";
import learningStyleIcon from "@/assets/icons-3d/learning-style.png";
import ParentLearningProfileWizard from "./ParentLearningProfileWizard";
import type { ParentStepProps } from "./types";

// Step 3: Learning Profile.
//
// Phase D: converted into the same flashcard/iterative pattern as School
// Profile and Academic Path — every question's wording is unchanged from
// the previous static form (see ParentLearningProfileWizard.tsx), only the
// presentation changed.

const ParentStep3 = ({ formData, onFieldChange, onArrayToggle, fieldErrors }: ParentStepProps) => {
  const childFirstName = formData.childName.trim();
  const subtitle = childFirstName ? `Help us understand how ${childFirstName} learns best.` : "Help us understand your child's learning profile.";

  return (
    <SectionCard icon={learningStyleIcon} title="Learning Profile" description="Help us understand your child's learning profile.">
      <div className="-mt-4 text-sm text-muted-foreground">{subtitle}</div>
      <ParentLearningProfileWizard formData={formData} onFieldChange={onFieldChange} onArrayToggle={onArrayToggle} fieldErrors={fieldErrors} />
    </SectionCard>
  );
};

export default ParentStep3;
