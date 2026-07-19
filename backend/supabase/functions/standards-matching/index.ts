import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createLogger } from "../_shared/observability.ts";
import { checkRateLimit, getRateLimitIdentifier, RateLimitConfigs, sanitizeString, sanitizeNumber } from "../_shared/security.ts";
import { createErrorResponse, ErrorCodes, API_VERSION } from "../_shared/apiContracts.ts";

interface StandardsMatchRequest {
  sourceStandard: StandardIdentifier;
  targetStandards?: string[];
  matchingMode: 'exact' | 'fuzzy' | 'semantic';
  threshold?: number;
  gradeLevel?: number;
}

interface StandardIdentifier {
  id?: string;
  code?: string;
  name?: string;
  curriculum: string;
  subject?: string;
}

interface StandardMatch {
  sourceId: string;
  sourceCode: string;
  sourceName: string;
  targetId: string;
  targetCode: string;
  targetName: string;
  targetCurriculum: string;
  matchScore: number;
  matchType: 'exact' | 'equivalent' | 'partial' | 'related';
  confidence: number;
  alignmentNotes: string[];
}

interface MatchingResult {
  query: StandardIdentifier;
  matches: StandardMatch[];
  statistics: {
    totalCandidates: number;
    matchesFound: number;
    averageScore: number;
    executionTimeMs: number;
  };
  timestamp: string;
}

interface CurriculumNode {
  id: string;
  name: string;
  node_type: string;
  curriculum_system: string | null;
  grade_level_min: number | null;
  grade_level_max: number | null;
  description: string | null;
  metadata: { code?: string; subject?: string } | null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const logger = createLogger('standards-matching');
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

    let requestData: StandardsMatchRequest;
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

    const { 
      sourceStandard, 
      targetStandards, 
      matchingMode = 'fuzzy', 
      threshold = 0.5,
      gradeLevel 
    } = requestData;

