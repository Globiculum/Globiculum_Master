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

async function runAlignment(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  sourceCurriculum: string,
  targetCurriculum: string,
  gradeLevel: number,
  subjects: string[]
): Promise<AlignmentResult> {
  
  // Fetch existing alignment data from database
  const { data: existingAlignments } = await logger.measureRetrieval(
    'fetch-existing-alignments',
    async () => supabase
      .from('curriculum_alignments')
      .select('*')
      .eq('source_curriculum', sourceCurriculum)
      .eq('target_curriculum', targetCurriculum)
  );

  // Fetch curriculum nodes for both curricula
  const { data: sourceNodes } = await logger.measureRetrieval(
    'fetch-source-nodes',
    async () => supabase
      .from('curriculum_nodes')
      .select('*')
      .eq('curriculum_system', sourceCurriculum)
      .lte('grade_level_min', gradeLevel)
      .gte('grade_level_max', gradeLevel)
  );

  const { data: targetNodes } = await logger.measureRetrieval(
    'fetch-target-nodes',
    async () => supabase
      .from('curriculum_nodes')
      .select('*')
      .eq('curriculum_system', targetCurriculum)
      .lte('grade_level_min', gradeLevel)
      .gte('grade_level_max', gradeLevel)
  );

  logger.debug('Fetched curriculum data', {
    sourceNodeCount: sourceNodes?.length || 0,
    targetNodeCount: targetNodes?.length || 0,
    existingAlignmentCount: existingAlignments?.length || 0
  });

  // Calculate alignments per subject
  const subjectAlignments: SubjectAlignment[] = [];
  const gaps: AlignmentGap[] = [];
  const overlaps: AlignmentOverlap[] = [];
  const recommendations: AlignmentRecommendation[] = [];

  for (const subject of subjects) {
    const alignment = calculateSubjectAlignment(
      subject,
      sourceNodes || [],
      targetNodes || [],
      existingAlignments || [],
      gradeLevel
    );
    
    subjectAlignments.push(alignment.subjectAlignment);
    gaps.push(...alignment.gaps);
    overlaps.push(...alignment.overlaps);
    
    logger.debug(`Subject alignment: ${subject}`, {
      score: alignment.subjectAlignment.alignmentScore,
      gaps: alignment.gaps.length,
      overlaps: alignment.overlaps.length
    });
  }

  // Calculate overall alignment
  const overallAlignment = subjectAlignments.length > 0
    ? Math.round(subjectAlignments.reduce((sum, s) => sum + s.alignmentScore, 0) / subjectAlignments.length)
    : 0;

  // Generate prioritized recommendations
  const sortedGaps = gaps.sort((a, b) => {
    const severityOrder = { 'critical': 0, 'moderate': 1, 'minor': 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  for (let i = 0; i < Math.min(sortedGaps.length, 5); i++) {
    const gap = sortedGaps[i];
    recommendations.push({
      priority: i + 1,
      subject: gap.subject,
      action: `Bridge ${gap.topic} gap (${gap.gapType})`,
      timeEstimate: gap.bridgeTime,
      resources: getResourcesForGap(gap)
    });
  }

  return {
    overallAlignment,
    subjectAlignments,
    gaps,
    overlaps,
    recommendations,
    timestamp: new Date().toISOString()
  };
}

function calculateSubjectAlignment(
  subject: string,
  sourceNodes: any[],
  targetNodes: any[],
  alignments: any[],
  gradeLevel: number
): { subjectAlignment: SubjectAlignment; gaps: AlignmentGap[]; overlaps: AlignmentOverlap[] } {
  
  // Filter nodes by subject (using metadata or name matching)
  const subjectSourceNodes = sourceNodes.filter(n => 
    matchesSubject(n, subject)
  );
  const subjectTargetNodes = targetNodes.filter(n => 
    matchesSubject(n, subject)
  );

  const sourceCount = subjectSourceNodes.length || 10; // fallback
  const targetCount = subjectTargetNodes.length || 10;

  // Calculate alignment based on node matching
  const gaps: AlignmentGap[] = [];
  const overlaps: AlignmentOverlap[] = [];
  
  let matchedCount = 0;
  
  for (const targetNode of subjectTargetNodes) {
    const match = findMatchingNode(targetNode, subjectSourceNodes);
    
    if (match.matchType === 'full') {
      matchedCount++;
      overlaps.push({
        subject,
        topic: targetNode.name as string,
        sourceGrade: match.sourceGrade,
        targetGrade: gradeLevel,
        overlapType: 'full'
      });
    } else if (match.matchType === 'partial') {
      matchedCount += 0.5;
      overlaps.push({
        subject,
        topic: targetNode.name as string,
        sourceGrade: match.sourceGrade,
        targetGrade: gradeLevel,
        overlapType: 'partial'
      });
    } else {
      // Gap identified
      gaps.push({
        id: `gap-${subject}-${gaps.length}`,
        subject,
        topic: targetNode.name as string,
        gapType: determineGapType(targetNode, subjectSourceNodes),
        severity: determineSeverity(targetNode),
        description: `${targetNode.name} not covered in source curriculum`,
        bridgeTime: estimateBridgeTime(targetNode)
      });
    }
  }

  const alignmentScore = targetCount > 0 
    ? Math.round((matchedCount / targetCount) * 100)
    : 50; // default

  return {
    subjectAlignment: {
      subject,
      alignmentScore,
      sourceCoverage: sourceCount,
      targetCoverage: targetCount,
      gapCount: gaps.length,
      overlapCount: overlaps.length
    },
    gaps,
    overlaps
  };
}

function matchesSubject(node: Record<string, unknown>, subject: string): boolean {
  const name = ((node.name as string) || '').toLowerCase();
  const metadata = (node.metadata as Record<string, unknown>) || {};
  const nodeSubject = ((metadata.subject as string) || '').toLowerCase();
  
  return nodeSubject === subject.toLowerCase() || name.includes(subject.toLowerCase());
}

function findMatchingNode(
  targetNode: Record<string, unknown>,
  sourceNodes: Record<string, unknown>[]
): { matchType: 'full' | 'partial' | 'none'; sourceGrade: number } {
  const targetName = ((targetNode.name as string) || '').toLowerCase();
  
  for (const sourceNode of sourceNodes) {
    const sourceName = ((sourceNode.name as string) || '').toLowerCase();
    
    if (sourceName === targetName) {
      return { matchType: 'full', sourceGrade: sourceNode.grade_level_min as number || 9 };
    }
    
    // Check for partial match (similar topics)
    const targetWords = targetName.split(' ');
    const sourceWords = sourceName.split(' ');
    const commonWords = targetWords.filter(w => sourceWords.includes(w));
    
    if (commonWords.length >= Math.min(targetWords.length, sourceWords.length) * 0.5) {
      return { matchType: 'partial', sourceGrade: sourceNode.grade_level_min as number || 9 };
    }
  }
  
  return { matchType: 'none', sourceGrade: 0 };
}

function determineGapType(
  node: Record<string, unknown>,
  sourceNodes: Record<string, unknown>[]
): 'content' | 'depth' | 'timing' | 'approach' {
  // Analyze why there's a gap
  const metadata = (node.metadata as Record<string, unknown>) || {};
  
  // Check if content exists but at different level
  const name = (node.name as string) || '';
  const hasRelated = sourceNodes.some(s => 
    ((s.name as string) || '').includes(name.split(' ')[0])
  );
  
  if (hasRelated) {
    return 'depth';
  }
  
  if (metadata.pedagogical_approach) {
    return 'approach';
  }
  
  return 'content';
}

function determineSeverity(node: Record<string, unknown>): 'critical' | 'moderate' | 'minor' {
  const metadata = (node.metadata as Record<string, unknown>) || {};
  const isCore = metadata.is_core === true;
  const isPrerequisite = metadata.is_prerequisite === true;
  
  if (isCore || isPrerequisite) return 'critical';
  if (metadata.importance === 'high') return 'moderate';
  return 'minor';
}

function estimateBridgeTime(node: Record<string, unknown>): string {
  const metadata = (node.metadata as Record<string, unknown>) || {};
  const complexity = (metadata.complexity as string) || 'medium';
  
  switch (complexity) {
    case 'high': return '4-6 weeks';
    case 'medium': return '2-4 weeks';
    case 'low': return '1-2 weeks';
    default: return '2-3 weeks';
  }
}

function getResourcesForGap(gap: AlignmentGap): string[] {
  const resources: string[] = [];
  
  switch (gap.subject) {
    case 'math':
      resources.push('Khan Academy Math', 'IXL Math Practice');
      break;
    case 'science':
      resources.push('Khan Academy Science', 'PhET Simulations');
      break;
    case 'english':
      resources.push('CommonLit', 'NoRedInk');
      break;
    default:
      resources.push('Khan Academy', 'Study.com');
  }
  
  if (gap.severity === 'critical') {
    resources.push('1-on-1 Tutoring Recommended');
  }
  
  return resources;
}
