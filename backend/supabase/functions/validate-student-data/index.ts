import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import {
  validateApiVersion,
  validateContentType,
  validateRequestSize,
  validateSchema,
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  Schemas,
  API_VERSION,
} from "../_shared/apiContracts.ts";
import {
  validateStudentData,
  createValidationSummary,
  type ValidationResult as KnowledgeValidationResult,
} from "../_shared/knowledgeValidation.ts";

interface ValidationRule {
  id: string;
  rule_name: string;
  rule_type: string;
  conditions: Record<string, unknown>;
  error_message: string;
  severity: 'error' | 'warning' | 'info';
  active: boolean;
}

interface StudentData {
  schoolStage: 'elementary' | 'middle' | 'high';
  snapshotGrade: number;
  snapshotAge?: number;
  currentCurriculum: string;
  timeline?: string;
  snapshotLocation?: string;
  usState?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string; code: string }>;
  warnings: Array<{ field: string; message: string; code: string; suggestion?: string }>;
  // Enterprise-grade validation additions
  alignment_score?: number;
  confidence?: 'high' | 'medium' | 'low' | 'uncertain';
  missing_topics?: string[];
  missing_data?: Array<{ field: string; importance: string; impact: string }>;
  metadata?: {
    rulesApplied: number;
    rulesPassed: number;
    processingTimeMs: number;
    validatorVersion: string;
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  // ==========================================================================
  // STRICT API CONTRACT VALIDATION
  // ==========================================================================

  // 1. Validate API version
  const versionCheck = validateApiVersion(req);
  if (!versionCheck.valid) {
    return createErrorResponse(
      ErrorCodes.INVALID_API_VERSION,
      versionCheck.error!,
      400,
      corsHeaders
    );
  }
  const apiVersion = versionCheck.version;

  // 2. Validate Content-Type
  const contentTypeCheck = validateContentType(req);
  if (!contentTypeCheck.valid) {
    return createErrorResponse(
      ErrorCodes.INVALID_PAYLOAD,
      contentTypeCheck.error!,
      400,
      corsHeaders,
      apiVersion
    );
  }

  // 3. Validate request size
  const sizeCheck = await validateRequestSize(req);
  if (!sizeCheck.valid) {
    return createErrorResponse(
      ErrorCodes.INVALID_PAYLOAD,
      sizeCheck.error!,
      413,
      corsHeaders,
      apiVersion
    );
  }

  try {
    // 4. SECURITY: Verify authentication FIRST
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Missing or invalid authorization header',
        401,
        corsHeaders,
        apiVersion
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) console.error('Auth getUser error:', userError);
    if (userError || !user) {
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Invalid or expired authentication token',
        401,
        corsHeaders,
        apiVersion
      );
    }

    // 5. Parse and validate request body with strict schema
    let rawData: unknown;
    try {
      rawData = await req.json();
    } catch {
      return createErrorResponse(
        ErrorCodes.INVALID_PAYLOAD,
        'Request body must be valid JSON',
        400,
        corsHeaders,
        apiVersion
      );
    }

    // 6. HARD REJECTION: Validate against strict schema
    const validation = validateSchema<StudentData>(rawData, Schemas.studentDataRequest);
    
    if (!validation.valid) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_FAILED,
        'Request validation failed',
        400,
        corsHeaders,
        apiVersion,
        validation.errors
      );
    }

    const studentData = validation.data!;

    // Fetch active validation rules
    const { data: rules, error: rulesError } = await supabaseClient
      .from('validation_rules')
      .select('*')
      .eq('active', true);

    if (rulesError) {
      console.error('Error fetching validation rules:', rulesError);
      return createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Unable to process request',
        500,
        corsHeaders,
        apiVersion
      );
    }

    const validationRules = (rules || []) as ValidationRule[];
    
    // ==========================================================================
    // KNOWLEDGE VALIDATION LAYER (Enterprise-grade)
    // ==========================================================================
    
    // Run comprehensive knowledge validation
    const knowledgeValidation = validateStudentData(
      studentData as unknown as Record<string, unknown>,
      {
        gradeLevel: studentData.snapshotGrade || 9,
        sourceCurriculum: studentData.currentCurriculum || 'unknown',
        targetCurriculum: 'common_core', // Default target
        subjects: ['math', 'science', 'english', 'social_studies']
      }
    );
    
    const result: ValidationResult = {
      isValid: knowledgeValidation.isValid,
      errors: knowledgeValidation.errors.map(e => ({
        field: e.field,
        message: e.message,
        code: e.code
      })),
      warnings: knowledgeValidation.warnings.map(w => ({
        field: w.field,
        message: w.message,
        code: w.code,
        suggestion: w.suggestion
      })),
      // Enterprise-grade additions
      alignment_score: undefined,
      confidence: knowledgeValidation.confidence,
      missing_topics: [],
      missing_data: knowledgeValidation.missingData.map(m => ({
        field: m.field,
        importance: m.importance,
        impact: m.impact
      })),
      metadata: knowledgeValidation.metadata
    };

    // Run legacy validation rules (backward compatibility)
    for (const rule of validationRules) {
      const ruleResult = applyRule(rule, studentData);
      if (ruleResult) {
        if (ruleResult.severity === 'error') {
          result.isValid = false;
          result.errors.push({
            field: getFieldForRuleType(rule.rule_type),
            message: rule.error_message,
            code: rule.rule_name.toUpperCase(),
          });
        } else {
          result.warnings.push({
            field: getFieldForRuleType(rule.rule_type),
            message: rule.error_message,
            code: rule.rule_name.toUpperCase(),
            suggestion: ruleResult.suggestion,
          });
        }
      }
    }

    // Additional server-side validations (legacy)
    const additionalValidations = runAdditionalValidations(studentData);
    result.errors.push(...additionalValidations.errors);
    result.warnings.push(...additionalValidations.warnings);
    if (additionalValidations.errors.length > 0) {
      result.isValid = false;
    }

    return createSuccessResponse(result, corsHeaders, apiVersion);

  } catch (error) {
    console.error('Error in validate-student-data function:', error);
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Unable to process request',
      500,
      corsHeaders,
      API_VERSION
    );
  }
});

