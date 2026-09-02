import SectionCard from "../shared/SectionCard";
import parentLogo from "@/assets/parentlogo.png";
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
  const subtitle = childFirstName ? `Help us understand ${childFirstName}'s preferred learning style.` : "Help us understand your child's preferred learning style.";

  return (
    <SectionCard logo={parentLogo} title="Learning Profile">
      <div className="-mt-4 text-sm text-muted-foreground">{subtitle}</div>
      <ParentLearningProfileWizard formData={formData} onFieldChange={onFieldChange} onArrayToggle={onArrayToggle} fieldErrors={fieldErrors} />
    </SectionCard>
  );
};

export default ParentStep3;
