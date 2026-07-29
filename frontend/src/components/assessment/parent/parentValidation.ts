import { z } from "zod";
import type { ParentFormData } from "./parentMapper";

// parentValidation.ts
//
// Per-field validation, mirroring the Student flow's zod-schema-per-step
// pattern (see student/validation/studentAssessmentValidation.ts) so both
// assessments validate — and report errors — the same way. This replaces
// the old canProceedFromStep() boolean gate: every check it used to make is
// preserved here field-for-field (see inline notes), just broken out with a
// message per field instead of one combined true/false.
//
// Additionally required (not previously gated): Strongest Subjects,
// Challenging Subjects, and Strengthen for Indian Schooling in the Learning
// Profile step. Strongest/Challenging are only required once there are
// subjects to choose from (Academic Path's own picker shows no options — and
// no way to satisfy the requirement — until at least one subject is
// selected there), mirroring how "Which US State" is only required once the
// country is "us". Strengthen for Indian Schooling always has selectable
// options regardless of Academic Path, so it's unconditionally required.

export const PARENT_STEP_TITLES = [
  "School Profile",
  "Academic Path",
  "Learning Profile",
  "Support",
  "Review",
] as const;

export const PARENT_TOTAL_STEPS = PARENT_STEP_TITLES.length;

export type StepValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

// Step 0: School Profile — was canProceedFromStep case 0.
const schoolProfileStepSchema = z
  .object({
    childName: z.string().min(1, "Please enter your child's first name"),
    childLastName: z.string().min(1, "Please enter your child's last name"),
    schoolStage: z.string().min(1, "Please select a school stage"),
    snapshotGrade: z.string().min(1, "Please select a grade"),
    snapshotLocation: z.string().min(1, "Please select your child's current school country"),
    snapshotLocationOther: z.string().optional(),
    usState: z.string().optional(),
    usStateOther: z.string().optional(),
    currentCurriculum: z.string().min(1, "Please select a curriculum"),
    currentCurriculumOther: z.string().optional(),
    targetGoal: z.string().min(1, "Please select a target Indian board"),
    targetGrade: z.string().min(1, "Please select a target grade"),
    timeline: z.string().min(1, "Please select a transition timeline"),
  })
  .superRefine((data, ctx) => {
    if (data.snapshotLocation === "other" && !data.snapshotLocationOther) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please specify the country", path: ["snapshotLocationOther"] });
    }
    if (data.snapshotLocation === "us" && !data.usState) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select your state", path: ["usState"] });
    }
    if (data.usState === "other" && !data.usStateOther) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please specify your state", path: ["usStateOther"] });
    }
    if (data.currentCurriculum === "other" && !data.currentCurriculumOther) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please specify the curriculum", path: ["currentCurriculumOther"] });
    }
  });

// Step 1: Academic Path — was canProceedFromStep case 1 (either subjects OR
// languages is enough; flagged on academicPath since that section renders first).
const academicPathStepSchema = z
  .object({
    academicPath: z.array(z.string()),
    selectedLanguages: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.academicPath.length === 0 && data.selectedLanguages.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one current subject or language",
        path: ["academicPath"],
      });
    }
  });

// Step 2: Learning Profile — learningStyles/overallPerformance were
// canProceedFromStep case 2; strongestSubjects/challengingSubjects/
// strengthenGoals are newly required (see module comment above).
const learningProfileStepSchema = z
  .object({
    learningStyles: z.array(z.string()).min(1, "Pick at least one learning style"),
    overallPerformance: z.string().min(1, "Please select overall performance"),
    academicPath: z.array(z.string()),
    strongestSubjects: z.array(z.string()),
    challengingSubjects: z.array(z.string()),
    strengthenGoals: z.array(z.string()).min(1, "Select at least one area to strengthen"),
  })
  .superRefine((data, ctx) => {
    if (data.academicPath.length > 0 && data.strongestSubjects.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select the student's strongest subject",
        path: ["strongestSubjects"],
      });
    }
    if (data.academicPath.length > 0 && data.challengingSubjects.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select the student's most challenging subject",
        path: ["challengingSubjects"],
      });
    }
  });

// Step 3: Support — was canProceedFromStep case 3.
const supportStepSchema = z.object({
  transitionConcerns: z.array(z.string()).min(1, "Select at least one concern"),
});

const PARENT_STEP_SCHEMAS: (z.ZodTypeAny | null)[] = [
  schoolProfileStepSchema,
  academicPathStepSchema,
  learningProfileStepSchema,
  supportStepSchema,
  null, // Review — no field gate; the Generate Report button owns its own isSubmitting gate.
];

export function validateParentStep(stepIndex: number, formData: ParentFormData): StepValidationResult {
  const schema = PARENT_STEP_SCHEMAS[stepIndex];
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
