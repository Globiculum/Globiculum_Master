import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createLogger } from "../_shared/observability.ts";
import { checkRateLimit, getRateLimitIdentifier, RateLimitConfigs, sanitizeString, sanitizeNumber, sanitizeUUID } from "../_shared/security.ts";
import { createErrorResponse, ErrorCodes, API_VERSION } from "../_shared/apiContracts.ts";

interface PriorityScoringRequest {
  studentId: string;
  gaps: GapInput[];
  context: ScoringContext;
}

interface GapInput {
  id: string;
  subject: string;
  topic: string;
  gapType: 'content' | 'depth' | 'timing' | 'approach';
  currentMastery: number;
  targetMastery: number;
}

interface ScoringContext {
  targetCurriculum: string;
  gradeLevel: number;
  transitionTimeline: 'immediate' | 'short' | 'medium' | 'long';
  academicGoals?: string[];
  learningStyle?: string;
  availableHoursPerWeek?: number;
}

interface PrioritizedGap {
  id: string;
  subject: string;
  topic: string;
  priorityScore: number;
  priorityRank: number;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  factors: PriorityFactor[];
  estimatedTimeToClose: string;
  suggestedSequence: number;
  dependencies: string[];
  blockedBy: string[];
}

interface PriorityFactor {
  name: string;
  weight: number;
  score: number;
  contribution: number;
  explanation: string;
}

interface PriorityScoringResult {
  prioritizedGaps: PrioritizedGap[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalEstimatedHours: number;
    recommendedSequence: string[];
  };
  scoringMetadata: {
    algorithm: string;
    weights: Record<string, number>;
    timestamp: string;
  };
}

