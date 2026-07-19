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
  "Academic Profile",
  "Learning Profile",
  "Concerns & Support",
  "Generate Report",
] as const;

export const PARENT_TOTAL_STEPS = PARENT_STEP_TITLES.length;

export function canProceedFromStep(stepIndex: number, formData: ParentFormData): boolean {
  switch (stepIndex) {
    case 0: {
      // Original case 0 (locationValid, curriculumValid) + original case 1 (prevLocationValid, targetValid, timeline)
      const locationValid =
        !!formData.snapshotLocation &&
        (formData.snapshotLocation !== "other" || !!formData.snapshotLocationOther) &&
        (formData.snapshotLocation !== "us" || (!!formData.usState && (formData.usState !== "other" || !!formData.usStateOther)));
      const curriculumValid =
        !!formData.currentCurriculum && (formData.currentCurriculum !== "other" || !!formData.currentCurriculumOther);
      const prevLocationValid =
        !!formData.previousLocation && (formData.previousLocation !== "other" || !!formData.previousLocationOther);
      const targetValid = !!formData.targetGoal;

      return (
        !!formData.schoolStage &&
        !!formData.snapshotGrade &&
        locationValid &&
        curriculumValid &&
        prevLocationValid &&
        targetValid &&
        !!formData.timeline
      );
    }
    case 1:
      // Original case 2
      return formData.academicPath.length > 0 || formData.selectedLanguages.length > 0;
    case 2:
      // Original case 3
      return formData.learningStyles.length > 0 && !!formData.studyTime && !!formData.previousGrades;
    case 3:
      // Concerns & Support was never gated in the original form.
      return true;
    case 4:
      // Generate Report has no field gate; only isSubmitting/isValidating gate the button (handled in ParentStep5).
      return true;
    default:
      return false;
  }
}
