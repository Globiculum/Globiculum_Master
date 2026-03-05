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
  sanitizeString,
  sanitizeArray,
  API_VERSION,
} from "../_shared/apiContracts.ts";
import { createLogger } from "../_shared/observability.ts";
import { 
  checkRateLimit, 
  getRateLimitIdentifier, 
  RateLimitConfigs,
  sanitizeForPrompt 
} from "../_shared/security.ts";
import {
  executeJob,
  JobConfigs,
  TimeoutError,
  scheduleBackgroundTask,
  isRetryableError,
} from "../_shared/backgroundJobs.ts";
import {
  validateCurriculumAlignment,
  createValidationSummary,
  type AlignmentValidationResult,
} from "../_shared/knowledgeValidation.ts";

interface FormData {
  schoolStage?: string;
  snapshotGrade?: number;
  snapshotLocation?: string;
  usState?: string;
  previousCountry?: string;
  currentCurriculum?: string;
  targetGoal?: string;
  academicPath?: string[];
  strongestSubjects?: string[];
  challengingAreas?: string[];
  languagesSpoken?: string[];
  transitionTimeline?: string;
}

interface CurriculumAnalysisRequest {
  formData: FormData;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  // Initialize logger early (without userId until we authenticate)
  const logger = createLogger('analyze-curriculum');

  logger.info('Request received', { method: req.method });

  // ==========================================================================
  // RATE LIMITING (before expensive operations)
  // ==========================================================================
  
  const rateLimitId = getRateLimitIdentifier(req);
  const rateLimitResult = checkRateLimit(rateLimitId, RateLimitConfigs.ai);
  
  if (!rateLimitResult.allowed) {
    logger.warn('Rate limit exceeded', { 
      identifier: rateLimitId, 
      retryAfter: rateLimitResult.retryAfter 
    });
    logger.logSummary(false);
    return createErrorResponse(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      'Too many requests. Please try again later.',
      429,
      { ...corsHeaders, 'Retry-After': String(rateLimitResult.retryAfter || 60) },
      API_VERSION
    );
  }

  // ==========================================================================
  // STRICT API CONTRACT VALIDATION
  // ==========================================================================

  // 1. Validate API version
  const versionCheck = await logger.measureValidation('api-version', async () => {
    return validateApiVersion(req);
  });
  
  if (!versionCheck.valid) {
    logger.logValidationFailure('api-version', versionCheck.error!, 'error');
    logger.logSummary(false);
    return createErrorResponse(
      ErrorCodes.INVALID_API_VERSION,
      versionCheck.error!,
      400,
      corsHeaders
    );
  }
  const apiVersion = versionCheck.version;

  // 2. Validate Content-Type
  const contentTypeCheck = await logger.measureValidation('content-type', async () => {
    return validateContentType(req);
  });
  
  if (!contentTypeCheck.valid) {
    logger.logValidationFailure('content-type', contentTypeCheck.error!, 'error');
    logger.logSummary(false);
    return createErrorResponse(
      ErrorCodes.INVALID_PAYLOAD,
      contentTypeCheck.error!,
      400,
      corsHeaders,
      apiVersion
    );
  }

  // 3. Validate request size
  const sizeCheck = await logger.measureValidation('request-size', async () => {
    return validateRequestSize(req);
  });
  
  if (!sizeCheck.valid) {
    logger.logValidationFailure('request-size', sizeCheck.error!, 'error');
    logger.logSummary(false);
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
      logger.logValidationFailure('authorization', 'Missing or invalid authorization header', 'error');
      logger.logSummary(false);
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Missing or invalid authorization header',
        401,
        corsHeaders,
        apiVersion
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    
    // Measure auth retrieval latency
    const { data: { user }, error: userError } = await logger.measureRetrieval('auth.getUser', async () => {
      return supabase.auth.getUser(token);
    });
    
    if (userError) {
      logger.error('Auth getUser error', { error: userError.message });
    }
    if (userError || !user) {
      logger.logValidationFailure('authentication', 'Invalid or expired authentication token', 'error');
      logger.logSummary(false);
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Invalid or expired authentication token',
        401,
        corsHeaders,
        apiVersion
      );
    }

