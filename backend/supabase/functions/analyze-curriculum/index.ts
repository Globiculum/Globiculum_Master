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
import {
  CurriculumEntry,
  CURRICULUM_DB_REGISTRY,
  SUBJECT_ALIASES,
  mapToDBEntry,
  expandSubjectFilter,
  GapNode,
  GapNodeWithSeverity,
  SubjectClassification,
  SUBJECT_QUALIFY_RATIO,
  classifyGapsBySubject,
  selectFairGapSample,
  mergeBestSourceMatch,
  getNodeSubjectLabel,
  buildGapReason,
} from "../_shared/curriculumGaps.ts";

// =============================================================================
// RAG HELPERS — map student curriculum to DB system + build gap context for LLM
// The curriculum registry, subject aliases, and gap classification live in
// _shared/curriculumGaps.ts — see that file's header for why they're shared
// across analyze-curriculum, diagnostics-engine, and alignment-engine.
// =============================================================================

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

/**
 * Build a compact RAG context string for the LLM prompt.
 * Groups gaps by subject, shows target node name + closest source match.
 * Severity is pre-computed by adaptive percentile (not absolute similarity).
 */
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
    if (totalShown >= 25) break;
    lines.push(`\n[${subject}]`);
    for (const gap of subjectGaps.slice(0, 8)) {
      if (totalShown >= 25) break;
      const matchNote = gap.best_source_match
        ? `nearest source match: "${gap.best_source_match.substring(0, 60)}"`
        : 'no source node covers this topic';
      const targetTopic = (gap.target_node_name || '').substring(0, 100);
      const desc = (gap.target_description || '').substring(0, 80);
      const gapMeta = (gap.target_metadata || {}) as Record<string, unknown>;
      const resourceUrl: string | null =
        (gapMeta.url as string) ||
        (gapMeta.source_url as string) ||
        null;
      lines.push(`  [${gap._severity}] ${targetTopic}`);
      if (desc) lines.push(`    Context: ${desc}`);
      lines.push(`    ${matchNote}`);
      if (resourceUrl) lines.push(`    RESOURCE_URL: ${resourceUrl}`);
      totalShown++;
    }
  }

  return lines.join('\n');
}

// classifyGapsBySubject() and selectFairGapSample() now live in
// _shared/curriculumGaps.ts (imported above) — shared with diagnostics-engine
// and alignment-engine. See that file's header for the domain-gating +
// per-subject percentile rationale.

/** Count how many gap items in the LLM analysis have resourceUrl set. */
function countUrls(analysisData: Record<string, unknown>): number {
  let count = 0;
  const subjects = analysisData.subjectAnalysis;
  if (Array.isArray(subjects)) {
    for (const s of subjects) {
      const keyGaps = (s as Record<string, unknown>).keyGaps;
      if (Array.isArray(keyGaps)) {
        for (const g of keyGaps) {
          if (g && typeof g === 'object' && (g as Record<string, unknown>).resourceUrl) count++;
        }
      }
    }
  }
  const criticalGaps = analysisData.criticalGaps;
  if (Array.isArray(criticalGaps)) {
    for (const g of criticalGaps) {
      if (g && typeof g === 'object' && (g as Record<string, unknown>).resourceUrl) count++;
    }
  }
  return count;
}

interface UrlMatchLog {
  topic: string;
  section: string;   // e.g. "Math keyGaps" or "criticalGaps"
  matched: boolean;
  matchedNode?: string;
  url?: string;
  strategy?: string; // 'exact', 'word2+', 'word1-distinctive', 'already_had_url'
}

/**
 * Post-process the LLM analysis JSON to inject resource URLs from RAG gap data.
 * The LLM is unreliable at copying URLs — this deterministically matches each
 * gap topic from the LLM output against RAG gap nodes by name similarity,
 * then injects the URL from the DB metadata.
 * Returns a match log so callers can trace every injection.
 */
