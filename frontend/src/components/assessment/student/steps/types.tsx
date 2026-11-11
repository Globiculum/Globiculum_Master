import type { AssessmentFormData } from "../../shared/types";
import type { SubjectProgress } from "../../shared/formProgress";

// Shared prop contract for every Student assessment step component.
export interface StudentStepProps {
  formData: AssessmentFormData;
  setField: <K extends keyof AssessmentFormData>(field: K, value: AssessmentFormData[K]) => void;
  toggleArrayField: (field: keyof AssessmentFormData, value: string) => void;
  setRecordField: (field: "languageProficiencies" | "subjectConfidences", key: string, value: string) => void;
  errors: Record<string, string>;
  /** Bumped on each Continue click that fails validation. */
  validationAttempt?: number;
  /** Academic step only: reports whether every subject card it shows has an answer. */
  onSubjectsCompleteChange?: (complete: boolean) => void;
  /** Academic step only: subject cards answered, for the progress card. */
  onSubjectsProgressChange?: (progress: SubjectProgress) => void;
  /** The page's Continue (validate the step, then go to the next one), used
   * by Next on the step's last card. */
  onContinue?: () => void;
}