    logger.info('User authenticated', { userId: user.id });

    // 5. Parse and validate request body with strict schema
    let rawData: unknown;
    try {
      rawData = await req.json();
    } catch {
      logger.logValidationFailure('json-parse', 'Request body must be valid JSON', 'error');
      logger.logSummary(false);
      return createErrorResponse(
        ErrorCodes.INVALID_PAYLOAD,
        'Request body must be valid JSON',
        400,
        corsHeaders,
        apiVersion
      );
    }

    // 6. HARD REJECTION: Validate against strict schema
    const validation = await logger.measureValidation('schema', async () => {
      return validateSchema<CurriculumAnalysisRequest>(
        rawData, 
        Schemas.curriculumAnalysisRequest
      );
    });
    
    if (!validation.valid) {
      validation.errors?.forEach((err) => {
        logger.logValidationFailure(err.field, err.message, 'error');
      });
      logger.logSummary(false);
      return createErrorResponse(
        ErrorCodes.VALIDATION_FAILED,
        'Request validation failed',
        400,
        corsHeaders,
        apiVersion,
        validation.errors
      );
    }

    // Additional sanitization for AI prompt safety using security module
    const rawFormData = (rawData as { formData?: Record<string, unknown> }).formData || {};
    const formData: FormData = {
      schoolStage: sanitizeForPrompt(rawFormData.schoolStage, 20) || undefined,
      snapshotGrade: typeof rawFormData.snapshotGrade === 'number' ? rawFormData.snapshotGrade : undefined,
      snapshotLocation: sanitizeForPrompt(rawFormData.snapshotLocation, 100) || undefined,
      usState: sanitizeForPrompt(rawFormData.usState, 50) || undefined,
      previousCountry: sanitizeForPrompt(rawFormData.previousCountry, 100) || undefined,
      currentCurriculum: sanitizeForPrompt(rawFormData.currentCurriculum, 100) || undefined,
      targetGoal: sanitizeForPrompt(rawFormData.targetGoal, 200) || undefined,
      academicPath: sanitizeArray(rawFormData.academicPath, 10, 50),
      strongestSubjects: sanitizeArray(rawFormData.strongestSubjects, 10, 50),
      challengingAreas: sanitizeArray(rawFormData.challengingAreas, 10, 50),
      languagesSpoken: sanitizeArray(rawFormData.languagesSpoken, 10, 50),
      transitionTimeline: sanitizeForPrompt(rawFormData.transitionTimeline, 50) || undefined,
    };

    // ==========================================================================
    // KNOWLEDGE VALIDATION LAYER
    // ==========================================================================
    
    const knowledgeValidation = validateCurriculumAlignment(
      formData as Record<string, unknown>,
      formData.currentCurriculum || 'unknown',
      'common_core', // Target is US curriculum
      formData.snapshotGrade || 9,
      formData.academicPath || ['math', 'science', 'english', 'social_studies']
    );
    
    logger.info("Knowledge validation completed", {
      alignmentScore: knowledgeValidation.alignment_score,
      confidence: knowledgeValidation.confidence,
      missingTopics: knowledgeValidation.missing_topics.length,
      isValid: knowledgeValidation.isValid,
      errors: knowledgeValidation.errors.length,
      warnings: knowledgeValidation.warnings.length
    });
    
    // Log validation warnings but don't block
    if (knowledgeValidation.warnings.length > 0) {
      logger.warn("Validation warnings detected", {
        warnings: knowledgeValidation.warnings.map(w => w.message)
      });
    }
    
