import childLogo from "@/assets/childlogo.png";
import type { StudentStepProps } from "./types";
import SectionCard from "../../shared/SectionCard";
import StudentProfileWizard from "./StudentProfileWizard";

// Step 1: Student Profile.
// Every question (name, school stage, grade, country, state, curriculum,
// target board, target grade, timeline, and last the optional "attended an
// Indian school before?" with the prior schools) is one card in
// StudentProfileWizard, asked one at a time. Previous Learning used to be a
// separate box under the wizard, so it showed below every card.
// Reuses the existing backend field vocabulary (schoolStage, snapshotGrade,
// snapshotLocation, usState, currentCurriculum, targetGoal, timeline) so
// this step's output is already compatible with validate-student-data /
// analyze-curriculum without any transformation layer.

const StudentProfileStep = ({ formData, setField, errors, onContinue }: StudentStepProps) => (
  <SectionCard logo={childLogo} title="Let's get to know you." description="Tell us a little about yourself before we begin.">
    <StudentProfileWizard formData={formData} setField={setField} errors={errors} onContinue={onContinue} />
  </SectionCard>
);

export default StudentProfileStep;