function applyRule(
  rule: ValidationRule,
  data: StudentData
): { severity: string; suggestion?: string } | null {
  const conditions = rule.conditions as Record<string, unknown>;

  switch (rule.rule_type) {
    case 'age_grade': {
      if (!data.snapshotAge) return null;
      
      const minAge = conditions.min_age as number;
      const maxAge = conditions.max_age as number;
      const grades = conditions.grades as number[];

      if (grades.includes(data.snapshotGrade)) {
        if (data.snapshotAge < minAge || data.snapshotAge > maxAge) {
          return {
            severity: rule.severity,
            suggestion: `Typical age range for grade ${data.snapshotGrade} is ${minAge}-${maxAge} years`,
          };
        }
      }
      return null;
    }

    case 'curriculum_compatibility': {
      const curriculum = conditions.curriculum as string;
      const validGrades = conditions.valid_grades as number[];

      if (data.currentCurriculum === curriculum) {
        if (!validGrades.includes(data.snapshotGrade)) {
          return {
            severity: rule.severity,
            suggestion: `Valid grades for ${curriculum} are: ${validGrades.join(', ')}`,
          };
        }
      }
      return null;
    }

    case 'timeline': {
      if (!data.timeline) return null;

      const timelineMonths: Record<string, number> = {
        '3months': 3,
        '6months': 6,
        '1year': 12,
        '2years': 24,
      };

      const months = timelineMonths[data.timeline];
      const minMonths = conditions.min_months as number;
      const maxMonths = conditions.max_months as number;

      if (months && (months < minMonths || months > maxMonths)) {
        return {
          severity: rule.severity,
          suggestion: `Recommended timeline is between ${minMonths} and ${maxMonths} months`,
        };
      }
      return null;
    }

    default:
      return null;
  }
}

function getFieldForRuleType(ruleType: string): string {
  const fieldMap: Record<string, string> = {
    age_grade: 'snapshotAge',
    curriculum_compatibility: 'currentCurriculum',
    document: 'reportCard',
    timeline: 'timeline',
    location: 'snapshotLocation',
  };
  return fieldMap[ruleType] || 'form';
}

function runAdditionalValidations(data: StudentData): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Validate school stage matches grade
  const stageGrades: Record<string, number[]> = {
    elementary: [1, 2, 3, 4, 5],
    middle: [6, 7, 8],
    high: [9, 10, 11, 12],
  };

  const validGrades = stageGrades[data.schoolStage];
  if (validGrades && !validGrades.includes(data.snapshotGrade)) {
    result.errors.push({
      field: 'snapshotGrade',
      message: `Grade ${data.snapshotGrade} does not match ${data.schoolStage} school stage`,
      code: 'GRADE_STAGE_MISMATCH',
    });
  }

  // Validate US state is provided for US location
  if (data.snapshotLocation === 'us' && !data.usState) {
    result.errors.push({
      field: 'usState',
      message: 'Please select your US state',
      code: 'US_STATE_REQUIRED',
    });
  }

  return result;
}