    // Block on critical errors
    if (!knowledgeValidation.isValid && knowledgeValidation.errors.some(e => e.severity === 'error')) {
      logger.logValidationFailure('knowledge-validation', 'Critical validation errors', 'error');
      logger.logSummary(false);
      return createErrorResponse(
        ErrorCodes.VALIDATION_FAILED,
        'Input validation failed',
        400,
        corsHeaders,
        apiVersion,
        knowledgeValidation.errors.map(e => ({
          field: e.field,
          code: e.code,
          message: e.message,
          expected: e.suggestion
        }))
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      logger.error("LOVABLE_API_KEY is not configured");
      logger.logSummary(false);
      return createErrorResponse(
        ErrorCodes.CONFIGURATION_ERROR,
        'Service configuration error',
        500,
        corsHeaders,
        apiVersion
      );
    }

    logger.info("Starting curriculum analysis", { 
      curriculum: formData.currentCurriculum,
      grade: formData.snapshotGrade,
      preValidationScore: knowledgeValidation.alignment_score
    });

    const systemPrompt = `You are an expert educational curriculum analyst. Your task is to analyze curriculum gaps and provide CONCISE, SCANNABLE recommendations.

CRITICAL FORMATTING RULES:
- Use SHORT bullet points only (max 10 words per bullet)
- NO paragraphs or long descriptions
- Use key phrases, not sentences
- Be specific with topic names
- Focus on actionable items

You have knowledge of: US Common Core, CBSE, ICSE, IB, British Curriculum, AP courses, SAT/ACT.`;

    const userPrompt = `Analyze curriculum alignment for this student:

**Profile:**
- Stage: ${formData.schoolStage || 'Not specified'}
- Grade: ${formData.snapshotGrade || 'Not specified'}
- Location: ${formData.snapshotLocation === 'us' ? `US${formData.usState ? ` - ${formData.usState}` : ''}` : formData.snapshotLocation || 'Not specified'}
- Source Curriculum: ${formData.currentCurriculum || 'Not specified'}
- Target: ${formData.targetGoal || 'US curriculum alignment'}
- Subjects: ${formData.academicPath?.join(', ') || 'Core subjects'}
- Strong Areas: ${formData.strongestSubjects?.join(', ') || 'Not specified'}
- Challenges: ${formData.challengingAreas?.join(', ') || 'Not specified'}
- Languages: ${formData.languagesSpoken?.join(', ') || 'English'}
- Timeline: ${formData.transitionTimeline || 'Standard pace'}

**Return ONLY this JSON structure with SHORT bullet points (max 10 words each):**
{
  "overallAlignment": {
    "percentage": <number 0-100>,
    "subjectsNeedingBridge": ["<subject1>", "<subject2>"],
    "estimatedDuration": "<e.g., 6-8 months>"
  },
  "subjectAnalysis": [
    {
      "subject": "<name>",
      "topicsCovered": <number>,
      "totalTopics": <number>,
      "alignmentLevel": "strong" | "moderate" | "high_gap",
      "keyGaps": ["<topic1>", "<topic2>", "<topic3>"]
    }
  ],
  "criticalGaps": [
    "<short gap description, max 8 words>",
    "<e.g., Trigonometry depth and applications>",
    "<e.g., Organic chemistry reactions>"
  ],
  "bridgeTimeline": {
    "phase1": {
      "name": "<phase name>",
      "duration": "Months 1-3",
      "bullets": ["<action 1>", "<action 2>", "<action 3>"]
    },
    "phase2": {
      "name": "<phase name>",
      "duration": "Months 4-6",
      "bullets": ["<action 1>", "<action 2>", "<action 3>"]
    },
    "phase3": {
      "name": "<phase name>",
      "duration": "Months 7-8",
      "bullets": ["<action 1>", "<action 2>"]
    }
  },
  "recommendations": {
    "study": ["<short tip>", "<short tip>", "<short tip>", "<short tip>"],
    "skillStrategy": ["<short tip>", "<short tip>", "<short tip>", "<short tip>"],
    "resources": ["<resource name + type>", "<resource name + type>", "<resource name + type>"],
    "culturalLanguage": ["<short tip>", "<short tip>", "<short tip>"]
  }
}

IMPORTANT: Each bullet must be under 10 words. Be specific with topic/resource names.`;

    // ==========================================================================
    // ASYNC JOB EXECUTION WITH TIMEOUT, RETRIES, AND DLQ
    // ==========================================================================
    
    const aiJobResult = await executeJob(
      async () => {
        // Measure LLM latency within the job
        const response = await logger.measureLLM('google/gemini-2.5-flash', async () => {
          return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              temperature: 0.7,
              max_tokens: 3000,
            }),
          });
        });
        
        // Check response status and throw appropriate errors for retry logic
        if (!response.ok) {
          const errorText = await response.text();
          
          // Throw with status code for retry decision
          if (response.status === 429) {
            throw new Error(`429:RATE_LIMITED:${errorText}`);
          }
          if (response.status === 402) {
            throw new Error(`402:CREDITS_DEPLETED:${errorText}`);
          }
          if (response.status === 408 || response.status === 504) {
            throw new Error(`${response.status}:TIMEOUT:${errorText}`);
          }
          if (response.status === 503) {
            throw new Error(`503:OVERLOADED:${errorText}`);
          }
          throw new Error(`${response.status}:UPSTREAM_ERROR:${errorText}`);
        }
        
        return response;
      },
      JobConfigs.aiAnalysis,
      { curriculum: formData.currentCurriculum, grade: formData.snapshotGrade },
      { userId: user.id, requestId: logger.getRequestId() }
    );
    
    // Handle job failure
    if (!aiJobResult.success) {
      const errorParts = aiJobResult.error?.split(':') || ['500', 'UNKNOWN', 'Unknown error'];
      const statusCode = parseInt(errorParts[0]) || 500;
      const errorCode = errorParts[1] || 'UNKNOWN';
      
      logger.error("AI job failed", { 
        jobId: aiJobResult.jobId,
        attempts: aiJobResult.attempts,
        error: aiJobResult.error,
        duration: aiJobResult.totalDuration
      });
      
      // Map error codes to responses
      if (errorCode === 'RATE_LIMITED') {
        logger.trackFailure('ai_service', 'RATE_LIMITED', 'AI rate limit exceeded');
        logger.logSummary(false);
        return createErrorResponse(
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded. Please try again in a moment.',
          429,
          { ...corsHeaders, 'X-Job-Id': aiJobResult.jobId },
          apiVersion
        );
      }
      if (errorCode === 'CREDITS_DEPLETED') {
        logger.trackFailure('ai_service', 'CREDITS_EXHAUSTED', 'AI credits depleted');
        logger.logSummary(false);
        return createErrorResponse(
          ErrorCodes.CREDITS_DEPLETED,
          'AI credits depleted. Please add credits to continue.',
          402,
          { ...corsHeaders, 'X-Job-Id': aiJobResult.jobId },
          apiVersion
        );
      }
      if (errorCode === 'TIMEOUT' || aiJobResult.error?.includes('timed out')) {
        logger.trackFailure('ai_service', 'TIMEOUT', 'AI request timed out', { 
          attempts: aiJobResult.attempts,
          duration: aiJobResult.totalDuration
        });
        logger.logSummary(false);
        return createErrorResponse(
          ErrorCodes.AI_TIMEOUT,
          `AI analysis took longer than expected (attempted ${aiJobResult.attempts} time(s))`,
          408,
          { ...corsHeaders, 'X-Job-Id': aiJobResult.jobId },
          apiVersion
        );
      }
      if (errorCode === 'OVERLOADED') {
        logger.trackFailure('ai_service', 'OVERLOADED', 'AI service overloaded');
        logger.logSummary(false);
        return createErrorResponse(
          ErrorCodes.AI_OVERLOADED,
          'AI service is experiencing high demand',
          503,
          { ...corsHeaders, 'X-Job-Id': aiJobResult.jobId },
          apiVersion
        );
      }
      
      logger.trackFailure('ai_service', 'UPSTREAM_ERROR', 'AI gateway returned error', { 
        statusCode,
        error: aiJobResult.error?.substring(0, 200)
      });
      logger.logSummary(false);
      return createErrorResponse(
        ErrorCodes.UPSTREAM_ERROR,
        'Unable to process request',
        500,
        { ...corsHeaders, 'X-Job-Id': aiJobResult.jobId },
        apiVersion
      );
    }
    
    const response = aiJobResult.data!;
    logger.info("AI job completed", { 
      jobId: aiJobResult.jobId, 
      attempts: aiJobResult.attempts,
      duration: aiJobResult.totalDuration.toFixed(2) 
    });

    const aiResponse = await response.json();
    
    // Log AI response metadata (tokens, timing) without PII
    const llmLatency = performance.now() - (logger as any).context?.startTime || 0;
    logger.logAIResponse('google/gemini-2.5-flash', aiResponse, llmLatency);
    
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      logger.error("No content in AI response");
      logger.trackFailure('ai_service', 'EMPTY_RESPONSE', 'AI returned no content', {
        finishReason: aiResponse.choices?.[0]?.finish_reason
      });
      logger.flagHallucination('empty_response', 'AI returned no content');
      logger.logSummary(false);
      return createErrorResponse(
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Unable to process request',
        500,
        corsHeaders,
        apiVersion
      );
    }

    logger.info("AI analysis received, parsing response...");

    let analysisData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      analysisData = JSON.parse(jsonString.trim());
    } catch (parseError) {
      logger.warn("JSON parse error, attempting cleanup", { error: String(parseError) });
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        try {
          analysisData = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
        } catch {
          logger.trackFailure('ai_service', 'JSON_PARSE_FAILED', 'AI response could not be parsed as JSON after cleanup');
          logger.flagHallucination('invalid_json', 'AI response could not be parsed as JSON');
          logger.logSummary(false);
          return createErrorResponse(
            ErrorCodes.AI_RESPONSE_INVALID,
            'AI response could not be processed',
            500,
            corsHeaders,
            apiVersion
          );
        }
      } else {
        logger.trackFailure('ai_service', 'NO_JSON_STRUCTURE', 'AI response contains no JSON structure');
        logger.flagHallucination('no_json_structure', 'AI response contains no JSON structure');
        logger.logSummary(false);
        return createErrorResponse(
          ErrorCodes.AI_RESPONSE_INVALID,
          'AI response could not be processed',
          500,
          corsHeaders,
          apiVersion
        );
      }
    }

    // Check for hallucinations in the parsed response
    logger.checkForHallucinations(analysisData);

    logger.info("Successfully parsed curriculum analysis");
    logger.logSummary(true);

    // Schedule background task to log analytics (non-blocking)
    scheduleBackgroundTask(
      async () => {
        console.log(`[ANALYTICS] Recording analysis completion for user ${user.id}`);
        // This could be extended to write to analytics table
        return { recorded: true, timestamp: new Date().toISOString() };
      },
      { jobType: 'analytics_log', timeout: 5000, maxRetries: 0 },
      (result) => {
        if (result.success) {
          console.log(`[ANALYTICS] Background task completed: ${result.jobId}`);
        }
      }
    );

    // Create validation summary for response
    const validationSummary = createValidationSummary(knowledgeValidation);

    return createSuccessResponse({ 
      analysis: analysisData,
      validation: validationSummary,
      _meta: {
        requestId: logger.getRequestId(),
        jobId: aiJobResult.jobId,
        attempts: aiJobResult.attempts,
        processingTime: aiJobResult.totalDuration,
        validatorVersion: knowledgeValidation.metadata.validatorVersion,
      }
    }, corsHeaders, apiVersion);

  } catch (error) {
    const isTimeout = error instanceof TimeoutError;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error("Unhandled error in analyze-curriculum function", { 
      error: errorMessage,
      isTimeout,
      isRetryable: isRetryableError(error)
    });
    logger.logSummary(false);
    
    // Return more specific error for timeouts
    if (isTimeout) {
      return createErrorResponse(
        ErrorCodes.AI_TIMEOUT,
        'Request processing timed out',
        408,
        corsHeaders,
        API_VERSION
      );
    }
    
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Unable to process request',
      500,
      corsHeaders,
      API_VERSION
    );
  }
});
