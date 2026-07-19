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
  validateStudentData,
  createValidationSummary,
} from "../_shared/knowledgeValidation.ts";

// =============================================================================
// RAG HELPERS — map student curriculum to DB system + build gap context for LLM
// =============================================================================

// =============================================================================
// CURRICULUM REGISTRY — single source of truth for all supported curricula.
// When a new curriculum is ingested into the DB, add one entry here.
// =============================================================================
interface CurriculumEntry {
  dbSystem: string;        // curriculum_system value in curriculum_nodes table
  nodeType: string | null; // node_type to filter on; null = all types
  label: string;           // human-readable name for LLM prompts
}

const CURRICULUM_DB_REGISTRY: Record<string, CurriculumEntry> = {
  // ── Indian NCERT/CBSE system ────────────────────────────────────────────
  'cbse':          { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian CBSE (NCERT)' },
  'ncert':         { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian CBSE (NCERT)' },
  'icse':          { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian ICSE (NCERT-based)' },
  'state-board':   { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian State Board' },
  'ncert-cbse':    { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian CBSE (NCERT)' },
  'indian':        { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian Curriculum' },
  'india':         { dbSystem: 'ncert-cbse', nodeType: 'topic',    label: 'Indian Curriculum' },
  // ── US Common Core ──────────────────────────────────────────────────────
  'common-core':   { dbSystem: 'us-common-core', nodeType: 'standard', label: 'US Common Core' },
  'common_core':   { dbSystem: 'us-common-core', nodeType: 'standard', label: 'US Common Core' },
  'us-common-core':{ dbSystem: 'us-common-core', nodeType: 'standard', label: 'US Common Core' },
  'us':            { dbSystem: 'us-common-core', nodeType: 'standard', label: 'US Common Core' },
  // ── Future curricula (uncomment when ingested into DB) ─────────────────
  // 'ib-myp':     { dbSystem: 'ib-myp',            nodeType: 'objective', label: 'IB MYP' },
  // 'cambridge':  { dbSystem: 'cambridge-igcse',    nodeType: 'topic',    label: 'Cambridge IGCSE' },
  // 'igcse':      { dbSystem: 'cambridge-igcse',    nodeType: 'topic',    label: 'Cambridge IGCSE' },
  // 'uk':         { dbSystem: 'uk-national',        nodeType: 'standard', label: 'UK National Curriculum' },
};

/** Resolve a curriculum string to its DB entry. Returns null if not yet ingested. */
function mapToDBEntry(curriculum?: string): CurriculumEntry | null {
  if (!curriculum) return null;
  const c = curriculum.toLowerCase().trim();
  // Direct key match
  if (CURRICULUM_DB_REGISTRY[c]) return CURRICULUM_DB_REGISTRY[c];
  // Substring match (handles 'CBSE India', 'US Common Core', etc.)
  for (const [key, entry] of Object.entries(CURRICULUM_DB_REGISTRY)) {
    if (c.includes(key) || key.includes(c)) return entry;
  }
  return null;
}

/**
 * Infer the TARGET curriculum the student is transitioning TO.
 * Priority: explicit targetCurriculum > targetGoal text > snapshotLocation.
 */
function inferTargetEntry(formData: FormData): CurriculumEntry | null {
  // 1. Explicit target curriculum passed from form
  const explicit = mapToDBEntry(formData.targetCurriculum);
  if (explicit) return explicit;
  // 2. Infer from targetGoal (e.g. 'cbse', 'US curriculum alignment')
  const goal = (formData.targetGoal || '').toLowerCase();
  if (goal.includes('us') || goal.includes('common core') || goal.includes('american')) {
    return CURRICULUM_DB_REGISTRY['us-common-core'];
  }
  if (goal.includes('cbse') || goal.includes('ncert') || goal.includes('india')) {
    return CURRICULUM_DB_REGISTRY['ncert-cbse'];
  }
  if (goal.includes('icse')) return CURRICULUM_DB_REGISTRY['icse'];
  // 3. Fall back to snapshotLocation (where student currently is = likely target)
  const loc = (formData.snapshotLocation || '').toLowerCase();
  if (loc === 'us') return CURRICULUM_DB_REGISTRY['us-common-core'];
  if (loc === 'india' || loc === 'in') return CURRICULUM_DB_REGISTRY['ncert-cbse'];
  return null;
}

interface GapNode {
  target_node_id: string;
  target_node_name: string;
  target_node_type: string;
  target_grade_min: number;
  target_grade_max: number;
  target_description: string;
  target_metadata: Record<string, unknown>;
  best_source_match: string | null;
  best_similarity: number | null;
  gap_exists: boolean;
}

interface GapNodeWithSeverity extends GapNode {
  _severity: 'CRITICAL' | 'MAJOR' | 'MODERATE';
}

/**
 * Build a compact RAG context string for the LLM prompt.
 * Groups gaps by subject, shows target node name + closest source match.
 * Severity is pre-computed by adaptive percentile (not absolute similarity).
 */
/**
 * Auto-generate an NCERT textbook URL from metadata when no explicit URL is stored.
 * Pattern: https://ncert.nic.in/textbook.php?<bookcode> — approximated from grade + subject.
 */
function inferNcertUrl(meta: Record<string, unknown>, gradeLevelMin: number): string | null {
  const subject = ((meta.subject as string) || '').toLowerCase();
  const book = ((meta.book as string) || '').toLowerCase();
  if (!subject) return null;
  // NCERT portal search URL by grade + subject
  const gradeStr = gradeLevelMin ? `class+${gradeLevelMin}` : '';
  const subjectSlug = subject.replace(/[^a-z0-9]+/g, '+');
  return `https://ncert.nic.in/textbook.php?subject=${subjectSlug}&grade=${gradeStr}`;
}

function buildRagContext(
  gaps: GapNodeWithSeverity[],
  sourceLabel: string,
  targetLabel: string,
  alignmentPct: number,
  totalTargetNodes: number
): string {
  if (!gaps.length) return '';

  // Group by target subject from metadata
  const bySubject: Record<string, GapNodeWithSeverity[]> = {};
  for (const gap of gaps) {
    const meta = (gap.target_metadata || {}) as Record<string, unknown>;
    const subject = (
      (meta.subject as string) ||
      (meta.domain as string) ||
      'General'
    ).substring(0, 40);
    if (!bySubject[subject]) bySubject[subject] = [];
    bySubject[subject].push(gap);
  }

  const lines: string[] = [
    `REAL CURRICULUM GAP DATA (${sourceLabel} → ${targetLabel}, ${totalTargetNodes} target nodes analysed):`,
    `Overall alignment: ~${alignmentPct}% of ${targetLabel} nodes are semantically covered by the student's ${sourceLabel} background.`,
    `Priority gaps (bottom 35% by semantic similarity — these need bridging):`,
  ];

  let totalShown = 0;
  for (const [subject, subjectGaps] of Object.entries(bySubject)) {
    if (totalShown >= 30) break;
    lines.push(`\n[${subject}]`);
    for (const gap of subjectGaps.slice(0, 8)) {
      if (totalShown >= 30) break;
      const matchNote = gap.best_source_match
        ? `nearest source match: "${gap.best_source_match.substring(0, 60)}"`
        : 'no source node covers this topic';
      const targetTopic = (gap.target_node_name || '').substring(0, 100);
      const desc = (gap.target_description || '').substring(0, 80);
      const gapMeta = (gap.target_metadata || {}) as Record<string, unknown>;
      let resourceUrl: string | null =
        (gapMeta.url as string) ||
        (gapMeta.source_url as string) ||
        null;
      // Auto-generate NCERT URL when not present in source data
      if (!resourceUrl && gap.target_node_type === 'topic') {
        const curriculum = (gapMeta.source_type === 'chapter') ? 'ncert' : '';
        if (curriculum || targetLabel.toLowerCase().includes('ncert') || targetLabel.toLowerCase().includes('cbse')) {
          resourceUrl = inferNcertUrl(gapMeta, gap.target_grade_min);
        }
      }
      lines.push(`  [${gap._severity}] EXACT_TOPIC_NAME: "${targetTopic}"`);
      if (desc) lines.push(`    Context: ${desc}`);
      lines.push(`    ${matchNote}`);
      if (resourceUrl) lines.push(`    RESOURCE_URL: ${resourceUrl}`);
      totalShown++;
    }
  }

  return lines.join('\n');
}

interface FormData {
  schoolStage?: string;
  snapshotGrade?: number;
  snapshotLocation?: string;
  usState?: string;
  previousCountry?: string;
  currentCurriculum?: string;
  targetCurriculum?: string;  // explicit target (e.g. 'cbse', 'us-common-core')
  targetGoal?: string;        // text goal — used to infer targetCurriculum if not explicit
  academicPath?: string[];
  strongestSubjects?: string[];
  challengingAreas?: string[];
  languagesSpoken?: string[];
  transitionTimeline?: string;
}

// Debug log entry for visibility in browser console / Supabase function logs
interface DebugLog {
  step: string;
  message: string;
  data?: Record<string, unknown>;
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

  // Debug log accumulator — sent back to the frontend for console visibility
  const debugLogs: DebugLog[] = [];
  const addDebug = (step: string, message: string, data?: Record<string, unknown>) => {
    const entry: DebugLog = { step, message, data };
    debugLogs.push(entry);
    logger.info(`[DEBUG] ${step}: ${message}`, data);
  };

  logger.info('Request received', { method: req.method });
  addDebug('request_received', 'analyze-curriculum request started', { method: req.method });

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
      targetCurriculum: sanitizeForPrompt(rawFormData.targetCurriculum, 100) || undefined,
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
    
    const targetEntryForValidation = inferTargetEntry(formData);
    const knowledgeValidation = validateStudentData(
      formData as Record<string, unknown>,
      {
        gradeLevel: formData.snapshotGrade || 9,
        sourceCurriculum: formData.currentCurriculum || 'unknown',
        targetCurriculum: targetEntryForValidation?.dbSystem || 'common_core',
        subjects: formData.academicPath || ['math', 'science', 'english', 'social_studies'],
      }
    );
    
    logger.info("Knowledge validation completed (input-only, no heuristics)", {
      confidence: knowledgeValidation.confidence,
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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      logger.error("GEMINI_API_KEY is not configured");
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
      target: formData.targetCurriculum || formData.targetGoal,
      grade: formData.snapshotGrade,
      validationConfidence: knowledgeValidation.confidence
    });

    // ==========================================================================
    // RAG: Fetch real curriculum gaps using pre-computed embeddings in DB
    // find_curriculum_gaps_rag compares each target node against source nodes
    // using cosine similarity on 2048-dim vectors — NOT just title matching.
    // ==========================================================================
    let ragContext = '';
    let ragGapCount = 0;
    let subjectCoverageStats = '';  // per-subject coverage for LLM grounding

    // Resolve source and target curricula from the registry
    const sourceEntry = mapToDBEntry(formData.currentCurriculum);
    const targetEntry = inferTargetEntry(formData);

    addDebug('curriculum_lookup', 'Resolved curriculum registry entries', {
      currentCurriculum: formData.currentCurriculum,
      targetCurriculum: formData.targetCurriculum,
      targetGoal: formData.targetGoal,
      snapshotLocation: formData.snapshotLocation,
      source: sourceEntry ? { dbSystem: sourceEntry.dbSystem, nodeType: sourceEntry.nodeType, label: sourceEntry.label } : null,
      target: targetEntry ? { dbSystem: targetEntry.dbSystem, nodeType: targetEntry.nodeType, label: targetEntry.label } : null,
    });

    if (sourceEntry && targetEntry && sourceEntry.dbSystem !== targetEntry.dbSystem) {
      // Both curricula are in our DB and are different → run RAG
      logger.info('RAG: both curricula in DB', {
        source: sourceEntry.dbSystem, target: targetEntry.dbSystem,
        sourceNodeType: sourceEntry.nodeType, targetNodeType: targetEntry.nodeType,
      });
      try {
        const grade = formData.snapshotGrade || 9;
        const gradeMin = Math.max(1, grade - 1);
        const gradeMax = Math.min(12, grade + 1);

        const rpcParams = {
          source_curriculum: sourceEntry.dbSystem,
          target_curriculum: targetEntry.dbSystem,
          grade_min: gradeMin,
          grade_max: gradeMax,
          similarity_threshold: 0.0,
          result_limit: 300,
          source_node_type: sourceEntry.nodeType,
          target_node_type_filter: targetEntry.nodeType,
        };
        addDebug('rag_rpc_params', 'Calling find_curriculum_gaps_rag', rpcParams);

        const { data: rawGaps, error: rpcError } = await logger.measureRetrieval(
          'find_curriculum_gaps_rag',
          async () => supabase.rpc('find_curriculum_gaps_rag', rpcParams)
        );

        if (rpcError) {
          logger.warn('RAG RPC error (non-fatal, using LLM fallback)', { error: rpcError.message });
          addDebug('rag_rpc_error', 'find_curriculum_gaps_rag returned error', { error: rpcError.message });
        } else if (rawGaps && rawGaps.length > 0) {
          // ── Adaptive percentile gap classification ──────────────────────────────
          // Nemotron 2048-dim vectors compress similarity into ~0.17-0.27 range,
          // so fixed thresholds (e.g. 0.65) mark everything as a gap. Instead we
          // rank all target nodes by similarity and classify by relative position:
          //   bottom 10% = CRITICAL, 10-20% = MAJOR, 20-35% = MODERATE, top 65% = covered.
          // Filter to the target curriculum's specific node type (or all nodes if null)
          const allTargetNodes = (rawGaps as GapNode[]).filter(g =>
            targetEntry.nodeType == null || g.target_node_type === targetEntry.nodeType
          );

          addDebug('rag_raw_rows', 'Raw RPC rows received', {
            rawRowCount: rawGaps.length,
            targetNodeType: targetEntry.nodeType,
            filteredTargetNodeCount: allTargetNodes.length,
          });

          // Sort ascending: index 0 = biggest gap (lowest similarity to any source node)
          const sortedAsc = [...allTargetNodes].sort(
            (a, b) => (a.best_similarity ?? 0) - (b.best_similarity ?? 0)
          );

          const total = sortedAsc.length;
          const critIdx = Math.floor(total * 0.10);
          const majorIdx = Math.floor(total * 0.20);
          const gapIdx = Math.floor(total * 0.35); // bottom 35% = priority gaps

          const critThresh = sortedAsc[critIdx]?.best_similarity ?? 0;
          const majorThresh = sortedAsc[majorIdx]?.best_similarity ?? 0;

          const simLow = sortedAsc[0]?.best_similarity ?? 0;
          const simHigh = sortedAsc[total - 1]?.best_similarity ?? 0;

          addDebug('rag_percentile_thresholds', 'Adaptive percentile thresholds computed', {
            totalTargetNodes: total,
            critIdx,
            majorIdx,
            gapIdx,
            critThresh,
            majorThresh,
            similarityRange: `${simLow.toFixed(3)} - ${simHigh.toFixed(3)}`,
          });

          // Assign severity based on percentile position (not absolute sim value)
          const assignSeverity = (sim: number | null): 'CRITICAL' | 'MAJOR' | 'MODERATE' => {
            const s = sim ?? 0;
            if (s <= critThresh) return 'CRITICAL';
            if (s <= majorThresh) return 'MAJOR';
            return 'MODERATE';
          };

          // Take the bottom 35% — these are the real curriculum gaps
          const rawGapNodes = sortedAsc.slice(0, gapIdx + 1);
          const gapNodesWithSeverity: GapNodeWithSeverity[] = rawGapNodes
            .slice(0, 30)
            .map(g => ({ ...g, _severity: assignSeverity(g.best_similarity) }));

          const severityCounts = {
            CRITICAL: gapNodesWithSeverity.filter(g => g._severity === 'CRITICAL').length,
            MAJOR: gapNodesWithSeverity.filter(g => g._severity === 'MAJOR').length,
            MODERATE: gapNodesWithSeverity.filter(g => g._severity === 'MODERATE').length,
          };

          const coveredCount = total - rawGapNodes.length;
          const alignmentPct = Math.round((coveredCount / total) * 100);

          ragGapCount = gapNodesWithSeverity.length;

          // ── Compute per-subject coverage stats from ALL nodes (not just gaps) ──
          const subjectStats: Record<string, { total: number; gaps: number; covered: number }> = {};
          for (let ni = 0; ni < sortedAsc.length; ni++) {
            const node = sortedAsc[ni];
            const meta = (node.target_metadata || {}) as Record<string, unknown>;
            const subj = ((meta.subject as string) || (meta.domain as string) || 'General').substring(0, 40);
            if (!subjectStats[subj]) subjectStats[subj] = { total: 0, gaps: 0, covered: 0 };
            subjectStats[subj].total++;
            if (ni <= gapIdx) {
              subjectStats[subj].gaps++;
            } else {
              subjectStats[subj].covered++;
            }
          }

          // Format as structured data for the LLM
          const coverageLines: string[] = ['\nSUBJECT COVERAGE STATS (from database — use these for topicsCovered/totalTopics):'];
          for (const [subj, stats] of Object.entries(subjectStats)) {
            const pct = Math.round((stats.covered / stats.total) * 100);
            coverageLines.push(`  ${subj}: ${stats.covered} covered / ${stats.total} total (${pct}% alignment) — ${stats.gaps} gaps`);
          }
          subjectCoverageStats = coverageLines.join('\n');

          ragContext = buildRagContext(
            gapNodesWithSeverity,
            sourceEntry.label,
            targetEntry.label,
            alignmentPct,
            total
          );

          // Compact list of gaps for debug output
          const gapSummary = gapNodesWithSeverity.slice(0, 25).map(g => ({
            severity: g._severity,
            targetNode: g.target_node_name,
            similarity: g.best_similarity,
            nearestSource: g.best_source_match,
          }));

          addDebug('rag_gaps_classified', 'Priority gaps classified by percentile', {
            alignmentPct,
            totalTargetNodes: total,
            priorityGapCount: ragGapCount,
            severityCounts,
            similarityRange: `${simLow.toFixed(3)} - ${simHigh.toFixed(3)}`,
            gaps: gapSummary,
          });

          addDebug('rag_context_built', 'RAG context string built for LLM prompt', {
            ragContextLength: ragContext.length,
            ragContextPreview: ragContext.substring(0, 500),
          });

          logger.info('RAG gaps fetched (adaptive percentile)', {
            totalTarget: total,
            gapCount: ragGapCount,
            alignmentPct,
            source: sourceEntry.dbSystem,
            target: targetEntry.dbSystem,
            grade: `${gradeMin}-${gradeMax}`,
            simRange: `${simLow.toFixed(3)}-${simHigh.toFixed(3)}`,
          });
        } else {
          logger.info('RAG: no target nodes found in grade band (check embeddings exist)');
          addDebug('rag_no_nodes', 'No target nodes found in grade band');
        }
      } catch (ragErr) {
        logger.warn('RAG enrichment error (non-fatal)', { error: String(ragErr) });
        addDebug('rag_exception', 'RAG enrichment threw exception', { error: String(ragErr) });
      }
    } else {
      logger.info('RAG: curricula not in DB yet or same curriculum — using LLM knowledge only', {
        source: formData.currentCurriculum,
        target: formData.targetCurriculum || formData.targetGoal,
        sourceInDB: !!sourceEntry,
        targetInDB: !!targetEntry,
      });
      addDebug('rag_skipped', 'RAG skipped — curricula not in DB or same', {
        sourceCurriculum: formData.currentCurriculum,
        targetCurriculum: formData.targetCurriculum,
        targetGoal: formData.targetGoal,
        sourceInDB: !!sourceEntry,
        targetInDB: !!targetEntry,
      });
    }

    const systemPrompt = `SYSTEM INSTRUCTIONS — ACADEMIC TRANSITION ANALYST

ROLE
You are an AI Academic Transition Analyst.
Your role is to:
- Analyze a student's current curriculum (US or international)
- Compare it with the target curriculum pathway (CBSE, ICSE, IB, IGCSE, US Common Core, or other)
- Identify learning gaps using VERIFIED DATABASE DATA when provided
- Provide structured, actionable transition guidance

You are NOT a tutor, chatbot, or generic content generator.

SCOPE
Grades: 1–12. Purpose: Academic / Foundation Transition only.
DO NOT: provide college admission advice, suggest career streams, or handle matters outside academic transition.

CORE OBJECTIVE
Generate a Transition Readiness Report that helps parents understand gaps, tutors guide preparation, and students transition smoothly.

CURRICULUM ALIGNMENT LOGIC
Step 1 — Identify baseline: Assume standard grade-level expectations for the TARGET curriculum.
Step 2 — Compare: Use subjects studied + confidence levels to identify strong areas, moderate gaps, critical gaps.
Step 3 — Generate missing topics: Must align with target grade expectations. Must be consistent — do NOT vary randomly.

VERIFIED GAP DATA RULES (CRITICAL)
- When VERIFIED GAPS are provided from the curriculum database, USE THEM. Do NOT hallucinate topics.
- CRITICAL = bottom 10% semantic similarity (urgent — must bridge before starting target grade)
- MAJOR = 10–20% similarity (bridge before grade-level work)
- MODERATE = 20–35% similarity (address concurrently)
- If no RAG data provided: use curriculum knowledge but reason from grade-level expectations

RESOURCE URL RULES
- Each gap in the VERIFIED GAP DATA may have a RESOURCE_URL line.
- When a gap has a RESOURCE_URL, copy that exact URL into the \`resourceUrl\` field of the corresponding keyGaps or criticalGaps item.
- Do NOT invent, modify, or shorten URLs. Only use URLs that appear verbatim in the RESOURCE_URL lines above.
- If a gap has no RESOURCE_URL, omit the \`resourceUrl\` field entirely (do not set it to null or empty string).

SUBJECT OUTPUT RULES
- Show detailed analysis ONLY for subjects selected by user or marked as challenging.
- For Social Studies (Grades 2–10): DO NOT list detailed topics. Instead say: "A 2–3 month refresher on Indian social science fundamentals is advised."

GAP EXPLANATION (include for each subject)
"This gap exists because the topic is introduced earlier or emphasized more in the [target] curriculum compared to the student's [source] curriculum."

BRIDGE PLAN — ALWAYS include 3 phases:
- Phase 1 (Foundation): Months 1–3 — foundational concepts
- Phase 2 (Concept Strengthening): Months 4–6 — concept depth
- Phase 3 (Practice & Application): Months 7–8 — assessments, mock tests

CURRICULUM CONSISTENCY RULE
If source curriculum = target curriculum: do NOT introduce other board references.
For IB: do NOT use NCERT references. Focus on concept understanding, inquiry-based learning, skill development.

PERFORMANCE SENSITIVITY
Adjust recommendations based on student confidence levels. Always include:
"Recommendations are adjusted based on the student's current performance level and learning readiness."

NON-NEGOTIABLE RULES
- NEVER hallucinate topics or curriculum references
- NEVER generate inconsistent outputs across same grade
- NEVER mix curriculum systems incorrectly
- NEVER provide generic or incomplete references
- For keyGaps and criticalGaps: use the EXACT topic name from EXACT_TOPIC_NAME in the VERIFIED GAP DATA — do NOT paraphrase, summarize, or combine multiple topics into one
- For resourceUrl: copy the RESOURCE_URL value EXACTLY as shown in the gap data — every gap that has a RESOURCE_URL MUST have it in the output
- For topicsCovered and totalTopics: use the SUBJECT COVERAGE STATS numbers when provided — do NOT invent coverage numbers

OUTPUT FORMAT
Return ONLY valid JSON. No markdown fences, no explanation before or after the JSON object. The response must start with { and end with } — nothing else.`;

    console.log(`[GEMINI] Key prefix check: ${GEMINI_API_KEY?.substring(0, 8)}... (length: ${GEMINI_API_KEY?.length})`);
    console.log(`[GEMINI] Model: gemini-3.1-flash-lite | Grade: ${formData.snapshotGrade} | Source: ${formData.currentCurriculum} | Target: ${formData.targetGoal || formData.targetCurriculum}`);

    const ragSection = ragContext
      ? `\n**VERIFIED GAPS FROM CURRICULUM DATABASE (${ragGapCount} priority gaps):**\n${ragContext}${subjectCoverageStats}\n\nIMPORTANT: Use the VERIFIED GAPS above (from semantic similarity analysis of ${sourceEntry?.label || formData.currentCurriculum || 'source'} vs ${targetEntry?.label || formData.targetGoal || 'target'} standards) to populate keyGaps and criticalGaps. These are grounded in real DB data, not estimates. CRITICAL = bottom 10% by similarity (urgent); MAJOR = 10-20% (bridge before grade-level); MODERATE = 20-35% (address concurrently).\nFor each gap, use the EXACT_TOPIC_NAME and RESOURCE_URL from the data above — do NOT paraphrase or omit URLs.\nFor topicsCovered/totalTopics, use the SUBJECT COVERAGE STATS numbers above.\n`
      : '';

    const userPrompt = `Analyze curriculum alignment for this student${ragContext ? ' using the VERIFIED GAP DATA from our curriculum database' : ''}:

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
${ragSection}
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
      "topicsCovered": <number from SUBJECT COVERAGE STATS 'covered' count>,
      "totalTopics": <number from SUBJECT COVERAGE STATS 'total' count>,
      "alignmentLevel": "strong" | "moderate" | "high_gap",
      "keyGaps": [
        { "topic": "<topic name from RAG data>", "resourceUrl": "<exact RESOURCE_URL from RAG data if present>" }
      ]
    }
  ],
  "criticalGaps": [
    { "topic": "<short gap description, max 8 words>", "resourceUrl": "<exact RESOURCE_URL from RAG data if present>" }
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
    "resources": [
      { "name": "<resource name + type>", "url": "<URL if this resource has a RESOURCE_URL from RAG data, otherwise omit>" }
    ],
    "culturalLanguage": ["<short tip>", "<short tip>", "<short tip>"]
  }
}

IMPORTANT: Each bullet must be under 10 words. Be specific with topic/resource names. For resourceUrl fields: copy the RESOURCE_URL value verbatim from the gap data above — do not invent URLs.`;

    // ==========================================================================
    // ASYNC JOB EXECUTION WITH TIMEOUT, RETRIES, AND DLQ
    // ==========================================================================
    
    const aiJobResult = await executeJob(
      async () => {
        // Measure LLM latency within the job
        const GEMINI_MODEL = 'gemini-3.1-flash-lite';
        const response = await logger.measureLLM(GEMINI_MODEL, async () => {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
          console.log(`[GEMINI] Calling ${GEMINI_MODEL} at generativelanguage.googleapis.com`);
          return fetch(geminiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: userPrompt }]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 6000,
                responseMimeType: "application/json",
              },
            }),
          });
        });
        
        // Check response status and throw appropriate errors for retry logic
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[GEMINI] API error ${response.status}: ${errorText.substring(0, 500)}`);
          addDebug('gemini_api_error', `Gemini API returned ${response.status}`, {
            status: response.status,
            errorPreview: errorText.substring(0, 300),
          });
          
          // Throw with status code for retry decision
          if (response.status === 429) {
            throw new Error(`429:RATE_LIMITED:${errorText}`);
          }
          if (response.status === 402) {
            throw new Error(`402:CREDITS_DEPLETED:${errorText}`);
          }
          if (response.status === 400) {
            // 400 from Gemini usually means invalid API key or bad request
            throw new Error(`400:UPSTREAM_ERROR:Gemini API rejected the request: ${errorText.substring(0, 200)}`);
          }
          if (response.status === 401 || response.status === 403) {
            throw new Error(`${response.status}:UPSTREAM_ERROR:Gemini API authentication failed — check GEMINI_API_KEY secret: ${errorText.substring(0, 200)}`);
          }
          if (response.status === 404) {
            throw new Error(`404:UPSTREAM_ERROR:Gemini model not found (${GEMINI_MODEL}): ${errorText.substring(0, 200)}`);
          }
          if (response.status === 408 || response.status === 504) {
            throw new Error(`${response.status}:TIMEOUT:${errorText}`);
          }
          if (response.status === 503) {
            throw new Error(`503:OVERLOADED:${errorText}`);
          }
          throw new Error(`${response.status}:UPSTREAM_ERROR:${errorText.substring(0, 300)}`);
        }
        console.log(`[GEMINI] API call successful (status ${response.status})`);
        
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

    const geminiResponse = await response.json();

    // Normalize Gemini API response to the OpenAI-style shape the rest of the code expects
    const aiResponse = {
      choices: [
        {
          message: {
            content: geminiResponse.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '',
          },
          finish_reason: geminiResponse.candidates?.[0]?.finishReason || 'STOP',
        }
      ],
      usage: {
        prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
        completion_tokens: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: geminiResponse.usageMetadata?.totalTokenCount || 0,
      }
    };

    addDebug('llm_raw_response', 'Raw Gemini API response received', {
      rawKeys: Object.keys(geminiResponse),
      candidateCount: geminiResponse.candidates?.length || 0,
      finishReason: geminiResponse.candidates?.[0]?.finishReason,
      promptTokenCount: geminiResponse.usageMetadata?.promptTokenCount,
      candidatesTokenCount: geminiResponse.usageMetadata?.candidatesTokenCount,
      totalTokenCount: geminiResponse.usageMetadata?.totalTokenCount,
    });
    
    // Log AI response metadata (tokens, timing) without PII
    const llmLatency = performance.now() - (logger as any).context?.startTime || 0;
    logger.logAIResponse('google/gemini-3.1-flash-lite', aiResponse, llmLatency);
    
    const content = aiResponse.choices?.[0]?.message?.content;

    addDebug('llm_response', 'LLM response received', {
      status: response.status,
      statusText: response.statusText,
      model: 'google/gemini-3.1-flash-lite',
      latencyMs: llmLatency.toFixed(2),
      promptTokens: aiResponse.usage?.prompt_tokens,
      completionTokens: aiResponse.usage?.completion_tokens,
      totalTokens: aiResponse.usage?.total_tokens,
      finishReason: aiResponse.choices?.[0]?.finish_reason,
      contentLength: content ? content.length : 0,
      hasRagContext: !!ragContext,
      ragContextLength: ragContext.length,
    });

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
      if (jsonStart !== -1) {
        try {
          // Find the balanced closing brace for the first JSON object, ignoring trailing text.
          let depth = 0;
          let inString = false;
          let escape = false;
          let jsonEnd = -1;
          for (let i = jsonStart; i < content.length; i++) {
            const char = content[i];
            if (inString) {
              if (escape) {
                escape = false;
              } else if (char === '\\') {
                escape = true;
              } else if (char === '"') {
                inString = false;
              }
            } else if (char === '"') {
              inString = true;
            } else if (char === '{' || char === '[') {
              depth++;
            } else if (char === '}' || char === ']') {
              depth--;
              if (depth === 0) {
                jsonEnd = i;
                break;
              }
            }
          }
          if (jsonEnd !== -1) {
            analysisData = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
          } else {
            throw new Error('No balanced JSON object found');
          }
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

    addDebug('llm_parsed', 'LLM response parsed into JSON analysis object', {
      overallAlignmentPct: analysisData?.overallAlignment?.percentage,
      subjectCount: analysisData?.subjectAnalysis?.length,
      criticalGapCount: analysisData?.criticalGaps?.length,
      recommendationCount: analysisData?.recommendations?.study?.length,
    });

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

    // Create validation summary — override alignment_score with real RAG value if available
    const validationSummary = createValidationSummary(knowledgeValidation);

    // Extract real alignment % from the RAG context header line (e.g. "~65%")
    let ragAlignmentPct: number | null = null;
    if (ragContext) {
      const pctMatch = ragContext.match(/~(\d+)%/);
      if (pctMatch) ragAlignmentPct = parseInt(pctMatch[1], 10);
    }
    if (ragAlignmentPct !== null) {
      validationSummary.alignment_score = ragAlignmentPct / 100;
    }

    addDebug('final_response', 'Returning success response with RAG and debug logs', {
      rag_enabled: !!ragContext,
      rag_alignment_pct: ragAlignmentPct,
      rag_gap_count: ragGapCount,
      validation_alignment_score: validationSummary.alignment_score,
      debug_log_count: debugLogs.length,
    });

    return createSuccessResponse({ 
      analysis: analysisData,
      validation: validationSummary,
      _meta: {
        requestId: logger.getRequestId(),
        jobId: aiJobResult.jobId,
        attempts: aiJobResult.attempts,
        processingTime: aiJobResult.totalDuration,
        validatorVersion: knowledgeValidation.metadata.validatorVersion,
        rag_enabled: !!ragContext,
        rag_alignment_pct: ragAlignmentPct,
        rag_gap_count: ragGapCount,
        debug_logs: debugLogs,
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
