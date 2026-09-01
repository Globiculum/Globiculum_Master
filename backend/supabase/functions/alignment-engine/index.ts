import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createLogger } from "../_shared/observability.ts";
import { checkRateLimit, getRateLimitIdentifier, RateLimitConfigs, sanitizeString, sanitizeNumber } from "../_shared/security.ts";
import { createErrorResponse, ErrorCodes, API_VERSION } from "../_shared/apiContracts.ts";
import {
  CurriculumEntry,
  CURRICULUM_DB_REGISTRY,
  mapToDBEntry,
  expandSubjectFilter,
  GapNode,
  getNodeSubjectLabel,
  classifyGapsBySubject,
  mergeBestSourceMatch,
} from "../_shared/curriculumGaps.ts";

interface AlignmentRequest {
  sourceCurriculum: string;
  targetCurriculum: string;
  gradeLevel: number;
  subjects?: string[];
}

interface AlignmentResult {
  overallAlignment: number;
  subjectAlignments: SubjectAlignment[];
  gaps: AlignmentGap[];
  overlaps: AlignmentOverlap[];
  recommendations: AlignmentRecommendation[];
  timestamp: string;
}

interface SubjectAlignment {
  subject: string;
  alignmentScore: number;
  sourceCoverage: number;
  targetCoverage: number;
  gapCount: number;
  overlapCount: number;
}

interface AlignmentGap {
  id: string;
  subject: string;
  topic: string;
  gapType: 'content' | 'depth' | 'timing' | 'approach';
  severity: 'critical' | 'moderate' | 'minor';
  description: string;
  bridgeTime: string;
}

interface AlignmentOverlap {
  subject: string;
  topic: string;
  sourceGrade: number;
  targetGrade: number;
  overlapType: 'full' | 'partial';
}

interface AlignmentRecommendation {
  priority: number;
  subject: string;
  action: string;
  timeEstimate: string;
  resources: string[];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const logger = createLogger('alignment-engine');
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

    let requestData: AlignmentRequest;
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

    const { sourceCurriculum, targetCurriculum, gradeLevel, subjects } = requestData;

