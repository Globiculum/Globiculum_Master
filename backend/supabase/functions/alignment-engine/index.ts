import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createLogger } from "../_shared/observability.ts";
import { checkRateLimit, getRateLimitIdentifier, RateLimitConfigs, sanitizeString, sanitizeNumber } from "../_shared/security.ts";
import { createErrorResponse, ErrorCodes, API_VERSION } from "../_shared/apiContracts.ts";

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

// Shared curriculum registry — mirrors CURRICULUM_DB_REGISTRY in analyze-curriculum.
// Add new curricula here once they are ingested into the DB.
const CURRICULUM_DB_REGISTRY: Record<string, { dbSystem: string; nodeType: string | null }> = {
  'cbse':           { dbSystem: 'ncert-cbse',    nodeType: 'topic'    },
  'ncert':          { dbSystem: 'ncert-cbse',    nodeType: 'topic'    },
  'icse':           { dbSystem: 'ncert-cbse',    nodeType: 'topic'    },
  'state-board':    { dbSystem: 'ncert-cbse',    nodeType: 'topic'    },
  'ncert-cbse':     { dbSystem: 'ncert-cbse',    nodeType: 'topic'    },
  'indian':         { dbSystem: 'ncert-cbse',    nodeType: 'topic'    },
  'india':          { dbSystem: 'ncert-cbse',    nodeType: 'topic'    },
  'common-core':    { dbSystem: 'us-common-core', nodeType: 'standard' },
  'common_core':    { dbSystem: 'us-common-core', nodeType: 'standard' },
  'us-common-core': { dbSystem: 'us-common-core', nodeType: 'standard' },
  'us':             { dbSystem: 'us-common-core', nodeType: 'standard' },
  // NGSS (US Science) — Common Core only covers Math/ELA, merged in alongside
  // 'us-common-core' inside runAlignmentRAG below.
  'ngss':           { dbSystem: 'ngss',           nodeType: 'standard' },
  'science':        { dbSystem: 'ngss',           nodeType: 'standard' },
  // 'ib-myp':      { dbSystem: 'ib-myp',          nodeType: 'objective' },
  // 'cambridge':   { dbSystem: 'cambridge-igcse',  nodeType: 'topic'    },
};

function normalizeToDBEntry(curriculum: string): { dbSystem: string; nodeType: string | null } | null {
  const c = curriculum.toLowerCase().trim();
  if (CURRICULUM_DB_REGISTRY[c]) return CURRICULUM_DB_REGISTRY[c];
  for (const [key, val] of Object.entries(CURRICULUM_DB_REGISTRY)) {
    if (c.includes(key) || key.includes(c)) return val;
  }
  return null;
}

function getNodeSubject(metadata: Record<string, unknown>): string {
  return ((metadata.subject as string) || (metadata.domain as string) || 'general')
    .toLowerCase()
    .trim();
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
  let rawData: any[] = primaryData;
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

  // ── Adaptive percentile classification ─────────────────────────────────
  // Same logic as analyze-curriculum edge function:
  //   bottom 10% by similarity = CRITICAL, 10-20% = MODERATE, 20-35% = MINOR, top 65% = covered
  // Filter to the target curriculum's specific node type (or all nodes if nodeType is null)
  const allCC = (rawData as any[]).filter(g =>
    targetEntry.nodeType == null || g.target_node_type === targetEntry.nodeType
  );
  const sortedAsc = [...allCC].sort(
    (a, b) => (a.best_similarity ?? 0) - (b.best_similarity ?? 0)
  );

  const total    = sortedAsc.length;
  const critIdx  = Math.floor(total * 0.10);
  const modIdx   = Math.floor(total * 0.20);
  const gapIdx   = Math.floor(total * 0.35);

  const critThresh = (sortedAsc[critIdx]  as any)?.best_similarity ?? 0;
  const modThresh  = (sortedAsc[modIdx]   as any)?.best_similarity ?? 0;

  const classifySeverity = (sim: number | null): 'critical' | 'moderate' | 'minor' => {
    const s = sim ?? 0;
    if (s <= critThresh) return 'critical';
    if (s <= modThresh)  return 'moderate';
    return 'minor';
  };

  const gapStandards     = sortedAsc.slice(0, gapIdx + 1); // bottom 35%
  const coveredStandards = sortedAsc.slice(gapIdx + 1);    // top 65%

  // ── Per-subject stats ───────────────────────────────────────────────────
  const subjectStats: Record<string, { gap: number; covered: number }> = {};
  for (const g of allCC as any[]) {
    const meta    = (g.target_metadata || {}) as Record<string, unknown>;
    const subject = getNodeSubject(meta);
    if (!subjectStats[subject]) subjectStats[subject] = { gap: 0, covered: 0 };
    if (gapStandards.includes(g)) subjectStats[subject].gap++;
    else                          subjectStats[subject].covered++;
  }

  // ── Build gap objects ───────────────────────────────────────────────────
  const gaps: AlignmentGap[] = gapStandards.map((g: any, idx: number) => {
    const meta    = (g.target_metadata || {}) as Record<string, unknown>;
    const subject = getNodeSubject(meta);
    const sev     = classifySeverity(g.best_similarity);
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

  logger.info('RAG alignment computed', {
    total, overallAlignment, gaps: gaps.length, overlaps: overlaps.length,
    simRange: `${sortedAsc[0]?.best_similarity?.toFixed(3)}-${sortedAsc[total-1]?.best_similarity?.toFixed(3)}`,
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
    return runAlignmentRAG(supabase, logger, sourceEntry, targetEntry, gradeLevel);
  }

  logger.info('Curricula not in DB or same, returning estimate', { sourceCurriculum, targetCurriculum });
  return buildEstimatedAlignment(sourceCurriculum, targetCurriculum, gradeLevel, subjects);
}
