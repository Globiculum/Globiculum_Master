import type { AssessmentFormData } from "../../shared/types";

// Shared prop contract for every Student assessment step component.
export interface StudentStepProps {
  formData: AssessmentFormData;
  setField: <K extends keyof AssessmentFormData>(field: K, value: AssessmentFormData[K]) => void;
  toggleArrayField: (field: keyof AssessmentFormData, value: string) => void;
  setRecordField: (field: "languageProficiencies" | "subjectConfidences", key: string, value: string) => void;
  errors: Record<string, string>;
}

export const StepFieldError = ({ errors, field }: { errors: Record<string, string>; field: string }) => {
  const msg = errors[field];
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1 text-sm font-medium text-destructive">
      {msg}
    </p>
  );
};
