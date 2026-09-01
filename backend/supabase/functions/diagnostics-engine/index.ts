import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createLogger } from "../_shared/observability.ts";
import { checkRateLimit, getRateLimitIdentifier, RateLimitConfigs, sanitizeUUID, sanitizeArray } from "../_shared/security.ts";
import { createErrorResponse, ErrorCodes, API_VERSION } from "../_shared/apiContracts.ts";
import {
  CurriculumEntry,
  CURRICULUM_DB_REGISTRY,
  SUBJECT_ALIASES,
  mapToDBEntry,
  expandSubjectFilter,
  GapNode,
  getNodeSubjectLabel,
  classifyGapsBySubject,
  mergeBestSourceMatch,
} from "../_shared/curriculumGaps.ts";

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

// =============================================================================
// RAG-based diagnostics (replaces hardcoded per-curriculum factor table)
//
// The previous implementation never queried real gap data: it fetched an
// unfiltered, uncurricula-scoped list of curriculum_nodes purely to get a
// COUNT, then split that count via a hardcoded lookup table
// (cbse: 0.65, ib: 0.80, common_core: 0.90, ...) or a fixed 70/20/10 split
// keyed off self-reported "strong"/"challenging" subjects. None of that
// touched curriculum_embeddings — the exact same real gap data that
// analyze-curriculum and alignment-engine already use — so the Guardian
// Dashboard (which reads this function's output via diagnostic_results)
// showed a different, fabricated number from the parent/student report for
// the same student. This rewrite calls the same find_curriculum_gaps_rag
// RPC and the same percentile severity classification those two functions
// use, so all three surfaces agree.
// =============================================================================

// Registry, subject aliases, and getNodeSubjectLabel come from
// _shared/curriculumGaps.ts (imported above) — kept in one place after this
// function's own copy of the classifier drifted from analyze-curriculum's,
// which is exactly what caused the Guardian Dashboard to disagree with the
// parent/student report for the same student (see the header comment on the
// RAG-based diagnostics rewrite below).
function normalizeToDBEntry(curriculum: string): CurriculumEntry | null {
  return mapToDBEntry(curriculum);
}

/** Conservative flat estimate for when RAG data isn't available — clearly a fallback, not computed. */
function buildFallbackSubjectScores(subjectsToAnalyze: string[]): Record<string, SubjectDiagnostic> {
  const scores: Record<string, SubjectDiagnostic> = {};
  for (const subject of subjectsToAnalyze) {
    scores[subject] = { score: 50, conceptsMastered: [], conceptsInProgress: [], conceptsMissing: [], gradeEquivalent: 0 };
  }
  return scores;
}

