import type { ParentFormData } from "./parentMapper";

// parentValidation.ts
//
// The original AssessmentForm.tsx had a single canProceed() switch keyed to
// its 4 steps. This sprint regroups those same fields into 5 steps, so the
// exact same checks are redistributed here to match — nothing added,
// nothing dropped, same overall gate before a report can be generated.
//
// Original step 0 (Educational Start) + step 1 (Goals & Timeline) checks
// both now belong to new Step 1 "School Profile", since those fields moved
// there together. Original step 2 -> new Step 2. Original step 3 -> new
// Step 3. Concerns & Support (new Step 4) and Generate Report (new Step 5)
// were never gated by canProceed() before either, so they still aren't.

export const PARENT_STEP_TITLES = [
  "School Profile",
  "Academic Path",
  "Learning Profile",
  "Support",
  "Review",
] as const;

export const PARENT_TOTAL_STEPS = PARENT_STEP_TITLES.length;

export function canProceedFromStep(stepIndex: number, formData: ParentFormData): boolean {
  switch (stepIndex) {
    case 0: {
      const locationValid =
        !!formData.snapshotLocation &&
        (formData.snapshotLocation !== "other" || !!formData.snapshotLocationOther) &&
        (formData.snapshotLocation !== "us" || (!!formData.usState && (formData.usState !== "other" || !!formData.usStateOther)));
      const curriculumValid =
        !!formData.currentCurriculum && (formData.currentCurriculum !== "other" || !!formData.currentCurriculumOther);
      const targetValid = !!formData.targetGoal && !!formData.targetGrade;

      return (
        !!formData.childName &&
        !!formData.childLastName &&
        !!formData.schoolStage &&
        !!formData.snapshotGrade &&
        locationValid &&
        curriculumValid &&
        targetValid &&
        !!formData.timeline
      );
    }
    case 1:
      return formData.academicPath.length > 0 || formData.selectedLanguages.length > 0;
    case 2:
      return formData.learningStyles.length > 0 && !!formData.overallPerformance;
    case 3:
      // Biggest Concerns is now required.
      return formData.transitionConcerns.length > 0;
    case 4:
      // Review step has no field gate; the Generate Report button owns its own isSubmitting/isValidating gate.
      return true;
    default:
      return false;
  }
}
