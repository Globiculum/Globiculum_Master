import { z } from "zod";
import type { AssessmentFormData } from "../../shared/types";

// Independent from frontend/src/lib/validation/studentValidation.ts (the
// Parent flow's schema / backend contract). This module only gates
// "Next"/"Generate Report" in the Student flow's own UI — it does not
// replace or call the backend's validate-student-data contract, which
// submitAssessment() still invokes unchanged.
//
// Student journey is 4 steps (shorter/friendlier than Parent's 5):
// profile -> academic -> wrapup -> review (review's own button triggers
// generation — mirrors Parent's Step 5, no separate immediate-generate step).

export const STUDENT_ASSESSMENT_STEP_IDS = ["profile", "academic", "wrapup", "review"] as const;

export type StudentAssessmentStepId = (typeof STUDENT_ASSESSMENT_STEP_IDS)[number];

export type StepValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

const studentProfileStepSchema = z
  .object({
    studentName: z.string().min(1, "Please enter your first name"),
    studentLastName: z.string().min(1, "Please enter your last name"),
    schoolStage: z.enum(["elementary", "middle", "high"], {
      errorMap: () => ({ message: "Please select a school stage" }),
    }),
    snapshotGrade: z.string().min(1, "Please select a grade"),
    snapshotLocation: z.string().min(1, "Please select your school's country"),
    usState: z.string().optional(),
    currentCurriculum: z.string().min(1, "Please select your current curriculum"),
    targetGoal: z.string().min(1, "Please select a target Indian board"),
    targetGrade: z.string().min(1, "Please select a target grade"),
    timeline: z.string().min(1, "Please select a transition timeline"),
  })
  // US State is only mandatory once the country is "us" — mirrors Parent's
  // own canProceedFromStep gate for the same field.
  .superRefine((data, ctx) => {
    if (data.snapshotLocation === "us" && !data.usState) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select your state", path: ["usState"] });
    }
  });

const academicProfileStepSchema = z.object({
  academicPath: z.array(z.string()).min(1, "Select at least one current subject"),
});

const wrapUpStepSchema = z.object({
  learningStyles: z.array(z.string()).min(1, "Pick at least one that sounds like you"),
});

const STEP_SCHEMAS: Record<StudentAssessmentStepId, z.ZodTypeAny | null> = {
  profile: studentProfileStepSchema,
  academic: academicProfileStepSchema,
  wrapup: wrapUpStepSchema,
  review: null, // nothing to validate — this step's own button triggers submission
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
