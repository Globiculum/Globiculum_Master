import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createLogger } from "../_shared/observability.ts";
import { checkRateLimit, getRateLimitIdentifier, RateLimitConfigs, sanitizeUUID, sanitizeArray } from "../_shared/security.ts";
import { createErrorResponse, ErrorCodes, API_VERSION } from "../_shared/apiContracts.ts";

interface DiagnosticsRequest {
  studentId: string;
  assessmentId?: string;
  diagnosticType: 'full' | 'quick' | 'subject-specific';
  subjects?: string[];
}

interface DiagnosticResult {
  overallScore: number;
  subjectScores: Record<string, SubjectDiagnostic>;
  strengthAreas: string[];
  gapAreas: string[];
  readinessLevel: 'ready' | 'needs-bridging' | 'significant-gaps';
  recommendations: string[];
  timestamp: string;
}

interface SubjectDiagnostic {
  score: number;
  conceptsMastered: string[];
  conceptsInProgress: string[];
  conceptsMissing: string[];
  gradeEquivalent: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const logger = createLogger('diagnostics-engine');
  logger.info('Request received', { method: req.method });

  // Rate limiting
  const rateLimitId = getRateLimitIdentifier(req);
  const rateLimitResult = checkRateLimit(rateLimitId, RateLimitConfigs.standard);
  
