import type { ParentFormData } from "./parentMapper";

// Shared prop contract for the 5 Parent step components. Not part of the
// sprint's explicit file list, but a minimal necessity to avoid repeating
// this interface 5 times (same pattern used for the Student module).
export interface ParentStepProps {
  formData: ParentFormData;
  onFieldChange: <K extends keyof ParentFormData>(field: K, value: ParentFormData[K]) => void;
  onArrayToggle: (field: keyof ParentFormData, value: string) => void;
  onRecordFieldChange: (
    field: "languageProficiencies" | "subjectConfidences" | "elementaryConfidences",
    key: string,
    value: string
  ) => void;
  fieldErrors: Record<string, string>;
}

export const ParentFieldError = ({ errors, field }: { errors: Record<string, string>; field: string }) => {
  const msg = errors[field];
  if (!msg) return null;
  return <p className="text-sm text-destructive mt-1">{msg}</p>;
};
