import { useState } from "react";
import {
  STUDENT_ASSESSMENT_STEP_IDS,
  type StudentAssessmentStepId,
  validateStudentAssessmentStep,
} from "../validation/studentAssessmentValidation";
import type { AssessmentFormData } from "../../shared/types";

export interface UseStudentAssessmentNavigationResult {
  stepIndex: number;
  stepId: StudentAssessmentStepId;
  isFirstStep: boolean;
  isLastStep: boolean;
  errors: Record<string, string>;
  goNext: (formData: AssessmentFormData) => boolean;
  goPrev: () => void;
  goToStep: (index: number) => void;
}

export function useStudentAssessmentNavigation(): UseStudentAssessmentNavigationResult {
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stepId = STUDENT_ASSESSMENT_STEP_IDS[stepIndex];

  const goNext = (formData: AssessmentFormData): boolean => {
    const result = validateStudentAssessmentStep(stepId, formData);
    if (!result.valid) {
      setErrors(result.errors);
      return false;
    }
    setErrors({});
    setStepIndex((prev) => Math.min(prev + 1, STUDENT_ASSESSMENT_STEP_IDS.length - 1));
    return true;
  };

  const goPrev = () => {
    setErrors({});
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const goToStep = (index: number) => {
    setErrors({});
    setStepIndex(Math.max(0, Math.min(index, STUDENT_ASSESSMENT_STEP_IDS.length - 1)));
  };

  return {
    stepIndex,
    stepId,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === STUDENT_ASSESSMENT_STEP_IDS.length - 1,
    errors,
    goNext,
    goPrev,
    goToStep,
  };
}
