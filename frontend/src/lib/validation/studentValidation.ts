import { z } from 'zod';

// Age-grade mapping for validation
const ageGradeRanges = {
  elementary: { minAge: 5, maxAge: 11, grades: [1, 2, 3, 4, 5] },
  middle: { minAge: 10, maxAge: 14, grades: [6, 7, 8] },
  high: { minAge: 13, maxAge: 19, grades: [9, 10, 11, 12] },
};

// Curriculum compatibility by grade
const curriculumGradeCompatibility: Record<string, number[]> = {
  'ib-pyp': [1, 2, 3, 4, 5],
  'ib-myp': [6, 7, 8, 9, 10],
  'ib-dp': [11, 12],
  'ap': [10, 11, 12],
  'cambridge-lower': [6, 7, 8],
  'cambridge-igcse': [9, 10],
  'a-levels': [11, 12],
  'honors': [9, 10, 11, 12],
  'dual-credit': [11, 12],
};

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

// Zod schema for student intake form
export const studentIntakeSchema = z.object({
  schoolStage: z.enum(['elementary', 'middle', 'high'], {
    required_error: 'School stage is required',
  }),
  snapshotGrade: z.string().min(1, 'Grade is required').transform((val) => parseInt(val, 10)),
  snapshotLocation: z.string().min(1, 'Location is required'),
  snapshotLocationOther: z.string().optional(),
  usState: z.string().optional(),
  usStateOther: z.string().optional(),
  snapshotAge: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  currentCurriculum: z.string().min(1, 'Curriculum is required'),
  currentCurriculumOther: z.string().optional(),
  previousLocation: z.string().optional(),
  previousLocationOther: z.string().optional(),
  targetGoal: z.string().optional(),
  targetGoalOther: z.string().optional(),
  timeline: z.string().optional(),
  academicPath: z.array(z.string()).optional(),
  selectedLanguages: z.array(z.string()).optional(),
  languageProficiencies: z.record(z.string()).optional(),
  customLanguage: z.string().optional(),
  extracurriculars: z.array(z.string()).optional(),
  languagesAtHome: z.array(z.string()).optional(),
  learningStyle: z.string().optional(),
  studyHours: z.string().optional(),
  previousGrades: z.string().optional(),
  strongestSubjects: z.array(z.string()).optional(),
  challengingSubjects: z.array(z.string()).optional(),
  transitionConcerns: z.array(z.string()).optional(),
  supportNeeds: z.array(z.string()).optional(),
});

export type StudentIntakeData = z.infer<typeof studentIntakeSchema>;

/**
 * Validate age against grade for consistency
 */
export function validateAgeGrade(
  age: number | undefined,
  grade: number,
  schoolStage: 'elementary' | 'middle' | 'high'
): ValidationWarning | null {
  if (!age) return null;

  const range = ageGradeRanges[schoolStage];
  
  // Check if grade matches school stage
  if (!range.grades.includes(grade)) {
    return {
      field: 'snapshotGrade',
      message: `Grade ${grade} does not belong to ${schoolStage} school`,
      code: 'GRADE_STAGE_MISMATCH',
    };
  }

  // Check age range
  if (age < range.minAge || age > range.maxAge) {
    return {
      field: 'snapshotAge',
      message: `Age ${age} is outside the typical range (${range.minAge}-${range.maxAge}) for ${schoolStage} school`,
      code: 'AGE_GRADE_MISMATCH',
      suggestion: `Typical age for grade ${grade} is ${getTypicalAge(grade)} years`,
    };
  }

  // Check specific age-grade alignment
  const typicalAge = getTypicalAge(grade);
  if (Math.abs(age - typicalAge) > 2) {
    return {
      field: 'snapshotAge',
      message: `Age ${age} is unusually far from typical age ${typicalAge} for grade ${grade}`,
      code: 'AGE_GRADE_ATYPICAL',
      suggestion: 'Please verify the age and grade combination',
    };
  }

  return null;
}

/**
 * Get typical age for a grade level
 */
function getTypicalAge(grade: number): number {
  // In the US, typical age = grade + 5 (give or take)
  return grade + 5;
}

/**
 * Validate curriculum compatibility with grade
 */
export function validateCurriculumCompatibility(
  curriculum: string,
  grade: number
): ValidationError | ValidationWarning | null {
  const validGrades = curriculumGradeCompatibility[curriculum];
  
  if (!validGrades) {
    // Curriculum not in compatibility list, no validation needed
    return null;
  }

  if (!validGrades.includes(grade)) {
    const severity = curriculum.startsWith('ib-') ? 'error' : 'warning';
    const result = {
      field: 'currentCurriculum',
      message: `${getCurriculumName(curriculum)} is typically for grades ${validGrades.join(', ')}`,
      code: 'CURRICULUM_GRADE_MISMATCH',
    };

    if (severity === 'error') {
      return result as ValidationError;
    }
    return {
      ...result,
      suggestion: `Consider selecting a curriculum appropriate for grade ${grade}`,
    } as ValidationWarning;
  }

  return null;
}