async function runDiagnostics(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  studentProfile: Record<string, unknown>,
  assessmentData: Record<string, unknown> | null,
  diagnosticType: string,
  subjects?: string[]
): Promise<DiagnosticResult> {
  const gradeLevel = studentProfile.grade_level as number || (studentProfile.current_grade as number) || 9;
  const sourceCurriculumRaw = (studentProfile.previous_curriculum as string) || (studentProfile.current_curriculum as string) || 'unknown';
  const targetCurriculumRaw = (studentProfile.target_curriculum as string) || 'unknown';

  const subjectsToAnalyze = subjects || ['math', 'science', 'english', 'social_studies'];

  logger.debug('Analyzing subjects (RAG-based)', { subjects: subjectsToAnalyze, gradeLevel, source: sourceCurriculumRaw, target: targetCurriculumRaw });

  const sourceEntry = normalizeToDBEntry(sourceCurriculumRaw);
  const targetEntry = normalizeToDBEntry(targetCurriculumRaw);

  let subjectScores: Record<string, SubjectDiagnostic>;

  if (sourceEntry && targetEntry && sourceEntry.dbSystem !== targetEntry.dbSystem) {
    const gradeMin = Math.max(1, gradeLevel - 1);
    const gradeMax = Math.min(12, gradeLevel + 1);

    const rpcParams = {
      source_curriculum: sourceEntry.dbSystem,
      target_curriculum: targetEntry.dbSystem,
      grade_min: gradeMin,
      grade_max: gradeMax,
      similarity_threshold: 0.0,
      result_limit: 300,
      source_node_type: sourceEntry.nodeType,
      target_node_type_filter: targetEntry.nodeType,
      // Only for grades 11-12 — see the matching comment in
      // analyze-curriculum's rpcParams. For grades 1-10 the generic
      // subject list can't represent a target-only mandatory subject like
      // Hindi/Sanskrit, so filtering there would hide exactly the gaps a
      // cross-curriculum report needs to surface.
      target_subjects: gradeLevel >= 11 ? expandSubjectFilter(subjectsToAnalyze) ?? null : null,
      // Cumulative source grade window — see the matching comment in
      // analyze-curriculum's rpcParams. The target band stays narrow
      // (grade±1); the source band spans grade 1 through grade+1 so a
      // student's earlier-grade prior knowledge actually counts as coverage.
      source_grade_min: 1,
      source_grade_max: gradeMax,
    };

    const { data: primaryRows, error: rpcError } = await logger.measureRetrieval(
      'find_curriculum_gaps_rag',
      async () => supabase.rpc('find_curriculum_gaps_rag', rpcParams)
    );

    let gapRows: GapNode[] = primaryRows || [];

    // Merge in NGSS as an additional TARGET curriculum when going TO the US
    // (Common Core alone only covers Math/ELA) — this function previously
    // had no NGSS handling at all, unlike analyze-curriculum/alignment-engine.
    if (!rpcError && targetEntry.dbSystem === 'us-common-core') {
      const ngssEntry = CURRICULUM_DB_REGISTRY['ngss'];
      const { data: ngssTargetGaps, error: ngssTargetError } = await logger.measureRetrieval(
        'find_curriculum_gaps_rag:ngss_target',
        async () => supabase.rpc('find_curriculum_gaps_rag', { ...rpcParams, target_curriculum: ngssEntry.dbSystem, target_node_type_filter: ngssEntry.nodeType })
      );
      if (ngssTargetError) {
        logger.warn('NGSS target-merge error (non-fatal)', { error: ngssTargetError.message });
      } else if (ngssTargetGaps && ngssTargetGaps.length > 0) {
        gapRows = [...gapRows, ...ngssTargetGaps];
      }
    }

    // Merge in NGSS as an additional SOURCE curriculum when coming FROM the
    // US — otherwise a student's real science background never counts as
    // coverage for Science-domain target topics, which instead get compared
    // only against irrelevant Math/ELA text (verified against production
    // data). sourceSystemsQueried tracks which source systems actually
    // contributed rows, so classifyGapsBySubject's domain gate correctly
    // falls back if this merge errors or times out.
    const sourceSystemsQueried: string[] = [sourceEntry.dbSystem];
    if (!rpcError && sourceEntry.dbSystem === 'us-common-core') {
      const ngssEntry = CURRICULUM_DB_REGISTRY['ngss'];
      const { data: ngssSourceGaps, error: ngssSourceError } = await logger.measureRetrieval(
        'find_curriculum_gaps_rag:ngss_source',
        async () => supabase.rpc('find_curriculum_gaps_rag', { ...rpcParams, source_curriculum: ngssEntry.dbSystem, source_node_type: ngssEntry.nodeType })
      );
      if (ngssSourceError) {
        logger.warn('NGSS source-merge error (non-fatal)', { error: ngssSourceError.message });
      } else if (ngssSourceGaps && ngssSourceGaps.length > 0) {
        gapRows = mergeBestSourceMatch(gapRows, ngssSourceGaps as GapNode[]);
        sourceSystemsQueried.push('ngss');
      }
    }

    if (rpcError || !gapRows || gapRows.length === 0) {
      logger.warn('Diagnostics RAG unavailable, using fallback estimate', { error: rpcError?.message });
      subjectScores = buildFallbackSubjectScores(subjectsToAnalyze);
    } else {
      // Per-subject, domain-gated classification — shared with
      // analyze-curriculum and alignment-engine. See
      // _shared/curriculumGaps.ts for the full rationale, verified against
      // production data. Group by a lowercased key so it matches this
      // function's own subject-request-matching convention below.
      const lowerKeyFn = (n: GapNode) => getNodeSubjectLabel(n).toLowerCase().trim();
      const { bySubjectCovered, bySubjectGaps } = classifyGapsBySubject(gapRows, sourceSystemsQueried, lowerKeyFn);

      subjectScores = {};
      for (const subject of subjectsToAnalyze) {
        // Match the requested subject label against whatever subject keys the RAG rows grouped into.
        const key = subject.toLowerCase().trim();
        const aliasSet = new Set([key, ...(SUBJECT_ALIASES[key] || [])]);
        const allKeys = new Set([...bySubjectCovered.keys(), ...bySubjectGaps.keys()]);
        const matchedKeys = [...allKeys].filter(k => aliasSet.has(k) || k.includes(key) || key.includes(k));
        const covered = matchedKeys.flatMap(k => bySubjectCovered.get(k) || []);
        const gaps = matchedKeys.flatMap(k => bySubjectGaps.get(k) || []);
        const totalSubj = covered.length + gaps.length;

        if (totalSubj === 0) {
          subjectScores[subject] = { score: 50, conceptsMastered: [], conceptsInProgress: [], conceptsMissing: [], gradeEquivalent: 0 };
          continue;
        }

        const score = Math.round((covered.length / totalSubj) * 100);
        subjectScores[subject] = {
          score,
          conceptsMastered: covered.slice(0, 10).map((r) => r.target_node_name),
          conceptsInProgress: [],
          conceptsMissing: gaps.slice(0, 10).map((r) => r.target_node_name),
          gradeEquivalent: calculateGradeEquivalent(score, gradeLevel),
        };
      }
    }
  } else {
    logger.info('Diagnostics: curricula not in DB or same — using fallback estimate', {
      source: sourceCurriculumRaw, target: targetCurriculumRaw,
    });
    subjectScores = buildFallbackSubjectScores(subjectsToAnalyze);
  }

  // Fill in gradeEquivalent for any subject the block above skipped
  for (const subject of subjectsToAnalyze) {
    if (subjectScores[subject] && !subjectScores[subject].gradeEquivalent) {
      subjectScores[subject].gradeEquivalent = calculateGradeEquivalent(subjectScores[subject].score, gradeLevel);
    }
  }

  const strengthAreas: string[] = [];
  const gapAreas: string[] = [];
  for (const [subject, diagnostic] of Object.entries(subjectScores)) {
    if (diagnostic.score >= 80) strengthAreas.push(subject);
    else if (diagnostic.score < 60) gapAreas.push(subject);
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