function injectRagUrls(
  analysisData: Record<string, unknown>,
  ragGaps: GapNodeWithSeverity[]
): UrlMatchLog[] {
  const matchLog: UrlMatchLog[] = [];
  if (!ragGaps.length) return matchLog;

  // Build lookup: lowercase node name → URL (from metadata.url or metadata.source_url)
  const urlLookup: { name: string; nameLower: string; url: string; subject: string }[] = [];
  for (const gap of ragGaps) {
    const meta = (gap.target_metadata || {}) as Record<string, unknown>;
    const url = (meta.url as string) || (meta.source_url as string) || '';
    if (!url) continue;
    const subject = ((meta.subject as string) || '').toLowerCase();
    urlLookup.push({
      name: gap.target_node_name || '',
      nameLower: (gap.target_node_name || '').toLowerCase(),
      url,
      subject,
    });
  }

  if (!urlLookup.length) return matchLog;

  // Match LLM topic text against RAG node names to find the best URL.
  // Returns { url, matchedNode, strategy } or null for traceability.
  const findUrl = (topic: string, subjectHint?: string): { url: string; matchedNode: string; strategy: string } | null => {
    if (!topic) return null;
    const topicLower = topic.toLowerCase();

    // Subject-priority pool: same-subject entries checked first
    const pool = subjectHint
      ? urlLookup.filter(e => e.subject.includes(subjectHint.toLowerCase().substring(0, 4)))
          .concat(urlLookup.filter(e => !e.subject.includes(subjectHint.toLowerCase().substring(0, 4))))
      : urlLookup;

    // 1. Exact substring match in either direction
    for (const entry of pool) {
      if (entry.nameLower.includes(topicLower) || topicLower.includes(entry.nameLower)) {
        return { url: entry.url, matchedNode: entry.name, strategy: 'exact' };
      }
    }

    const topicWords = topicLower.split(/[\s\-:,()]+/).filter(w => w.length > 3);
    let bestMatch: { url: string; matchedNode: string; overlap: number; score: number; strategy: string } | null = null;

    for (const entry of pool) {
      const nodeWords = entry.nameLower.split(/[\s\-:,()]+/).filter(w => w.length > 3);
      const overlap = topicWords.filter(w => nodeWords.some(nw => nw.includes(w) || w.includes(nw))).length;
      // 2. ≥2 word overlap
      if (overlap >= 2) {
        const score = overlap * 2;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { url: entry.url, matchedNode: entry.name, overlap, score, strategy: 'word2+' };
        }
      }
      // 3. Single distinctive word (length > 5)
      else if (overlap === 1) {
        const distinctiveWord = topicWords.find(w => w.length > 5 && nodeWords.some(nw => nw.includes(w) || w.includes(nw)));
        if (distinctiveWord) {
          const score = distinctiveWord.length;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { url: entry.url, matchedNode: entry.name, overlap, score, strategy: 'word1-distinctive' };
          }
        }
      }
    }

    return bestMatch ? { url: bestMatch.url, matchedNode: bestMatch.matchedNode, strategy: bestMatch.strategy } : null;
  };

  // Inject into subjectAnalysis[].keyGaps[]
  const subjects = analysisData.subjectAnalysis;
  if (Array.isArray(subjects)) {
    for (const subj of subjects) {
      const s = subj as Record<string, unknown>;
      const subjectName = (s.subject as string) || undefined;
      const keyGaps = s.keyGaps;
      if (!Array.isArray(keyGaps)) continue;
      for (let i = 0; i < keyGaps.length; i++) {
        const gap = keyGaps[i];
        const section = `${subjectName || 'unknown'} keyGaps`;
        if (typeof gap === 'string') {
          const match = findUrl(gap, subjectName);
          if (match) {
            keyGaps[i] = { topic: gap, resourceUrl: match.url };
            matchLog.push({ topic: gap, section, matched: true, matchedNode: match.matchedNode, url: match.url, strategy: match.strategy });
          } else {
            matchLog.push({ topic: gap, section, matched: false });
          }
        } else if (gap && typeof gap === 'object') {
          const g = gap as Record<string, unknown>;
          const topic = g.topic as string;
          // Always look up from RAG — LLM may have copied a corrupt/truncated URL.
          // RAG URL overwrites whatever the LLM had; LLM URL kept only as last resort.
          const match = findUrl(topic, subjectName);
          if (match) {
            g.resourceUrl = match.url;
            const strategy = g.resourceUrl && g.resourceUrl !== match.url ? 'corrected_url' : match.strategy;
            matchLog.push({ topic, section, matched: true, matchedNode: match.matchedNode, url: match.url, strategy });
          } else if (g.resourceUrl) {
            matchLog.push({ topic, section, matched: true, url: g.resourceUrl as string, strategy: 'llm_url_kept' });
          } else {
            matchLog.push({ topic, section, matched: false });
          }
        }
      }
    }
  }

  // Inject into criticalGaps[]
  const criticalGaps = analysisData.criticalGaps;
  if (Array.isArray(criticalGaps)) {
    for (let i = 0; i < criticalGaps.length; i++) {
      const gap = criticalGaps[i];
      if (typeof gap === 'string') {
        const match = findUrl(gap);
        if (match) {
          criticalGaps[i] = { topic: gap, resourceUrl: match.url };
          matchLog.push({ topic: gap, section: 'criticalGaps', matched: true, matchedNode: match.matchedNode, url: match.url, strategy: match.strategy });
        } else {
          matchLog.push({ topic: gap, section: 'criticalGaps', matched: false });
        }
      } else if (gap && typeof gap === 'object') {
        const g = gap as Record<string, unknown>;
        const topic = g.topic as string;
        const match = findUrl(topic);
        if (match) {
          g.resourceUrl = match.url;
          matchLog.push({ topic, section: 'criticalGaps', matched: true, matchedNode: match.matchedNode, url: match.url, strategy: match.strategy });
        } else if (g.resourceUrl) {
          matchLog.push({ topic, section: 'criticalGaps', matched: true, url: g.resourceUrl as string, strategy: 'llm_url_kept' });
        } else {
          matchLog.push({ topic, section: 'criticalGaps', matched: false });
        }
      }
    }
  }

  return matchLog;
}