    // Validate inputs
    if (!sourceCurriculum || !targetCurriculum) {
      logger.logValidationFailure('curriculum', 'Source and target curriculum are required', 'error');
      logger.logSummary(false);
      return new Response(
        JSON.stringify({ error: 'Source and target curriculum are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (gradeLevel < 1 || gradeLevel > 12) {
      logger.logValidationFailure('gradeLevel', 'Grade level must be between 1 and 12', 'error');
      logger.logSummary(false);
      return new Response(
        JSON.stringify({ error: 'Grade level must be between 1 and 12' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Running alignment', { 
      sourceCurriculum, 
      targetCurriculum, 
      gradeLevel,
      subjectCount: subjects?.length || 'default'
    });

    // Run the alignment engine
    const alignmentResult = await runAlignment(
      supabase,
      logger,
      sourceCurriculum,
      targetCurriculum,
      gradeLevel,
      subjects || ['math', 'science', 'english', 'social_studies']
    );

    logger.info('Alignment completed', { 
      overallAlignment: alignmentResult.overallAlignment,
      gapCount: alignmentResult.gaps.length,
      overlapCount: alignmentResult.overlaps.length
    });
    logger.logSummary(true);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: alignmentResult,
        _meta: { requestId: logger.getRequestId() }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Unhandled error in alignment-engine', { 
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
// RAG HELPERS
// =============================================================================

// Curriculum registry, subject aliases, and per-subject domain-gated
// classification now live in _shared/curriculumGaps.ts (imported above) —
// shared with analyze-curriculum and diagnostics-engine so a fix to any of
// them lands in one place instead of three. See that file's header for the
// full rationale: a subject with zero source-curriculum overlap (e.g. Hindi
// vs. US Common Core) previously got fake partial "coverage" from global
// percentile ranking, and dominated the "critical" bucket at the expense of
// other subjects' real gaps.

/** Adapts the shared classifier's output to this function's existing
 * gapStandards/coveredStandards/severityByNodeId shape.
 *
 * IMPORTANT: the shared classifier returns new ({ ...node, _severity })
 * objects for gap rows, not the same references as the input array — so
 * callers must use subjectStats (also returned here) rather than an
 * `array.includes(node)` reference check to tell gap vs. covered per
 * subject; a reference check would silently count every node as "covered". */
function classifyBySubject(allNodes: GapNode[], sourceSystemsQueried: string[]): {
  gapStandards: GapNode[];
  coveredStandards: GapNode[];
  severityByNodeId: Map<string, 'critical' | 'moderate' | 'minor'>;
  subjectStats: Map<string, { total: number; covered: number }>;
} {
  const lowerKeyFn = (n: GapNode) => getNodeSubjectLabel(n).toLowerCase().trim();
  const { gapNodesWithSeverity, coveredNodes, subjectStats } = classifyGapsBySubject(allNodes, sourceSystemsQueried, lowerKeyFn);
  const severityMap: Record<'CRITICAL' | 'MAJOR' | 'MODERATE', 'critical' | 'moderate' | 'minor'> = {
    CRITICAL: 'critical', MAJOR: 'moderate', MODERATE: 'minor',
  };
  const severityByNodeId = new Map<string, 'critical' | 'moderate' | 'minor'>();
  for (const g of gapNodesWithSeverity) severityByNodeId.set(g.target_node_id, severityMap[g._severity]);
  return { gapStandards: gapNodesWithSeverity, coveredStandards: coveredNodes, severityByNodeId, subjectStats };
}

function normalizeToDBEntry(curriculum: string): CurriculumEntry | null {
  return mapToDBEntry(curriculum);
}

function getNodeSubject(metadata: Record<string, unknown>): string {
  return getNodeSubjectLabel({ target_metadata: metadata }).toLowerCase().trim();
}

function getResourcesForSubject(subject: string, severity: string): string[] {
  const map: Record<string, string[]> = {
    mathematics: ['Khan Academy Math', 'IXL Math Practice'],
    math: ['Khan Academy Math', 'IXL Math Practice'],
    'english language arts & literacy': ['CommonLit', 'NoRedInk', 'ReadWorks'],
    english: ['CommonLit', 'NoRedInk'],
    science: ['Khan Academy Science', 'PhET Simulations'],
  };
  const base = map[subject] ?? ['Khan Academy', 'Study.com'];
  return severity === 'critical' ? [...base, '1-on-1 Tutoring Recommended'] : base;
}

/** Lightweight estimated result when curricula are not in our DB. */
function buildEstimatedAlignment(
  sourceCurriculum: string,
  targetCurriculum: string,
  gradeLevel: number,
  subjects: string[]
): AlignmentResult {
  const est = 60; // conservative estimate for unknown pair
  return {
    overallAlignment: est,
    subjectAlignments: subjects.map(s => ({
      subject: s,
      alignmentScore: est,
      sourceCoverage: 50,
      targetCoverage: 50,
      gapCount: Math.round(50 * (1 - est / 100)),
      overlapCount: Math.round(50 * (est / 100)),
    })),
    gaps: [],
    overlaps: [],
    recommendations: [{
      priority: 1,
      subject: subjects[0] || 'general',
      action: `Review ${targetCurriculum} standards for ${sourceCurriculum} students`,
      timeEstimate: '6-8 months',
      resources: ['Khan Academy', 'Study.com'],
    }],
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// RAG-based alignment (replaces word-matching)
// =============================================================================

async function runAlignmentRAG(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  sourceEntry: { dbSystem: string; nodeType: string | null },
  targetEntry: { dbSystem: string; nodeType: string | null },
  gradeLevel: number,
  subjects: string[],
): Promise<AlignmentResult> {
  const gradeMin = Math.max(1, gradeLevel - 1);
  const gradeMax = Math.min(12, gradeLevel + 1);

  const baseParams = {
    source_curriculum: sourceEntry.dbSystem,
    target_curriculum: targetEntry.dbSystem,
    grade_min: gradeMin,
    grade_max: gradeMax,
    similarity_threshold: 0.0,                    // fetch ALL; percentile applied below
    result_limit: 300,
    source_node_type: sourceEntry.nodeType,        // curriculum-specific
    target_node_type_filter: targetEntry.nodeType, // curriculum-specific
    // Only for grades 11-12 — see the matching comment in analyze-curriculum's
    // rpcParams. For grades 1-10 the generic subject list can't represent a
    // target-only mandatory subject like Hindi/Sanskrit, so filtering there
    // would hide exactly the gaps a cross-curriculum report needs to surface.
    target_subjects: gradeLevel >= 11 ? expandSubjectFilter(subjects) ?? null : null,
    // Cumulative source grade window — see the matching comment in
    // analyze-curriculum's rpcParams. The target band stays narrow
    // (grade±1); the source band spans grade 1 through grade+1 so a
    // student's earlier-grade prior knowledge actually counts as coverage.
    source_grade_min: 1,
    source_grade_max: gradeMax,
  };

  const { data: primaryData, error } = await logger.measureRetrieval(
    'find_curriculum_gaps_rag',
    async () => supabase.rpc('find_curriculum_gaps_rag', baseParams)
  );

  if (error || !primaryData || primaryData.length === 0) {
    logger.warn('RAG data unavailable', { error: error?.message });
    return buildEstimatedAlignment(sourceEntry.dbSystem, targetEntry.dbSystem, gradeLevel, ['math', 'english', 'science']);
  }

  // US Common Core only covers Math/ELA — merge in NGSS (Science) gaps so a
  // "us-common-core" target also reflects Science alignment.
  let rawData: GapNode[] = primaryData;
  if (targetEntry.dbSystem === 'us-common-core') {
    const ngssEntry = CURRICULUM_DB_REGISTRY['ngss'];
    const { data: ngssData, error: ngssError } = await logger.measureRetrieval(
      'find_curriculum_gaps_rag:ngss',
      async () => supabase.rpc('find_curriculum_gaps_rag', { ...baseParams, target_curriculum: ngssEntry.dbSystem, target_node_type_filter: ngssEntry.nodeType })
    );
    if (ngssError) {
      logger.warn('NGSS RAG merge error (non-fatal)', { error: ngssError.message });
    } else if (ngssData && ngssData.length > 0) {
      rawData = [...rawData, ...ngssData];
    }
  }

  // Merge in NGSS as an additional SOURCE curriculum when coming FROM the US
  // — otherwise a student's real science background never counts as coverage
  // for Science-domain target topics, which instead get compared only
  // against irrelevant Math/ELA text (verified against production data).
  // sourceSystemsQueried tracks which source systems actually contributed
  // rows, so the domain gate below correctly falls back if this errors/times out.
  const sourceSystemsQueried: string[] = [sourceEntry.dbSystem];
  if (sourceEntry.dbSystem === 'us-common-core') {
    const ngssEntry = CURRICULUM_DB_REGISTRY['ngss'];
    const { data: ngssSourceData, error: ngssSourceError } = await logger.measureRetrieval(
      'find_curriculum_gaps_rag:ngss_source',
      async () => supabase.rpc('find_curriculum_gaps_rag', { ...baseParams, source_curriculum: ngssEntry.dbSystem, source_node_type: ngssEntry.nodeType })
    );
    if (ngssSourceError) {
      logger.warn('NGSS source-merge error (non-fatal)', { error: ngssSourceError.message });
    } else if (ngssSourceData && ngssSourceData.length > 0) {
      rawData = mergeBestSourceMatch(rawData, ngssSourceData as GapNode[]);
      sourceSystemsQueried.push('ngss');
    }
  }

  // ── Per-subject classification ─────────────────────────────────────────
  // See classifyBySubject() above for why this replaced a single global
  // percentile ranking across all subjects.
  // Filter to the target curriculum's specific node type (or all nodes if nodeType is null)
  const allCC = rawData.filter(g =>
    targetEntry.nodeType == null || g.target_node_type === targetEntry.nodeType
  );

  const total = allCC.length;
  const { gapStandards, coveredStandards, severityByNodeId, subjectStats: rawSubjectStats } = classifyBySubject(allCC, sourceSystemsQueried);

  // ── Per-subject stats ───────────────────────────────────────────────────
  const subjectStats: Record<string, { gap: number; covered: number }> = {};
  for (const [subject, stats] of rawSubjectStats) {
    subjectStats[subject] = { gap: stats.total - stats.covered, covered: stats.covered };
  }

  // ── Build gap objects ───────────────────────────────────────────────────
  const gaps: AlignmentGap[] = gapStandards.map((g: any, idx: number) => {
    const meta    = (g.target_metadata || {}) as Record<string, unknown>;
    const subject = getNodeSubject(meta);
    const sev     = severityByNodeId.get(g.target_node_id) ?? 'minor';
    return {
      id: `rag-gap-${idx}`,
      subject,
      topic: (g.target_node_name || '').substring(0, 80),
      gapType: 'content' as const,
      severity: sev,
      description: g.best_source_match
        ? `Not well covered. Nearest chapter: "${g.best_source_match}"`
        : `No matching chapter in ${sourceEntry.dbSystem}`,
      bridgeTime: sev === 'critical' ? '4-6 weeks' : sev === 'moderate' ? '2-4 weeks' : '1-2 weeks',
    };
  });

  // ── Build overlap objects ───────────────────────────────────────────────
  const overlaps: AlignmentOverlap[] = coveredStandards.map((g: any) => {
    const meta    = (g.target_metadata || {}) as Record<string, unknown>;
    return {
      subject: getNodeSubject(meta),
      topic: (g.target_node_name || '').substring(0, 80),
      sourceGrade: gradeLevel,
      targetGrade: gradeLevel,
      overlapType: 'full' as const,
    };
  });

  // ── Subject alignment scores ────────────────────────────────────────────
  const subjectAlignments: SubjectAlignment[] = Object.entries(subjectStats).map(
    ([subject, stats]) => {
      const totalSubj   = stats.gap + stats.covered;
      const alignScore  = totalSubj > 0 ? Math.round((stats.covered / totalSubj) * 100) : 50;
      return {
        subject,
        alignmentScore: alignScore,
        sourceCoverage: total,
        targetCoverage: totalSubj,
        gapCount: stats.gap,
        overlapCount: stats.covered,
      };
    }
  );

  const overallAlignment = Math.round((coveredStandards.length / total) * 100);

  // ── Top 5 priority recommendations from critical gaps ───────────────────
  const recommendations: AlignmentRecommendation[] = gaps
    .filter(g => g.severity === 'critical')
    .slice(0, 5)
    .map((gap, idx) => ({
      priority: idx + 1,
      subject: gap.subject,
      action: `Bridge gap: ${gap.topic.substring(0, 60)}`,
      timeEstimate: gap.bridgeTime,
      resources: getResourcesForSubject(gap.subject, gap.severity),
    }));

  const allSims = allCC.map((n: any) => n.best_similarity ?? 0);
  logger.info('RAG alignment computed', {
    total, overallAlignment, gaps: gaps.length, overlaps: overlaps.length,
    simRange: `${Math.min(...allSims).toFixed(3)}-${Math.max(...allSims).toFixed(3)}`,
  });

  return { overallAlignment, subjectAlignments, gaps, overlaps, recommendations, timestamp: new Date().toISOString() };
}

async function runAlignment(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  sourceCurriculum: string,
  targetCurriculum: string,
  gradeLevel: number,
  subjects: string[]
): Promise<AlignmentResult> {
  const sourceEntry = normalizeToDBEntry(sourceCurriculum);
  const targetEntry = normalizeToDBEntry(targetCurriculum);

  if (sourceEntry && targetEntry && sourceEntry.dbSystem !== targetEntry.dbSystem) {
    logger.info('RAG alignment', { source: sourceEntry.dbSystem, target: targetEntry.dbSystem });
    return runAlignmentRAG(supabase, logger, sourceEntry, targetEntry, gradeLevel, subjects);
  }

  logger.info('Curricula not in DB or same, returning estimate', { sourceCurriculum, targetCurriculum });
  return buildEstimatedAlignment(sourceCurriculum, targetCurriculum, gradeLevel, subjects);
}
