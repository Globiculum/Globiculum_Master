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
  /** Bumped only when a Continue click actually fails validation — drives
   * shared/useScrollToFirstInvalidField without re-triggering on every
   * individual field fix (which clears one error at a time via clearError). */
  validationAttempt: number;
  goNext: (formData: AssessmentFormData) => boolean;
  goPrev: () => void;
  goToStep: (index: number) => void;
  clearError: (field: string) => void;
}

export function useStudentAssessmentNavigation(): UseStudentAssessmentNavigationResult {
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationAttempt, setValidationAttempt] = useState(0);

  const stepId = STUDENT_ASSESSMENT_STEP_IDS[stepIndex];

  const goNext = (formData: AssessmentFormData): boolean => {
    const result = validateStudentAssessmentStep(stepId, formData);
    if (!result.valid) {
      setErrors(result.errors);
      setValidationAttempt((n) => n + 1);
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

  // Clears a field's error the moment the user changes it, so a message
  // doesn't linger once it's no longer accurate — full re-validation still
  // runs on the next Continue click regardless.
  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return {
    stepIndex,
    stepId,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === STUDENT_ASSESSMENT_STEP_IDS.length - 1,
    errors,
    validationAttempt,
    goNext,
    goPrev,
    goToStep,
    clearError,
  };
}
