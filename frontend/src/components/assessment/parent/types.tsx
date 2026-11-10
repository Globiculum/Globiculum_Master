import type { ParentFormData } from "./parentMapper";
import type { SubjectProgress } from "../shared/formProgress";

// Shared prop contract for the 4 Parent step components. Not part of the
// sprint's explicit file list, but a minimal necessity to avoid repeating
// this interface 4 times (same pattern used for the Student module).
export interface ParentStepProps {
  formData: ParentFormData;
  onFieldChange: <K extends keyof ParentFormData>(field: K, value: ParentFormData[K]) => void;
  onArrayToggle: (field: keyof ParentFormData, value: string) => void;
  onRecordFieldChange: (
    field: "languageProficiencies" | "subjectConfidences",
    key: string,
    value: string
  ) => void;
  fieldErrors: Record<string, string>;
  /** Bumped on each Continue click that fails validation. */
  validationAttempt?: number;
  /** Academic Path only: reports whether every subject card it shows has an answer. */
  onSubjectsCompleteChange?: (complete: boolean) => void;
  /** Academic Path only: subject cards answered, for the progress card. */
  onSubjectsProgressChange?: (progress: SubjectProgress) => void;
  /** The page's Continue (validate the step, then go to the next one), used
   * by Next on the step's last card. */
  onContinue?: () => void;
}