  if (!rateLimitResult.allowed) {
    logger.warn('Rate limit exceeded', { identifier: rateLimitId });
    logger.logSummary(false);
    return createErrorResponse(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      'Too many requests',
      429,
      { ...corsHeaders, 'Retry-After': String(rateLimitResult.retryAfter || 60) },
      API_VERSION
    );
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logger.logValidationFailure('authorization', 'Missing or invalid authorization header', 'error');
      logger.logSummary(false);
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await logger.measureRetrieval('auth.getUser', async () => {
      return supabase.auth.getUser(token);
    });
    
    if (userError || !user) {
      logger.logValidationFailure('authentication', 'Invalid or expired authentication token', 'error');
      logger.logSummary(false);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('User authenticated', { userId: user.id });

    let requestData: DiagnosticsRequest;
    try {
      requestData = await req.json();
    } catch {
      logger.logValidationFailure('json-parse', 'Invalid JSON in request body', 'error');
      logger.logSummary(false);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { studentId, assessmentId, diagnosticType, subjects } = requestData;

    // Validate required fields
    if (!studentId) {
      logger.logValidationFailure('studentId', 'studentId is required', 'error');
      logger.logSummary(false);
      return new Response(
        JSON.stringify({ error: 'studentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Running diagnostics', { 
      studentId, 
      diagnosticType, 
      subjectCount: subjects?.length || 'all' 
    });

    // Fetch student profile
    const { data: studentProfile, error: profileError } = await logger.measureRetrieval(
      'fetch-student-profile',
      async () => supabase
        .from('student_profiles')
        .select('*')
        .eq('id', studentId)
        .single()
    );

    if (profileError || !studentProfile) {
      logger.logValidationFailure('studentProfile', 'Student profile not found', 'error');
      logger.logSummary(false);
      return new Response(
        JSON.stringify({ error: 'Student profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch assessment data if provided
    let assessmentData = null;
    if (assessmentId) {
      const { data, error } = await logger.measureRetrieval(
        'fetch-assessment',
        async () => supabase
          .from('assessments')
          .select('*')
          .eq('id', assessmentId)
          .single()
      );
      
      if (!error) {
        assessmentData = data;
      } else {
        logger.warn('Assessment not found', { assessmentId });
      }
    }

    // Run diagnostics based on type
    const diagnosticResult = await runDiagnostics(
      supabase,
      logger,
      studentProfile,
      assessmentData,
      diagnosticType,
      subjects
    );

    logger.info('Diagnostics completed', { 
      overallScore: diagnosticResult.overallScore,
      readinessLevel: diagnosticResult.readinessLevel,
      gapCount: diagnosticResult.gapAreas.length
    });
    logger.logSummary(true);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: diagnosticResult,
        _meta: { requestId: logger.getRequestId() }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Unhandled error in diagnostics-engine', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    logger.logSummary(false);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function runDiagnostics(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  studentProfile: Record<string, unknown>,
  assessmentData: Record<string, unknown> | null,
  diagnosticType: string,
  subjects?: string[]
): Promise<DiagnosticResult> {
  const gradeLevel = studentProfile.grade_level as number || 9;
  const currentCurriculum = studentProfile.current_curriculum as string || 'unknown';
  
  // Define subject areas to analyze
  const subjectsToAnalyze = subjects || ['math', 'science', 'english', 'social_studies'];
  
  logger.debug('Analyzing subjects', { subjects: subjectsToAnalyze, gradeLevel, curriculum: currentCurriculum });

  // Calculate subject-specific diagnostics
  const subjectScores: Record<string, SubjectDiagnostic> = {};
  const strengthAreas: string[] = [];
  const gapAreas: string[] = [];
  
  for (const subject of subjectsToAnalyze) {
    const diagnostic = await analyzeSubject(supabase, logger, subject, gradeLevel, currentCurriculum, assessmentData);
    subjectScores[subject] = diagnostic;
    
    if (diagnostic.score >= 80) {
      strengthAreas.push(subject);
    } else if (diagnostic.score < 60) {
      gapAreas.push(subject);
    }
  }
  
  // Calculate overall score
  const scores = Object.values(subjectScores).map(s => s.score);
  const overallScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  
  // Determine readiness level
  let readinessLevel: 'ready' | 'needs-bridging' | 'significant-gaps';
  if (overallScore >= 75 && gapAreas.length === 0) {
    readinessLevel = 'ready';
  } else if (overallScore >= 50 || gapAreas.length <= 1) {
    readinessLevel = 'needs-bridging';
  } else {
    readinessLevel = 'significant-gaps';
  }
  
  // Generate recommendations based on diagnostics
  const recommendations = generateRecommendations(subjectScores, gapAreas, readinessLevel);
  
  return {
    overallScore,
    subjectScores,
    strengthAreas,
    gapAreas,
    readinessLevel,
    recommendations,
    timestamp: new Date().toISOString()
  };
}

async function analyzeSubject(
  supabase: ReturnType<typeof createClient>,
  logger: ReturnType<typeof createLogger>,
  subject: string,
  gradeLevel: number,
  curriculum: string,
  assessmentData: Record<string, unknown> | null
): Promise<SubjectDiagnostic> {
  // Fetch curriculum nodes for this subject and grade
  const { data: curriculumNodes } = await logger.measureRetrieval(
    `fetch-curriculum-nodes-${subject}`,
    async () => supabase
      .from('curriculum_nodes')
      .select('*')
      .eq('node_type', 'topic')
      .lte('grade_level_min', gradeLevel)
      .gte('grade_level_max', gradeLevel)
  );
  
  const topics = curriculumNodes || [];
  const totalTopics = topics.length || 10; // fallback
  
  // Analyze based on assessment data or use curriculum-based estimation
  let mastered = 0;
  let inProgress = 0;
  let missing = 0;
  
  if (assessmentData) {
    // Use assessment responses to determine mastery
    const responses = (assessmentData.responses as Record<string, unknown>) || {};
    const strongSubjects = (responses.strongestSubjects as string[]) || [];
    const challengingAreas = (responses.challengingAreas as string[]) || [];
    
    if (strongSubjects.includes(subject)) {
      mastered = Math.floor(totalTopics * 0.7);
      inProgress = Math.floor(totalTopics * 0.2);
      missing = totalTopics - mastered - inProgress;
    } else if (challengingAreas.includes(subject)) {
      mastered = Math.floor(totalTopics * 0.3);
      inProgress = Math.floor(totalTopics * 0.3);
      missing = totalTopics - mastered - inProgress;
    } else {
      mastered = Math.floor(totalTopics * 0.5);
      inProgress = Math.floor(totalTopics * 0.3);
      missing = totalTopics - mastered - inProgress;
    }
  } else {
    // Default distribution based on curriculum type
    const curriculumFactor = getCurriculumAlignmentFactor(curriculum);
    mastered = Math.floor(totalTopics * curriculumFactor);
    inProgress = Math.floor(totalTopics * 0.25);
    missing = totalTopics - mastered - inProgress;
  }
  
  const score = Math.round((mastered / totalTopics) * 100);
  const gradeEquivalent = calculateGradeEquivalent(score, gradeLevel);
  
  logger.debug(`Subject analysis: ${subject}`, { score, mastered, inProgress, missing });
  
  return {
    score,
    conceptsMastered: topics.slice(0, mastered).map((t: any) => t.name),
    conceptsInProgress: topics.slice(mastered, mastered + inProgress).map((t: any) => t.name),
    conceptsMissing: topics.slice(mastered + inProgress).map((t: any) => t.name),
    gradeEquivalent
  };
}

function getCurriculumAlignmentFactor(curriculum: string): number {
  const factors: Record<string, number> = {
    'cbse': 0.65,
    'icse': 0.70,
    'ib': 0.80,
    'igcse': 0.75,
    'state_board': 0.55,
    'common_core': 0.90,
    'unknown': 0.50
  };
  return factors[curriculum.toLowerCase()] || 0.50;
}

function calculateGradeEquivalent(score: number, currentGrade: number): number {
  if (score >= 90) return currentGrade + 0.5;
  if (score >= 75) return currentGrade;
  if (score >= 60) return currentGrade - 0.5;
  if (score >= 45) return currentGrade - 1;
  return currentGrade - 1.5;
}

function generateRecommendations(
  subjectScores: Record<string, SubjectDiagnostic>,
  gapAreas: string[],
  readinessLevel: string
): string[] {
  const recommendations: string[] = [];
  
  if (readinessLevel === 'significant-gaps') {
    recommendations.push('Enroll in intensive bridging program before mainstream placement');
    recommendations.push('Consider one-on-one tutoring for gap areas');
  } else if (readinessLevel === 'needs-bridging') {
    recommendations.push('Complete targeted bridge modules for identified gaps');
    recommendations.push('Regular progress assessments recommended every 4 weeks');
  } else {
    recommendations.push('Ready for mainstream curriculum with minimal support');
    recommendations.push('Focus on advanced enrichment in strength areas');
  }
  
  // Subject-specific recommendations
  for (const gap of gapAreas) {
    const subjectData = subjectScores[gap];
    if (subjectData && subjectData.conceptsMissing.length > 0) {
      recommendations.push(`Focus on ${gap}: ${subjectData.conceptsMissing.slice(0, 3).join(', ')}`);
    }
  }
  
  return recommendations;
}