    // Validate input
    if (!sourceStandard || !sourceStandard.curriculum) {
      logger.logValidationFailure('sourceStandard', 'sourceStandard with curriculum is required', 'error');
      logger.logSummary(false);
      return new Response(
        JSON.stringify({ error: 'sourceStandard with curriculum is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetCurriculums = targetStandards || ['common_core', 'cbse', 'icse', 'ib', 'igcse'];

    logger.info('Standards matching starting', { 
      sourceCurriculum: sourceStandard.curriculum, 
      targetCurriculums,
      matchingMode,
      threshold
    });

    const result = await matchStandards(
      supabase,
      logger,
      sourceStandard,
      targetCurriculums,
      matchingMode,
      threshold,
      gradeLevel
    );

    logger.info('Standards matching completed', { 
      matchesFound: result.matches.length,
      totalCandidates: result.statistics.totalCandidates,
      averageScore: result.statistics.averageScore
    });
    logger.logSummary(true);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        _meta: { requestId: logger.getRequestId() }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Unhandled error in standards-matching', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    logger.logSummary(false);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function matchStandards(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  sourceStandard: StandardIdentifier,
  targetCurriculums: string[],
  mode: 'exact' | 'fuzzy' | 'semantic',
  threshold: number,
  gradeLevel?: number
): Promise<MatchingResult> {
  
  // First, resolve the source standard to a node
  const sourceNode = await resolveStandard(supabase, logger, sourceStandard, gradeLevel);
  
  if (!sourceNode) {
    logger.warn('Source standard not found', { sourceStandard });
    return {
      query: sourceStandard,
      matches: [],
      statistics: {
        totalCandidates: 0,
        matchesFound: 0,
        averageScore: 0,
        executionTimeMs: 0
      },
      timestamp: new Date().toISOString()
    };
  }

  logger.debug('Source standard resolved', { sourceNodeId: sourceNode.id, name: sourceNode.name });

  // Check existing alignments in the database
  const { data: existingAlignments } = await logger.measureRetrieval(
    'fetch-existing-alignments',
    async () => supabase
      .from('curriculum_alignments')
      .select('*')
      .eq('source_node_id', sourceNode.id)
      .in('target_curriculum', targetCurriculums)
  );

  // Find candidate nodes in target curriculums
  let candidateQuery = supabase
    .from('curriculum_nodes')
    .select('*')
    .in('curriculum_system', targetCurriculums);

  if (gradeLevel) {
    candidateQuery = candidateQuery
      .lte('grade_level_min', gradeLevel)
      .gte('grade_level_max', gradeLevel);
  }

  if (sourceStandard.subject) {
    // Filter by subject if provided
    candidateQuery = candidateQuery.ilike('name', `%${sourceStandard.subject}%`);
  }

  const { data: candidates } = await logger.measureRetrieval(
    'fetch-candidate-nodes',
    async () => candidateQuery.limit(200)
  );

  const allCandidates = candidates || [];

  logger.debug('Candidates fetched', { 
    count: allCandidates.length,
    existingAlignments: existingAlignments?.length || 0
  });

  // Perform matching based on mode
  const matches: StandardMatch[] = [];
  
  for (const candidate of allCandidates as CurriculumNode[]) {
    const matchResult = calculateMatch(sourceNode, candidate, mode, existingAlignments || []);
    
    if (matchResult.score >= threshold) {
      matches.push({
        sourceId: sourceNode.id,
        sourceCode: sourceNode.metadata?.code as string || '',
        sourceName: sourceNode.name,
        targetId: candidate.id,
        targetCode: candidate.metadata?.code as string || '',
        targetName: candidate.name,
        targetCurriculum: candidate.curriculum_system || '',
        matchScore: matchResult.score,
        matchType: matchResult.type,
        confidence: matchResult.confidence,
        alignmentNotes: matchResult.notes
      });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);

  const averageScore = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length
    : 0;

  return {
    query: sourceStandard,
    matches: matches.slice(0, 50), // Limit results
    statistics: {
      totalCandidates: allCandidates.length,
      matchesFound: matches.length,
      averageScore: Math.round(averageScore * 100) / 100,
      executionTimeMs: 0
    },
    timestamp: new Date().toISOString()
  };
}

async function resolveStandard(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  standard: StandardIdentifier,
  gradeLevel?: number
): Promise<CurriculumNode | null> {
  
  // Try to find by ID first
  if (standard.id) {
    const { data } = await logger.measureRetrieval(
      'resolve-by-id',
      async () => supabase
        .from('curriculum_nodes')
        .select('*')
        .eq('id', standard.id)
        .single()
    );
    return data;
  }

  // Try to find by code
  if (standard.code) {
    const { data } = await logger.measureRetrieval(
      'resolve-by-code',
      async () => supabase
        .from('curriculum_nodes')
        .select('*')
        .eq('curriculum_system', standard.curriculum)
        .contains('metadata', { code: standard.code })
        .single()
    );
    if (data) return data;
  }

  // Try to find by name
  if (standard.name) {
    let query = supabase
      .from('curriculum_nodes')
      .select('*')
      .eq('curriculum_system', standard.curriculum)
      .ilike('name', `%${standard.name}%`);

    if (gradeLevel) {
      query = query
        .lte('grade_level_min', gradeLevel)
        .gte('grade_level_max', gradeLevel);
    }

    const { data } = await logger.measureRetrieval(
      'resolve-by-name',
      async () => query.limit(1)
    );
    return data?.[0] || null;
  }

  return null;
}

function calculateMatch(
  source: CurriculumNode,
  target: CurriculumNode,
  mode: 'exact' | 'fuzzy' | 'semantic',
  existingAlignments: Record<string, unknown>[]
): { score: number; type: 'exact' | 'equivalent' | 'partial' | 'related'; confidence: number; notes: string[] } {
  
  const notes: string[] = [];
  
  // Check if there's an existing alignment
  const existingAlignment = existingAlignments.find(
    a => a.target_node_id === target.id
  );
  
  if (existingAlignment) {
    const score = existingAlignment.alignment_score as number;
    notes.push('Pre-computed alignment exists');
    if (existingAlignment.notes) {
      notes.push(existingAlignment.notes as string);
    }
    return {
      score,
      type: score >= 0.9 ? 'exact' : score >= 0.7 ? 'equivalent' : score >= 0.5 ? 'partial' : 'related',
      confidence: 0.95,
      notes
    };
  }

  const sourceName = ((source.name as string) || '').toLowerCase();
  const targetName = ((target.name as string) || '').toLowerCase();
  const sourceDesc = ((source.description as string) || '').toLowerCase();
  const targetDesc = ((target.description as string) || '').toLowerCase();

  let score = 0;
  let matchType: 'exact' | 'equivalent' | 'partial' | 'related' = 'related';
  let confidence = 0.5;

  if (mode === 'exact') {
    // Exact string matching
    if (sourceName === targetName) {
      score = 1.0;
      matchType = 'exact';
      confidence = 1.0;
      notes.push('Exact name match');
    }
  } else if (mode === 'fuzzy') {
    // Fuzzy matching using token overlap
    const sourceTokens = tokenize(sourceName + ' ' + sourceDesc);
    const targetTokens = tokenize(targetName + ' ' + targetDesc);
    
    const intersection = sourceTokens.filter(t => targetTokens.includes(t));
    const union = new Set([...sourceTokens, ...targetTokens]);
    
    // Jaccard similarity
    score = union.size > 0 ? intersection.length / union.size : 0;
    
    // Boost for exact name match
    if (sourceName === targetName) {
      score = Math.min(score + 0.3, 1.0);
      notes.push('Exact name match (boosted)');
    }
    
    // Check for keyword matches
    const keywordScore = calculateKeywordMatch(source, target);
    score = Math.max(score, keywordScore);
    
    matchType = score >= 0.9 ? 'exact' : score >= 0.7 ? 'equivalent' : score >= 0.5 ? 'partial' : 'related';
    confidence = 0.7;
    notes.push(`Token overlap: ${intersection.length}/${union.size}`);
    
  } else if (mode === 'semantic') {
    // Semantic matching using metadata and structure
    const sourceMetadata = (source.metadata as Record<string, unknown>) || {};
    const targetMetadata = (target.metadata as Record<string, unknown>) || {};
    
    // Compare learning outcomes
    const sourceLO = (sourceMetadata.learning_outcomes as string[]) || [];
    const targetLO = (targetMetadata.learning_outcomes as string[]) || [];
    
    if (sourceLO.length > 0 && targetLO.length > 0) {
      const loScore = compareArrays(sourceLO, targetLO);
      score = Math.max(score, loScore);
      notes.push(`Learning outcomes similarity: ${Math.round(loScore * 100)}%`);
    }
    
    // Compare skills
    const sourceSkills = (sourceMetadata.skills as string[]) || [];
    const targetSkills = (targetMetadata.skills as string[]) || [];
    
    if (sourceSkills.length > 0 && targetSkills.length > 0) {
      const skillScore = compareArrays(sourceSkills, targetSkills);
      score = Math.max(score, skillScore);
      notes.push(`Skills similarity: ${Math.round(skillScore * 100)}%`);
    }
    
    // Grade level alignment
    const sourceGrade = source.grade_level_min as number || 0;
    const targetGrade = target.grade_level_min as number || 0;
    const gradeDiff = Math.abs(sourceGrade - targetGrade);
    
    if (gradeDiff === 0) {
      score += 0.1;
      notes.push('Same grade level');
    } else if (gradeDiff <= 1) {
      score += 0.05;
      notes.push('Adjacent grade level');
    }
    
    score = Math.min(score, 1.0);
    matchType = score >= 0.9 ? 'exact' : score >= 0.7 ? 'equivalent' : score >= 0.5 ? 'partial' : 'related';
    confidence = 0.8;
  }

  return { score: Math.round(score * 100) / 100, type: matchType, confidence, notes };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function calculateKeywordMatch(source: CurriculumNode, target: CurriculumNode): number {
  const keywordMap: Record<string, string[]> = {
    'algebra': ['equations', 'variables', 'expressions', 'polynomials', 'linear'],
    'geometry': ['shapes', 'angles', 'triangles', 'area', 'perimeter', 'volume'],
    'calculus': ['derivatives', 'integrals', 'limits', 'differentiation'],
    'statistics': ['probability', 'data', 'mean', 'median', 'standard deviation'],
    'physics': ['motion', 'force', 'energy', 'waves', 'electricity'],
    'chemistry': ['elements', 'compounds', 'reactions', 'bonding', 'acids'],
    'biology': ['cells', 'genetics', 'evolution', 'organisms', 'ecosystems']
  };

  const sourceName = ((source.name as string) || '').toLowerCase();
  const targetName = ((target.name as string) || '').toLowerCase();

  for (const [category, keywords] of Object.entries(keywordMap)) {
    const sourceHasCategory = sourceName.includes(category) || keywords.some(k => sourceName.includes(k));
    const targetHasCategory = targetName.includes(category) || keywords.some(k => targetName.includes(k));
    
    if (sourceHasCategory && targetHasCategory) {
      return 0.6; // Base match for same category
    }
  }

  return 0;
}

function compareArrays(arr1: string[], arr2: string[]): number {
  const set1 = new Set(arr1.map(s => s.toLowerCase()));
  const set2 = new Set(arr2.map(s => s.toLowerCase()));
  
  let matches = 0;
  for (const item of set1) {
    if (set2.has(item)) {
      matches++;
    }
  }
  
  const total = Math.max(set1.size, set2.size);
  return total > 0 ? matches / total : 0;
}