// Priority factor weights
const FACTOR_WEIGHTS = {
  prerequisiteImpact: 0.25,
  assessmentRelevance: 0.20,
  gapSeverity: 0.20,
  timelineFit: 0.15,
  learningEfficiency: 0.10,
  goalAlignment: 0.10
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const logger = createLogger('priority-scoring');
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

    let requestData: PriorityScoringRequest;
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

    const { studentId, gaps, context } = requestData;

    // Validate input
    if (!studentId || !gaps || gaps.length === 0) {
      logger.logValidationFailure('input', 'studentId and gaps array are required', 'error');
      logger.logSummary(false);
      return new Response(
        JSON.stringify({ error: 'studentId and gaps array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Priority scoring starting', { 
      studentId, 
      gapCount: gaps.length,
      timeline: context.transitionTimeline
    });

    const result = await calculatePriorities(supabase, logger, studentId, gaps, context);

    logger.info('Priority scoring completed', { 
      criticalCount: result.summary.criticalCount,
      highCount: result.summary.highCount,
      totalEstimatedHours: result.summary.totalEstimatedHours
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
    logger.error('Unhandled error in priority-scoring', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    logger.logSummary(false);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function calculatePriorities(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  studentId: string,
  gaps: GapInput[],
  context: ScoringContext
): Promise<PriorityScoringResult> {
  
  // Fetch prerequisite relationships to understand dependencies
  const dependencies = await buildDependencyGraph(supabase, logger, gaps);
  
  logger.debug('Dependency graph built', { 
    gapsWithDependencies: Array.from(dependencies.entries()).filter(([_, d]) => d.dependsOn.length > 0).length
  });
  
  // Fetch assessment relevance data
  const assessmentWeights = getAssessmentRelevance(context.targetCurriculum, context.gradeLevel);
  
  // Calculate priority score for each gap
  const prioritizedGaps: PrioritizedGap[] = [];
  
  for (const gap of gaps) {
    const factors = calculatePriorityFactors(gap, context, dependencies, assessmentWeights);
    const priorityScore = calculateFinalScore(factors);
    
    prioritizedGaps.push({
      id: gap.id,
      subject: gap.subject,
      topic: gap.topic,
      priorityScore,
      priorityRank: 0, // Set after sorting
      priorityLevel: getPriorityLevel(priorityScore),
      factors,
      estimatedTimeToClose: estimateClosureTime(gap, context),
      suggestedSequence: 0, // Set after dependency analysis
      dependencies: dependencies.get(gap.id)?.dependsOn || [],
      blockedBy: dependencies.get(gap.id)?.blockedBy || []
    });
  }

  // Sort by priority score
  prioritizedGaps.sort((a, b) => b.priorityScore - a.priorityScore);
  
  // Assign ranks
  prioritizedGaps.forEach((gap, index) => {
    gap.priorityRank = index + 1;
  });

  // Calculate optimal learning sequence based on dependencies
  const sequence = calculateLearningSequence(prioritizedGaps, dependencies);
  prioritizedGaps.forEach(gap => {
    gap.suggestedSequence = sequence.indexOf(gap.id) + 1;
  });

  // Calculate summary statistics
  const summary = {
    criticalCount: prioritizedGaps.filter(g => g.priorityLevel === 'critical').length,
    highCount: prioritizedGaps.filter(g => g.priorityLevel === 'high').length,
    mediumCount: prioritizedGaps.filter(g => g.priorityLevel === 'medium').length,
    lowCount: prioritizedGaps.filter(g => g.priorityLevel === 'low').length,
    totalEstimatedHours: calculateTotalHours(prioritizedGaps),
    recommendedSequence: sequence
  };

  return {
    prioritizedGaps,
    summary,
    scoringMetadata: {
      algorithm: 'weighted-multi-factor-v1',
      weights: FACTOR_WEIGHTS,
      timestamp: new Date().toISOString()
    }
  };
}

async function buildDependencyGraph(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  gaps: GapInput[]
): Promise<Map<string, { dependsOn: string[]; blockedBy: string[] }>> {
  
  const dependencies = new Map<string, { dependsOn: string[]; blockedBy: string[] }>();
  
  // Initialize all gaps
  for (const gap of gaps) {
    dependencies.set(gap.id, { dependsOn: [], blockedBy: [] });
  }

  // Fetch curriculum edges to find prerequisite relationships
  const topics = gaps.map(g => g.topic);
  
  const { data: nodes } = await logger.measureRetrieval(
    'fetch-gap-nodes',
    async () => supabase
      .from('curriculum_nodes')
      .select('id, name')
      .in('name', topics)
  );

  if (!nodes || nodes.length === 0) {
    logger.debug('No curriculum nodes found for gap topics');
    return dependencies;
  }

  const nodeIds = nodes.map((n: { id: string; name: string }) => n.id);
  const nodeNameToId = new Map(nodes.map((n: { id: string; name: string }) => [n.name, n.id]));
  const nodeIdToName = new Map(nodes.map((n: { id: string; name: string }) => [n.id, n.name]));

  const { data: edges } = await logger.measureRetrieval(
    'fetch-prerequisite-edges',
    async () => supabase
      .from('curriculum_edges')
      .select('*')
      .eq('relationship_type', 'prerequisite')
      .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`)
  );

  if (!edges) {
    return dependencies;
  }

  logger.debug('Found prerequisite edges', { count: edges.length });

  // Build dependency relationships
  for (const edge of edges) {
    const sourceName = nodeIdToName.get(edge.source_node_id);
    const targetName = nodeIdToName.get(edge.target_node_id);
    
    if (!sourceName || !targetName) continue;

    const sourceGap = gaps.find(g => g.topic === sourceName);
    const targetGap = gaps.find(g => g.topic === targetName);

    if (sourceGap && targetGap) {
      // source is prerequisite of target
      const targetDeps = dependencies.get(targetGap.id);
      if (targetDeps) {
        targetDeps.dependsOn.push(sourceGap.id);
      }
      
      const sourceDeps = dependencies.get(sourceGap.id);
      if (sourceDeps) {
        sourceDeps.blockedBy.push(targetGap.id);
      }
    }
  }

  return dependencies;
}

function getAssessmentRelevance(curriculum: string, gradeLevel: number): Map<string, number> {
  // Weight topics by their relevance to standardized assessments
  const weights = new Map<string, number>();
  
  // SAT/ACT relevant topics get higher weights for US curriculum
  if (curriculum.includes('common_core') || curriculum.includes('us')) {
    weights.set('algebra', 0.9);
    weights.set('geometry', 0.8);
    weights.set('reading_comprehension', 0.9);
    weights.set('writing', 0.85);
    weights.set('statistics', 0.7);
  }
  
  // Board exam relevant topics for Indian curricula
  if (curriculum.includes('cbse') || curriculum.includes('icse')) {
    weights.set('calculus', 0.85);
    weights.set('physics', 0.9);
    weights.set('chemistry', 0.9);
    weights.set('biology', 0.85);
  }

  // IB specific
  if (curriculum.includes('ib')) {
    weights.set('theory_of_knowledge', 0.8);
    weights.set('extended_essay', 0.7);
    weights.set('cas', 0.6);
  }

  return weights;
}

function calculatePriorityFactors(
  gap: GapInput,
  context: ScoringContext,
  dependencies: Map<string, { dependsOn: string[]; blockedBy: string[] }>,
  assessmentWeights: Map<string, number>
): PriorityFactor[] {
  
  const factors: PriorityFactor[] = [];
  
  // 1. Prerequisite Impact
  const deps = dependencies.get(gap.id);
  const blockedCount = deps?.blockedBy.length || 0;
  const prereqScore = Math.min(blockedCount / 3, 1); // Normalize
  factors.push({
    name: 'prerequisiteImpact',
    weight: FACTOR_WEIGHTS.prerequisiteImpact,
    score: prereqScore,
    contribution: prereqScore * FACTOR_WEIGHTS.prerequisiteImpact,
    explanation: blockedCount > 0 
      ? `Blocks ${blockedCount} other topic(s)` 
      : 'No downstream dependencies'
  });

  // 2. Assessment Relevance
  const assessmentScore = assessmentWeights.get(gap.subject) || 
                         assessmentWeights.get(gap.topic.toLowerCase()) || 
                         0.5;
  factors.push({
    name: 'assessmentRelevance',
    weight: FACTOR_WEIGHTS.assessmentRelevance,
    score: assessmentScore,
    contribution: assessmentScore * FACTOR_WEIGHTS.assessmentRelevance,
    explanation: `${Math.round(assessmentScore * 100)}% relevance to standardized assessments`
  });

  // 3. Gap Severity
  const masteryGap = gap.targetMastery - gap.currentMastery;
  const severityScore = Math.min(masteryGap / 100, 1);
  factors.push({
    name: 'gapSeverity',
    weight: FACTOR_WEIGHTS.gapSeverity,
    score: severityScore,
    contribution: severityScore * FACTOR_WEIGHTS.gapSeverity,
    explanation: `${Math.round(masteryGap)}% mastery gap to close`
  });

  // 4. Timeline Fit
  const timelineScores: Record<string, number> = {
    'immediate': gap.gapType === 'content' ? 0.9 : 0.7,
    'short': gap.gapType === 'content' ? 0.8 : 0.85,
    'medium': 0.7,
    'long': 0.5
  };
  const timelineScore = timelineScores[context.transitionTimeline] || 0.5;
  factors.push({
    name: 'timelineFit',
    weight: FACTOR_WEIGHTS.timelineFit,
    score: timelineScore,
    contribution: timelineScore * FACTOR_WEIGHTS.timelineFit,
    explanation: `${context.transitionTimeline} timeline - ${gap.gapType} gap`
  });

  // 5. Learning Efficiency
  const efficiencyScore = calculateLearningEfficiency(gap, context);
  factors.push({
    name: 'learningEfficiency',
    weight: FACTOR_WEIGHTS.learningEfficiency,
    score: efficiencyScore,
    contribution: efficiencyScore * FACTOR_WEIGHTS.learningEfficiency,
    explanation: `${Math.round(efficiencyScore * 100)}% estimated learning efficiency`
  });

  // 6. Goal Alignment
  let goalScore = 0.5; // Default
  if (context.academicGoals && context.academicGoals.length > 0) {
    const matchingGoals = context.academicGoals.filter(goal => 
      goal.toLowerCase().includes(gap.subject.toLowerCase()) ||
      goal.toLowerCase().includes(gap.topic.toLowerCase())
    );
    goalScore = matchingGoals.length > 0 ? 0.9 : 0.3;
  }
  factors.push({
    name: 'goalAlignment',
    weight: FACTOR_WEIGHTS.goalAlignment,
    score: goalScore,
    contribution: goalScore * FACTOR_WEIGHTS.goalAlignment,
    explanation: goalScore > 0.5 ? 'Aligns with academic goals' : 'Not directly aligned with stated goals'
  });

  return factors;
}

function calculateLearningEfficiency(gap: GapInput, context: ScoringContext): number {
  let efficiency = 0.5;
  
  // Higher current mastery means faster learning
  if (gap.currentMastery > 50) {
    efficiency += 0.2;
  }
  
  // Gap type affects efficiency
  const gapTypeEfficiency: Record<string, number> = {
    'content': 0.1,
    'depth': 0.15,
    'timing': 0.2,
    'approach': 0.05
  };
  efficiency += gapTypeEfficiency[gap.gapType] || 0;
  
  // Learning style match (if visual learner and subject is visual, boost)
  if (context.learningStyle) {
    const visualSubjects = ['geometry', 'physics', 'biology'];
    const auditorySubjects = ['english', 'history', 'music'];
    
    if (context.learningStyle === 'visual' && visualSubjects.includes(gap.subject)) {
      efficiency += 0.15;
    }
    if (context.learningStyle === 'auditory' && auditorySubjects.includes(gap.subject)) {
      efficiency += 0.15;
    }
  }
  
  return Math.min(efficiency, 1);
}

function calculateFinalScore(factors: PriorityFactor[]): number {
  const totalContribution = factors.reduce((sum, f) => sum + f.contribution, 0);
  return Math.round(totalContribution * 100) / 100;
}

function getPriorityLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 0.75) return 'critical';
  if (score >= 0.55) return 'high';
  if (score >= 0.35) return 'medium';
  return 'low';
}

function estimateClosureTime(gap: GapInput, context: ScoringContext): string {
  const masteryGap = gap.targetMastery - gap.currentMastery;
  const hoursPerWeek = context.availableHoursPerWeek || 10;
  
  // Base hours needed per 10% mastery gain
  const baseHoursPerTen: Record<string, number> = {
    'content': 8,
    'depth': 6,
    'timing': 4,
    'approach': 5
  };
  
  const totalHours = (masteryGap / 10) * (baseHoursPerTen[gap.gapType] || 6);
  const weeks = Math.ceil(totalHours / hoursPerWeek);
  
  if (weeks <= 2) return '1-2 weeks';
  if (weeks <= 4) return '3-4 weeks';
  if (weeks <= 8) return '1-2 months';
  return '2+ months';
}

function calculateLearningSequence(
  gaps: PrioritizedGap[],
  dependencies: Map<string, { dependsOn: string[]; blockedBy: string[] }>
): string[] {
  // Topological sort with priority weighting
  const sequence: string[] = [];
  const remaining = new Set(gaps.map(g => g.id));
  const completed = new Set<string>();

  while (remaining.size > 0) {
    // Find gaps with no unmet dependencies
    const available = gaps.filter(g => {
      if (!remaining.has(g.id)) return false;
      const deps = dependencies.get(g.id);
      if (!deps) return true;
      return deps.dependsOn.every(d => completed.has(d) || !remaining.has(d));
    });

    if (available.length === 0) {
      // Cycle detected or all remaining have unmet deps - add highest priority
      const highest = Array.from(remaining)
        .map(id => gaps.find(g => g.id === id)!)
        .sort((a, b) => b.priorityScore - a.priorityScore)[0];
      sequence.push(highest.id);
      remaining.delete(highest.id);
      completed.add(highest.id);
    } else {
      // Add the highest priority available gap
      available.sort((a, b) => b.priorityScore - a.priorityScore);
      const next = available[0];
      sequence.push(next.id);
      remaining.delete(next.id);
      completed.add(next.id);
    }
  }

  return sequence;
}

function calculateTotalHours(gaps: PrioritizedGap[]): number {
  let total = 0;
  
  for (const gap of gaps) {
    const time = gap.estimatedTimeToClose;
    if (time.includes('1-2 weeks')) total += 15;
    else if (time.includes('3-4 weeks')) total += 35;
    else if (time.includes('1-2 months')) total += 60;
    else total += 100;
  }
  
  return total;
}