/**
 * Ensure every RAG subject has a subjectAnalysis entry with its key gaps —
 * INCLUDING subjects with zero gaps (fully covered) and subjects the LLM
 * skipped because they weren't in the student's selected/challenging list.
 * The LLM often skips subjects from the RAG context despite explicit
 * instructions, so we build missing entries deterministically.
 *
 * topicsCovered/totalTopics come from `subjectStats` — the REAL per-subject
 * counts computed in classifyGapsBySubject() — never from gap-list length.
 * The previous version derived them as `total = max(gapCount+2, 8)`, which
 * has no connection to the actual curriculum data: for any subject with 6+
 * gap topics it always produced exactly "2 of 8 covered", regardless of
 * grade, subject, or how many real target topics existed. That's the exact
 * "fake partial coverage" reported for Hindi/Sanskrit against a source
 * curriculum with zero real overlap — confirmed by reproducing it directly
 * from this formula, independent of gap classification.
 */
function expandSubjectAnalysisFromRag(
  analysisData: Record<string, unknown>,
  ragGaps: GapNodeWithSeverity[],
  subjectStats: Map<string, { total: number; covered: number }>,
  subjectClassifications: SubjectClassification[],
  sourceLabel: string
): { subject: string; action: 'added' | 'existing' | 'updated' }[] {
  const expansionLog: { subject: string; action: 'added' | 'existing' | 'updated' }[] = [];
  if (subjectStats.size === 0) return expansionLog;

  const domainCoveredBySubject = new Map(subjectClassifications.map(s => [s.subject, s.domainCovered]));

  // Group RAG gaps by subject (from metadata.subject or metadata.domain) —
  // used for keyGaps text/URLs only; counts come from subjectStats instead.
  const bySubject = new Map<string, GapNodeWithSeverity[]>();
  for (const gap of ragGaps) {
    const meta = (gap.target_metadata || {}) as Record<string, unknown>;
    const subject = ((meta.subject as string) || (meta.domain as string) || 'Unknown').trim();
    if (!subject) continue;
    const existing = bySubject.get(subject) || [];
    existing.push(gap);
    bySubject.set(subject, existing);
  }

  const subjectAnalysis = Array.isArray(analysisData.subjectAnalysis)
    ? (analysisData.subjectAnalysis as Record<string, unknown>[])
    : [];

  // Index existing entries by normalized subject name
  const existingBySubject = new Map<string, Record<string, unknown>>();
  for (const s of subjectAnalysis) {
    const name = ((s.subject as string) || '').toLowerCase().trim();
    if (name) existingBySubject.set(name, s);
  }

  // Exact match first, then known aliases (SUBJECT_ALIASES) in both
  // directions — otherwise the LLM's own "Social Studies" placeholder entry
  // (created per the system prompt's grade 2-10 simplification rule) and
  // this function's real RAG-grounded "Social Science" entry never merge,
  // producing two separate cards for the same subject with contradictory
  // numbers. Confirmed present in every test report so far.
  const findExistingEntry = (normalized: string): Record<string, unknown> | undefined => {
    if (existingBySubject.has(normalized)) return existingBySubject.get(normalized);
    const aliases = SUBJECT_ALIASES[normalized] || [];
    for (const alias of aliases) {
      if (existingBySubject.has(alias)) return existingBySubject.get(alias);
    }
    // Reverse direction: normalized might itself be the alias target of some other key's list
    for (const [key, aliasList] of Object.entries(SUBJECT_ALIASES)) {
      if (aliasList.includes(normalized) && existingBySubject.has(key)) return existingBySubject.get(key);
    }
    return undefined;
  };

  // Iterate every subject with real target nodes — not just ones with gaps —
  // so a fully-covered subject the LLM skipped still gets a correct entry.
  for (const [subject, stats] of subjectStats.entries()) {
    const gaps = bySubject.get(subject) || [];
    const topGaps = gaps.slice(0, 6); // max 6 keyGaps shown per subject

    const { total, covered } = stats;
    const ratio = total > 0 ? covered / total : 1;
    let alignmentLevel: string;
    if (ratio >= 0.7) alignmentLevel = 'strong';
    else if (ratio >= 0.4) alignmentLevel = 'moderate';
    else alignmentLevel = 'high_gap';

    const domainCovered = domainCoveredBySubject.get(subject) ?? true;
    const keyGaps = topGaps.map(g => {
      const meta = (g.target_metadata || {}) as Record<string, unknown>;
      const url = (meta.url as string) || (meta.source_url as string);
      const reason = buildGapReason(g, domainCovered, sourceLabel);
      return { topic: g.target_node_name, subject, reason, ...(url ? { resourceUrl: url } : {}) };
    });

    const normalized = subject.toLowerCase();
    const existing = findExistingEntry(normalized);
    if (existing) {
      existing.keyGaps = keyGaps;
      existing.topicsCovered = covered;
      existing.totalTopics = total;
      existing.alignmentLevel = alignmentLevel;
      expansionLog.push({ subject, action: 'updated' });
    } else {
      const newEntry = {
        subject,
        topicsCovered: covered,
        totalTopics: total,
        alignmentLevel,
        keyGaps,
      };
      subjectAnalysis.push(newEntry);
      existingBySubject.set(normalized, newEntry);
      expansionLog.push({ subject, action: 'added' });
    }
  }

  // Final safety pass: if the LLM independently produced two of its own
  // entries under alias names of the same real subject (rare, but possible
  // since the LLM isn't guaranteed to follow the exact-match instruction),
  // keep only the entry with the higher totalTopics (the one that actually
  // got real subjectStats data merged into it above) and drop the rest.
  const seenCanonical = new Map<string, Record<string, unknown>>();
  const deduped: Record<string, unknown>[] = [];
  for (const entry of subjectAnalysis) {
    const name = ((entry.subject as string) || '').toLowerCase().trim();
    let canonicalKey = name;
    for (const [key, aliasList] of Object.entries(SUBJECT_ALIASES)) {
      if (key === name || aliasList.includes(name)) { canonicalKey = key; break; }
    }
    const prior = seenCanonical.get(canonicalKey);
    if (!prior) {
      seenCanonical.set(canonicalKey, entry);
      deduped.push(entry);
    } else if (((entry.totalTopics as number) || 0) > ((prior.totalTopics as number) || 0)) {
      // Replace the weaker duplicate in-place in `deduped`
      const idx = deduped.indexOf(prior);
      if (idx !== -1) deduped[idx] = entry;
      seenCanonical.set(canonicalKey, entry);
    }
  }
  subjectAnalysis.length = 0;
  subjectAnalysis.push(...deduped);

  // Ensure criticalGaps reflect the most severe gaps across subjects
  const criticalGaps = Array.isArray(analysisData.criticalGaps)
    ? (analysisData.criticalGaps as (string | Record<string, unknown>)[])
    : [];
  const criticalSet = new Set(
    criticalGaps.map(g =>
      (typeof g === 'string' ? g : ((g as Record<string, unknown>).topic as string) || '').toLowerCase()
    )
  );
  for (const gap of ragGaps.filter(g => g._severity === 'CRITICAL')) {
    const topic = gap.target_node_name;
    if (criticalSet.has(topic.toLowerCase())) continue;
    const meta = (gap.target_metadata || {}) as Record<string, unknown>;
    const url = (meta.url as string) || (meta.source_url as string);
    // subject and reason are attached explicitly here (not just inferrable
    // from keyGaps above) because keyGaps only ever holds each subject's
    // first 6 gaps, while criticalGaps can hold every CRITICAL gap for a
    // subject — for Hindi/Sanskrit that's dozens more than 6, and without
    // these fields the frontend had no way to give the 7th+ gap a correct,
    // specific reason.
    const subject = getNodeSubjectLabel(gap);
    const domainCovered = domainCoveredBySubject.get(subject) ?? true;
    const reason = buildGapReason(gap, domainCovered, sourceLabel);
    criticalGaps.push({ topic, subject, reason, ...(url ? { resourceUrl: url } : {}) });
    criticalSet.add(topic.toLowerCase());
  }
  if (criticalGaps.length > 0) analysisData.criticalGaps = criticalGaps;

  analysisData.subjectAnalysis = subjectAnalysis;
  return expansionLog;
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
    // LOG: User Input Summary — what the system received from the student form
    // ==========================================================================
    addDebug('user_input', 'Student form data received and parsed', {
      grade: formData.snapshotGrade,
      schoolStage: formData.schoolStage,
      location: formData.snapshotLocation,
      usState: formData.usState || null,
      currentCurriculum: formData.currentCurriculum,
      targetCurriculum: formData.targetCurriculum || null,
      targetGoal: formData.targetGoal || null,
      subjects: formData.academicPath,
      strongSubjects: formData.strongestSubjects,
      challengingAreas: formData.challengingAreas,
      languages: formData.languagesSpoken,
      timeline: formData.transitionTimeline,
    });

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
    let ragGapNodes: GapNodeWithSeverity[] = [];
    let ragSubjectStats: Map<string, { total: number; covered: number }> = new Map();
    let ragSubjectClassifications: SubjectClassification[] = [];
    // Real, RAG-computed alignment % — set once inside the RAG block below.
    // Everything downstream (validation summary, and the final
    // overallAlignment grounding) reads this instead of trusting the LLM's
    // own guess or re-parsing it back out of a formatted string.
    let ragAlignmentPct: number | null = null;

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

        // Only apply the subject filter for grades 11-12. academicPath for
        // those grades is drawn from the same NCERT-stream-shaped subject
        // list (Physics/Accountancy/Commerce-style) regardless of the
        // student's actual source curriculum, so it's a reasonable proxy for
        // intended target stream. For grades 1-10, academicPath is the
        // generic source-side list (Mathematics/Science/Social Studies/...)
        // which has no way to represent a target-only mandatory subject like
        // Hindi or Sanskrit — filtering by it there would silently hide the
        // exact gaps a cross-curriculum transition report exists to surface
        // (verified against production data: a US Common Core -> CBSE grade 8
        // report where Hindi/Sanskrit are the single most important findings).
        const targetSubjects = grade >= 11 ? expandSubjectFilter(formData.academicPath) : undefined;

        const rpcParams = {
          source_curriculum: sourceEntry.dbSystem,
          target_curriculum: targetEntry.dbSystem,
          grade_min: gradeMin,
          grade_max: gradeMax,
          similarity_threshold: 0.0,
          result_limit: 300,
          source_node_type: sourceEntry.nodeType,
          target_node_type_filter: targetEntry.nodeType,
          target_subjects: targetSubjects ?? null,
          // Cumulative, not symmetric: the TARGET grade band stays narrow
          // (grade±1 — what we're assessing readiness FOR), but the SOURCE
          // band spans from grade 1 through grade+1 — everything the student
          // has plausibly been taught so far, plus a small lookahead buffer.
          // Verified this mattered in practice: a student's grade-3 US
          // arithmetic is real prior knowledge that should count toward an
          // NCERT grade-8 topic looking "covered", but a symmetric grade±1
          // window made it invisible to matching entirely.
          source_grade_min: 1,
          source_grade_max: gradeMax,
        };
        addDebug('rag_rpc_params', 'Calling find_curriculum_gaps_rag', rpcParams);

        const { data: primaryGaps, error: rpcError } = await logger.measureRetrieval(
          'find_curriculum_gaps_rag',
          async () => supabase.rpc('find_curriculum_gaps_rag', rpcParams)
        );

        // ── Merge in secondary target curricula ──────────────────────────────
        // US Common Core only covers Math/ELA. When the resolved target is
        // 'us-common-core', also pull NGSS (Science) gaps and merge them in so
        // the combined "US" target includes Science. Both use node_type
        // 'standard', so the existing filtering/classification logic below
        // works unchanged on the merged set.
        let rawGaps: GapNode[] = primaryGaps || [];
        if (!rpcError && targetEntry.dbSystem === 'us-common-core') {
          const ngssEntry = CURRICULUM_DB_REGISTRY['ngss'];
          const ngssParams = { ...rpcParams, target_curriculum: ngssEntry.dbSystem, target_node_type_filter: ngssEntry.nodeType };
          const { data: ngssGaps, error: ngssError } = await logger.measureRetrieval(
            'find_curriculum_gaps_rag:ngss',
            async () => supabase.rpc('find_curriculum_gaps_rag', ngssParams)
          );
          if (ngssError) {
            logger.warn('NGSS RAG merge error (non-fatal)', { error: ngssError.message });
            addDebug('rag_ngss_merge_error', 'find_curriculum_gaps_rag failed for ngss', { error: ngssError.message });
          } else if (ngssGaps && ngssGaps.length > 0) {
            addDebug('rag_ngss_merge', 'Merged NGSS (Science) gap rows into target set', { ngssRowCount: ngssGaps.length });
            rawGaps = [...rawGaps, ...ngssGaps];
          }
        }

        // ── Merge in a secondary SOURCE curriculum ────────────────────────────
        // Symmetric to the target-side merge above, but for the opposite
        // direction: when the student's SOURCE curriculum is 'us-common-core'
        // (Math/ELA only), their real NGSS science background was never
        // counted as coverage for Science-domain target topics — those got
        // compared only against irrelevant Math/ELA text instead, producing a
        // meaningless similarity number (verified against production data:
        // NCERT Science topics matched against Common Core Math/ELA text
        // scored ~0.42 average, purely from incidental vocabulary overlap).
        // Unlike the target-side merge (which adds independent extra rows),
        // this re-queries the SAME target nodes against a second source pool,
        // so results must be merged per target node (keep whichever source
        // gives the higher similarity), not concatenated.
        // sourceSystemsQueried tracks which source systems actually
        // contributed rows to this request — classifyGapsBySubject uses it to
        // decide which subject domains the combined source pool can plausibly
        // cover. If this call errors out or times out, 'ngss' is correctly
        // left off the list, so Science-domain topics fall back to being
        // treated as uncovered rather than keeping a stale cross-domain match.
        const sourceSystemsQueried: string[] = [sourceEntry.dbSystem];
        if (!rpcError && sourceEntry.dbSystem === 'us-common-core') {
          const ngssSourceParams = { ...rpcParams, source_curriculum: 'ngss', source_node_type: CURRICULUM_DB_REGISTRY['ngss'].nodeType };
          const { data: ngssSourceGaps, error: ngssSourceError } = await logger.measureRetrieval(
            'find_curriculum_gaps_rag:ngss_source',
            async () => supabase.rpc('find_curriculum_gaps_rag', ngssSourceParams)
          );
          if (ngssSourceError) {
            logger.warn('NGSS source-merge error (non-fatal)', { error: ngssSourceError.message });
            addDebug('rag_ngss_source_merge_error', 'find_curriculum_gaps_rag failed for ngss as source', { error: ngssSourceError.message });
          } else if (ngssSourceGaps && ngssSourceGaps.length > 0) {
            const beforeCount = rawGaps.length;
            rawGaps = mergeBestSourceMatch(rawGaps, ngssSourceGaps as GapNode[]);
            sourceSystemsQueried.push('ngss');
            addDebug('rag_ngss_source_merge', 'Merged NGSS as an additional source pool (kept best match per target node)', {
              ngssSourceRowCount: ngssSourceGaps.length,
              targetRowCountBefore: beforeCount,
              targetRowCountAfter: rawGaps.length,
            });
          }
        }

        if (rpcError) {
          logger.warn('RAG RPC error (non-fatal, using LLM fallback)', { error: rpcError.message });
          addDebug('rag_rpc_error', 'find_curriculum_gaps_rag returned error', { error: rpcError.message });
        } else if (rawGaps && rawGaps.length > 0) {
          // ── Per-subject gap classification ──────────────────────────────
          // See classifyGapsBySubject() above for why this replaced a single
          // global percentile ranking.
          // Filter to the target curriculum's specific node type (or all nodes if null)
          const allTargetNodes = (rawGaps as GapNode[]).filter(g =>
            targetEntry.nodeType == null || g.target_node_type === targetEntry.nodeType
          );

          addDebug('rag_raw_rows', 'Raw RPC rows received', {
            rawRowCount: rawGaps.length,
            targetNodeType: targetEntry.nodeType,
            filteredTargetNodeCount: allTargetNodes.length,
          });

          // Per-subject breakdown: how many DB nodes exist per subject, and similarity ranges
          const nodesBySubject: Record<string, { count: number; simMin: number; simMax: number; hasUrl: number }> = {};
          for (const n of allTargetNodes) {
            const m = (n.target_metadata || {}) as Record<string, unknown>;
            const subj = getNodeSubjectLabel(n);
            if (!nodesBySubject[subj]) nodesBySubject[subj] = { count: 0, simMin: 1, simMax: 0, hasUrl: 0 };
            const s = nodesBySubject[subj];
            s.count++;
            const sim = n.best_similarity ?? 0;
            if (sim < s.simMin) s.simMin = sim;
            if (sim > s.simMax) s.simMax = sim;
            if ((m.url as string) || (m.source_url as string)) s.hasUrl++;
          }
          addDebug('rag_nodes_per_subject', 'Retrieved nodes breakdown by subject (similarity = cosine score 0-1, lower = bigger gap)', nodesBySubject);

          const {
            gapNodesWithSeverity: allGapNodesWithSeverity,
            coveredCount,
            total,
            subjectClassifications,
            subjectStats,
          } = classifyGapsBySubject(allTargetNodes, sourceSystemsQueried);

          const allSims = allTargetNodes.map(n => n.best_similarity ?? 0);
          const simLow = Math.min(...allSims);
          const simHigh = Math.max(...allSims);

          addDebug('rag_subject_qualification', 'Per-subject "covered" eligibility (needs domainCovered=true AND avgSimilarity >= qualifyRatio * best subject\'s average)', {
            qualifyRatio: SUBJECT_QUALIFY_RATIO,
            sourceSystemsQueried,
            subjects: subjectClassifications.map(s => ({
              subject: s.subject,
              avgSimilarity: Number(s.avgSimilarity.toFixed(4)),
              domainCovered: s.domainCovered,
              qualifies: s.qualifies,
              count: s.count,
            })),
          });

          // Top 25 are sent to the LLM in the prompt (keeps prompt size
          // reasonable) — selected with a fair cross-subject sample, not a
          // pure global top-25, so one subject can't crowd every other
          // subject's gaps out of what the LLM ever sees. See
          // selectFairGapSample() above.
          const gapNodesWithSeverity: GapNodeWithSeverity[] = selectFairGapSample(allGapNodesWithSeverity, 25);

          const severityCounts = {
            CRITICAL: gapNodesWithSeverity.filter(g => g._severity === 'CRITICAL').length,
            MAJOR: gapNodesWithSeverity.filter(g => g._severity === 'MAJOR').length,
            MODERATE: gapNodesWithSeverity.filter(g => g._severity === 'MODERATE').length,
          };

          const alignmentPct = Math.round((coveredCount / total) * 100);
          ragAlignmentPct = alignmentPct;

          ragGapCount = gapNodesWithSeverity.length;
          // Store ALL gap nodes for URL injection (not just the fair sample sent to LLM)
          ragGapNodes = allGapNodesWithSeverity;
          ragSubjectStats = subjectStats;
          ragSubjectClassifications = subjectClassifications;
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

          addDebug('rag_gaps_classified', 'Priority gaps classified per-subject', {
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

          logger.info('RAG gaps fetched (per-subject classification)', {
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
- CRITICAL: Each subject's keyGaps list must ONLY contain topics that belong to THAT subject from the RAG data. Do NOT place a Science topic under Mathematics, or a Language topic under Science. Match the subject label in the RAG [SubjectName] section exactly to the subjectAnalysis "subject" field.

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
- Include the disclaimer text inside the JSON structure (not outside it)

OUTPUT FORMAT
Return ONLY valid JSON. No markdown fences, no explanation before or after the JSON object. The response must start with { and end with } — nothing else.`;

    console.log(`[GEMINI] Key prefix check: ${GEMINI_API_KEY?.substring(0, 8)}... (length: ${GEMINI_API_KEY?.length})`);
    console.log(`[GEMINI] Model: gemini-3.1-flash-lite | Grade: ${formData.snapshotGrade} | Source: ${formData.currentCurriculum} | Target: ${formData.targetGoal || formData.targetCurriculum}`);

    // Log RAG status before calling LLM — confirms whether RAG data is injected
    const ragSubjectsInContext = ragContext
      ? [...ragContext.matchAll(/^\[(.*?)\]$/gm)].map(m => m[1]).filter(Boolean)
      : [];
    addDebug('llm_pre_call', 'About to call Gemini LLM', {
      ragActive: !!ragContext,
      ragGapNodesAvailable: ragGapNodes.length,
      ragGapNodesWithUrls: ragGapNodes.filter(g => {
        const m = (g.target_metadata || {}) as Record<string, unknown>;
        return !!(m.url || m.source_url);
      }).length,
      subjectsInRagContext: ragSubjectsInContext,
      ragContextChars: ragContext.length,
      ragContextFull: ragContext || '(none — LLM will use its own knowledge)',
    });

    const ragSection = ragContext
      ? `\n**VERIFIED GAPS FROM CURRICULUM DATABASE (${ragGapCount} priority gaps):**\n${ragContext}\n\nIMPORTANT — READ CAREFULLY:\n1. Use the VERIFIED GAPS above (semantic analysis of ${sourceEntry?.label || formData.currentCurriculum || 'source'} vs ${targetEntry?.label || formData.targetGoal || 'target'}) to populate keyGaps and criticalGaps. These are grounded in real DB data, not estimates.\n2. MANDATORY: Create a subjectAnalysis entry for EVERY [SubjectName] section listed in the VERIFIED GAP DATA above (e.g. [Hindi], [Geography], [History], [Science], [Political Science], [Sanskrit], [Economics]). Do NOT skip any RAG subject — even if the student did not list it in their profile.\n3. For subjects the student listed that have NO RAG gaps (e.g. Mathematics when it is well-aligned), include a brief entry with alignmentLevel: "strong" and keyGaps: [].\n4. NOTE: ${sourceEntry?.label || 'US Common Core'} only contains Math and English Language Arts standards. Science, History, Social Studies are not in the source DB — so NCERT Science/History/Social Studies topics will always appear as gaps. This is expected and correct — list them.\n5. CRITICAL = bottom 10% by similarity (urgent); MAJOR = 10-20% (bridge soon); MODERATE = 20-35% (address concurrently).\n`
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
      "topicsCovered": <number>,
      "totalTopics": <number>,
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

    const llmRawContent = geminiResponse.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
    addDebug('llm_raw_response', 'Raw Gemini API response received', {
      candidateCount: geminiResponse.candidates?.length || 0,
      finishReason: geminiResponse.candidates?.[0]?.finishReason,
      promptTokenCount: geminiResponse.usageMetadata?.promptTokenCount,
      candidatesTokenCount: geminiResponse.usageMetadata?.candidatesTokenCount,
      totalTokenCount: geminiResponse.usageMetadata?.totalTokenCount,
      contentPreview: llmRawContent.substring(0, 800),
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

    // ==========================================================================
    // POST-PROCESS: Inject resource URLs from RAG gap data into LLM output.
    // The LLM is unreliable at copying URLs — this deterministically matches
    // each gap topic from the LLM output against RAG node names and injects
    // the real URL from DB metadata (metadata.url for NCERT, metadata.source_url
    // for US CC).
    // ==========================================================================
    if (ragGapNodes.length > 0 || ragSubjectStats.size > 0) {
      const urlCountBefore = countUrls(analysisData);
      const urlMatchLog = injectRagUrls(analysisData, ragGapNodes);
      const urlCountAfter = countUrls(analysisData);
      const nodesWithUrls = ragGapNodes.filter(g => {
        const m = (g.target_metadata || {}) as Record<string, unknown>;
        return !!(m.url || m.source_url);
      }).length;
      addDebug('url_injection', 'Post-processed LLM output to inject RAG URLs', {
        ragGapNodeTotal: ragGapNodes.length,
        ragGapNodesWithUrls: nodesWithUrls,
        ragGapNodesWithoutUrls: ragGapNodes.length - nodesWithUrls,
        urlsBefore: urlCountBefore,
        urlsAfter: urlCountAfter,
        urlsInjected: urlCountAfter - urlCountBefore,
        perGapResults: urlMatchLog,
      });

      // Make sure every RAG subject appears in subjectAnalysis, even if LLM skipped it
      const expansionLog = expandSubjectAnalysisFromRag(
        analysisData,
        ragGapNodes,
        ragSubjectStats,
        ragSubjectClassifications,
        sourceEntry?.label || formData.currentCurriculum || 'the student\'s current curriculum'
      );
      addDebug('subject_analysis_expansion', 'Expanded subjectAnalysis from RAG data', {
        ragSubjects: [...new Set(ragGapNodes.map(g => ((g.target_metadata || {}) as Record<string, unknown>).subject as string).filter(Boolean))],
        expansionLog,
        subjectCountAfter: (analysisData.subjectAnalysis as unknown[])?.length || 0,
      });

      // ────────────────────────────────────────────────────────────────────
      // GROUND overallAlignment.percentage / subjectsNeedingBridge in the
      // real RAG numbers instead of the LLM's own guess.
      //
      // Every per-subject number in subjectAnalysis[] already gets corrected
      // above from ragSubjectStats — but the headline "Overall Readiness"
      // number the frontend actually renders (ReportPreview.tsx reads
      // analysis.overallAlignment.percentage directly, and derives
      // "Academic Risk"/"Transition Risk" from it) was still left as
      // whatever Gemini invented, with no cross-check against the corrected
      // subject cards underneath it. Confirmed in production: the LLM's own
      // subjectsNeedingBridge listed EVERY subject (including one the same
      // response marked 85% aligned), producing a nonsensical 100%
      // "Transition Risk" next to subject cards that clearly weren't all gaps.
      // ────────────────────────────────────────────────────────────────────
      if (ragAlignmentPct !== null) {
        const correctedSubjects = Array.isArray(analysisData.subjectAnalysis)
          ? (analysisData.subjectAnalysis as Record<string, unknown>[])
          : [];
        const subjectsNeedingBridge = correctedSubjects
          .filter(s => s.alignmentLevel !== 'strong')
          .map(s => s.subject as string)
          .filter(Boolean);

        const priorOverall = (analysisData.overallAlignment || {}) as Record<string, unknown>;
        analysisData.overallAlignment = {
          ...priorOverall,
          percentage: ragAlignmentPct,
          subjectsNeedingBridge,
        };
        addDebug('overall_alignment_grounded', 'Overwrote LLM overallAlignment with real RAG-derived values', {
          llmPercentage: priorOverall.percentage,
          ragPercentage: ragAlignmentPct,
          llmSubjectsNeedingBridge: priorOverall.subjectsNeedingBridge,
          correctedSubjectsNeedingBridge: subjectsNeedingBridge,
        });
      }
    }

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

    // ragAlignmentPct was already set directly (not regex-parsed) inside the
    // RAG block above, from the same coveredCount/total classifyGapsBySubject
    // computed — see the "GROUND overallAlignment" comment above.
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