/**
 * Get human-readable curriculum name
 */
function getCurriculumName(code: string): string {
  const names: Record<string, string> = {
    'ib-pyp': 'IB Primary Years Programme',
    'ib-myp': 'IB Middle Years Programme',
    'ib-dp': 'IB Diploma Programme',
    'ap': 'Advanced Placement',
    'cambridge-lower': 'Cambridge Lower Secondary',
    'cambridge-igcse': 'Cambridge IGCSE',
    'a-levels': 'A-Levels',
    'honors': 'Honors Program',
    'dual-credit': 'Dual Credit Program',
  };
  return names[code] || code;
}

/**
 * Validate document file
 */
export function validateDocument(
  file: File | null
): ValidationError | null {
  if (!file) return null;

  const maxSizeMB = 10;
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      field: 'reportCard',
      message: `File size exceeds ${maxSizeMB}MB limit`,
      code: 'DOCUMENT_TOO_LARGE',
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      field: 'reportCard',
      message: 'File must be PDF, JPG, or PNG format',
      code: 'INVALID_DOCUMENT_TYPE',
    };
  }

  return null;
}

/**
 * Validate timeline is realistic
 */
export function validateTimeline(timeline: string): ValidationWarning | null {
  const timelineMonths: Record<string, number> = {
    '3months': 3,
    '6months': 6,
    '1year': 12,
    '2years': 24,
  };

  const months = timelineMonths[timeline];
  if (!months) return null;

  // Warn if timeline is very short for major transitions
  if (months < 6) {
    return {
      field: 'timeline',
      message: 'A 3-month timeline may be challenging for comprehensive curriculum alignment',
      code: 'SHORT_TIMELINE',
      suggestion: 'Consider allowing 6+ months for better preparation',
    };
  }

  return null;
}

/**
 * Validate location-specific requirements
 */
export function validateLocationRequirements(
  location: string,
  usState?: string,
  otherLocation?: string
): ValidationError | null {
  if (location === 'us' && !usState) {
    return {
      field: 'usState',
      message: 'Please select your US state',
      code: 'US_STATE_REQUIRED',
    };
  }

  if (location === 'other' && !otherLocation?.trim()) {
    return {
      field: 'snapshotLocationOther',
      message: 'Please specify your country',
      code: 'OTHER_LOCATION_REQUIRED',
    };
  }

  if (usState === 'other' && !otherLocation?.trim()) {
    return {
      field: 'usStateOther',
      message: 'Please specify your state',
      code: 'OTHER_STATE_REQUIRED',
    };
  }

  return null;
}

/**
 * Run all validations on student intake data
 */
export function validateStudentIntake(data: Partial<StudentIntakeData>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Schema validation
  const schemaResult = studentIntakeSchema.safeParse(data);
  if (!schemaResult.success) {
    schemaResult.error.errors.forEach((err) => {
      errors.push({
        field: err.path.join('.'),
        message: err.message,
        code: 'SCHEMA_VALIDATION_ERROR',
      });
    });
    return { isValid: false, errors, warnings };
  }

  const validData = schemaResult.data;

  // Age-grade validation
  if (validData.snapshotAge && validData.schoolStage) {
    const ageGradeResult = validateAgeGrade(
      validData.snapshotAge,
      validData.snapshotGrade,
      validData.schoolStage
    );
    if (ageGradeResult) warnings.push(ageGradeResult);
  }

  // Curriculum compatibility
  if (validData.currentCurriculum) {
    const curriculumResult = validateCurriculumCompatibility(
      validData.currentCurriculum,
      validData.snapshotGrade
    );
    if (curriculumResult) {
      if ('suggestion' in curriculumResult) {
        warnings.push(curriculumResult);
      } else {
        errors.push(curriculumResult);
      }
    }
  }

  // Timeline validation
  if (validData.timeline) {
    const timelineResult = validateTimeline(validData.timeline);
    if (timelineResult) warnings.push(timelineResult);
  }

  // Location requirements
  const locationResult = validateLocationRequirements(
    validData.snapshotLocation,
    validData.usState,
    validData.snapshotLocationOther || validData.usStateOther
  );
  if (locationResult) errors.push(locationResult);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize student data for storage (remove PII from logs, etc.)
 */
export function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['reportCard', 'customLanguage', 'snapshotLocationOther', 'usStateOther'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}
