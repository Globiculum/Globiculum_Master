import { useState } from "react";
import { type AssessmentFormData, createDefaultAssessmentFormData } from "../../shared/types";

// Isolated from the Parent flow's local useState inside AssessmentForm.tsx —
// the Student module owns its own state container so the two flows can
// evolve independently.

export interface UseStudentAssessmentStateResult {
  formData: AssessmentFormData;
  setField: <K extends keyof AssessmentFormData>(field: K, value: AssessmentFormData[K]) => void;
  toggleArrayField: (field: keyof AssessmentFormData, value: string) => void;
  setRecordField: (
    field: "languageProficiencies" | "subjectConfidences",
    key: string,
    value: string
  ) => void;
}

export function useStudentAssessmentState(
  prefillData?: Partial<AssessmentFormData>
): UseStudentAssessmentStateResult {
  const [formData, setFormData] = useState<AssessmentFormData>(() => ({
    ...createDefaultAssessmentFormData(),
    ...prefillData,
  }));

  const setField = <K extends keyof AssessmentFormData>(field: K, value: AssessmentFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: keyof AssessmentFormData, value: string) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const setRecordField = (
    field: "languageProficiencies" | "subjectConfidences",
    key: string,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: { ...prev[field], [key]: value },
    }));
  };

  return { formData, setField, toggleArrayField, setRecordField };
}
