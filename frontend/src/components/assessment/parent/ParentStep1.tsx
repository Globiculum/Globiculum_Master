import parentLogo from "@/assets/parentlogo.png";
import SectionCard from "../shared/SectionCard";
import ParentSchoolProfileWizard from "./ParentSchoolProfileWizard";
import type { ParentStepProps } from "./types";

// Step 1: School Profile.
//
// Every question (child's name, school stage, grade, country, state,
// curriculum, target board, target grade, timeline, and last the optional
// "attended an Indian school before?" with the prior schools) is one card in
// ParentSchoolProfileWizard, asked one at a time. Previous Learning used to be
// a separate box under the wizard, so it showed below every card.

const ParentStep1 = ({ formData, onFieldChange, fieldErrors, onContinue }: ParentStepProps) => (
  <SectionCard logo={parentLogo} title="Your child's school & transition plans.">
    <ParentSchoolProfileWizard formData={formData} onFieldChange={onFieldChange} fieldErrors={fieldErrors} onContinue={onContinue} />
  </SectionCard>
);

export default ParentStep1;
