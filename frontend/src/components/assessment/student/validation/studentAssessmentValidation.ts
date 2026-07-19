import { z } from "zod";
import type { AssessmentFormData } from "../../shared/types";

// Independent from frontend/src/lib/validation/studentValidation.ts (the
// Parent flow's schema / backend contract). This module only gates
// "Next"/"Generate Report" in the Student flow's own UI — it does not
// replace or call the backend's validate-student-data contract, which
// submitAssessment() still invokes unchanged.

export const STUDENT_ASSESSMENT_STEP_IDS = [
  "profile",
  "academic",
  "learning",
  "goals",
  "generate",
] as const;

export type StudentAssessmentStepId = (typeof STUDENT_ASSESSMENT_STEP_IDS)[number];

export type StepValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

const studentProfileStepSchema = z.object({
  schoolStage: z.enum(["elementary", "middle", "high"], {
    errorMap: () => ({ message: "Please select a school stage" }),
  }),
  snapshotGrade: z.string().min(1, "Please select a grade"),
  snapshotLocation: z.string().min(1, "Please select a location"),
  usState: z.string().optional(),
});

const academicProfileStepSchema = z.object({
  currentCurriculum: z.string().min(1, "Please select the current curriculum"),
  academicPath: z.array(z.string()).min(1, "Select at least one current subject"),
});

const learningProfileStepSchema = z.object({
  learningStyles: z.array(z.string()).min(1, "Select at least one learning style"),
  studyTime: z.string().min(1, "Please select a study time pattern"),
});

const goalsChallengesStepSchema = z.object({
  targetGoal: z.string().min(1, "Please select a target curriculum/goal"),
  timeline: z.string().min(1, "Please select a preparation timeline"),
});

const STEP_SCHEMAS: Record<StudentAssessmentStepId, z.ZodTypeAny | null> = {
  profile: studentProfileStepSchema,
  academic: academicProfileStepSchema,
  learning: learningProfileStepSchema,
  goals: goalsChallengesStepSchema,
  generate: null, // nothing to validate — this step triggers submission
};

export function validateStudentAssessmentStep(
  stepId: StudentAssessmentStepId,
  formData: AssessmentFormData
): StepValidationResult {
  const schema = STEP_SCHEMAS[stepId];
  if (!schema) return { valid: true, errors: {} };

  const result = schema.safeParse(formData);
  if (result.success) return { valid: true, errors: {} };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return { valid: false, errors };
}
