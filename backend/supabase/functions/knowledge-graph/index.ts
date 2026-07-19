import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createLogger } from "../_shared/observability.ts";
import { checkRateLimit, getRateLimitIdentifier, RateLimitConfigs, sanitizeString, sanitizeNumber, sanitizeUUID } from "../_shared/security.ts";
import { createErrorResponse, ErrorCodes, API_VERSION } from "../_shared/apiContracts.ts";

type TraversalMode = 'bfs' | 'dfs' | 'shortest-path' | 'all-paths';
type RelationshipType = 'contains' | 'prerequisite' | 'related_to' | 'equivalent_to' | 'maps_to' | 'extends';

interface GraphRequest {
  operation: 'traverse' | 'find-path' | 'get-prerequisites' | 'get-descendants' | 'find-related';
  startNodeId?: string;
  endNodeId?: string;
  maxDepth?: number;
  relationshipTypes?: RelationshipType[];
  traversalMode?: TraversalMode;
  curriculumSystem?: string;
  nodeType?: string;
  gradeLevel?: number;
}

interface GraphNode {
  id: string;
  nodeType: string;
  name: string;
  description: string | null;
  gradeLevelMin: number | null;
  gradeLevelMax: number | null;
  curriculumSystem: string | null;
  metadata: Record<string, unknown>;
}

interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: RelationshipType;
  weight: number;
  metadata: Record<string, unknown>;
}

interface TraversalResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths: string[][];
  statistics: {
    nodesVisited: number;
    edgesTraversed: number;
    maxDepthReached: number;
    executionTimeMs: number;
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const logger = createLogger('knowledge-graph');
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

    let requestData: GraphRequest;
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
      operation, 
      startNodeId, 
      endNodeId, 
      maxDepth = 5, 
      relationshipTypes,
      traversalMode = 'bfs',
      curriculumSystem,
      nodeType,
      gradeLevel
    } = requestData;

    // Validate max depth to prevent DoS
    const safeMaxDepth = Math.min(Math.max(maxDepth, 1), 10);
    if (maxDepth !== safeMaxDepth) {
      logger.warn('Max depth clamped for safety', { requested: maxDepth, applied: safeMaxDepth });
    }

    logger.info('Graph operation starting', { 
      operation, 
      traversalMode, 
      maxDepth: safeMaxDepth,
      startNodeId,
      endNodeId
    });

    let result: TraversalResult;

    switch (operation) {
      case 'traverse':
        if (!startNodeId) {
          logger.logValidationFailure('startNodeId', 'startNodeId is required for traverse operation', 'error');
          logger.logSummary(false);
          return new Response(
            JSON.stringify({ error: 'startNodeId is required for traverse operation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await traverseGraph(supabase, logger, startNodeId, safeMaxDepth, relationshipTypes, traversalMode);
        break;

      case 'find-path':
        if (!startNodeId || !endNodeId) {
          logger.logValidationFailure('nodeIds', 'startNodeId and endNodeId are required for find-path operation', 'error');
          logger.logSummary(false);
          return new Response(
            JSON.stringify({ error: 'startNodeId and endNodeId are required for find-path operation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await findPath(supabase, logger, startNodeId, endNodeId, safeMaxDepth, relationshipTypes);
        break;

      case 'get-prerequisites':
        if (!startNodeId) {
          logger.logValidationFailure('startNodeId', 'startNodeId is required for get-prerequisites operation', 'error');
          logger.logSummary(false);
          return new Response(
            JSON.stringify({ error: 'startNodeId is required for get-prerequisites operation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getPrerequisites(supabase, logger, startNodeId, safeMaxDepth);
        break;

      case 'get-descendants':
        if (!startNodeId) {
          logger.logValidationFailure('startNodeId', 'startNodeId is required for get-descendants operation', 'error');
          logger.logSummary(false);
          return new Response(
            JSON.stringify({ error: 'startNodeId is required for get-descendants operation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getDescendants(supabase, logger, startNodeId, safeMaxDepth, relationshipTypes);
        break;

      case 'find-related':
        result = await findRelatedNodes(supabase, logger, curriculumSystem, nodeType, gradeLevel, safeMaxDepth);
        break;

      default:
        logger.logValidationFailure('operation', `Unknown operation: ${operation}`, 'error');
        logger.logSummary(false);
        return new Response(
          JSON.stringify({ error: `Unknown operation: ${operation}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    logger.info('Graph operation completed', {
      nodesVisited: result.statistics.nodesVisited,
      edgesTraversed: result.statistics.edgesTraversed,
      pathsFound: result.paths.length
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
    logger.error('Unhandled error in knowledge-graph', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    logger.logSummary(false);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function traverseGraph(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  startNodeId: string,
  maxDepth: number,
  relationshipTypes?: RelationshipType[],
  mode: TraversalMode = 'bfs'
): Promise<TraversalResult> {
  
  // Use the database function for efficient traversal
  const { data: traversalData, error } = await logger.measureRetrieval(
    'rpc-traverse_curriculum_graph',
    async () => supabase.rpc('traverse_curriculum_graph', {
      start_node_id: startNodeId,
      max_depth: maxDepth,
      relationship_types: relationshipTypes || null
    })
  );

  if (error) {
    logger.error('Traversal RPC error', { error: error.message });
    throw error;
  }
  
  const traversalResults = (traversalData || []) as any[];
  const nodeIds = traversalResults.map((r: any) => r.node_id);
  
  logger.debug('Traversal returned nodes', { count: nodeIds.length });
  
  // Fetch full node data
  const { data: nodes } = await logger.measureRetrieval(
    'fetch-traversed-nodes',
    async () => supabase
      .from('curriculum_nodes')
      .select('*')
      .in('id', nodeIds.length > 0 ? nodeIds : ['00000000-0000-0000-0000-000000000000'])
  );

  // Fetch edges between these nodes
  const { data: edges } = nodeIds.length > 0 
    ? await logger.measureRetrieval(
        'fetch-traversed-edges',
        async () => supabase
          .from('curriculum_edges')
          .select('*')
          .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`)
      )
    : { data: [] };

  // Build paths from traversal data
  const paths = traversalResults.map((r: any) => r.path as string[]);

  return {
    nodes: ((nodes || []) as any[]).map(mapNode),
    edges: ((edges || []) as any[]).map(mapEdge),
    paths,
    statistics: {
      nodesVisited: nodes?.length || 0,
      edgesTraversed: edges?.length || 0,
      maxDepthReached: Math.max(...traversalResults.map((r: any) => r.depth as number), 0),
      executionTimeMs: 0
    }
  };
}

async function findPath(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  startNodeId: string,
  endNodeId: string,
  maxDepth: number,
  relationshipTypes?: RelationshipType[]
): Promise<TraversalResult> {
  
  logger.debug('Finding path', { from: startNodeId, to: endNodeId, maxDepth });
  
  // BFS to find shortest path
  const visited = new Set<string>();
  const queue: { nodeId: string; path: string[]; depth: number }[] = [
    { nodeId: startNodeId, path: [startNodeId], depth: 0 }
  ];
  
  const allNodes: Map<string, GraphNode> = new Map();
  const allEdges: GraphEdge[] = [];
  const foundPaths: string[][] = [];

  while (queue.length > 0) {
    const { nodeId, path, depth } = queue.shift()!;
    
    if (visited.has(nodeId) || depth > maxDepth) continue;
    visited.add(nodeId);

    // Check if we reached the target
    if (nodeId === endNodeId) {
      foundPaths.push(path);
      logger.debug('Path found', { depth, pathLength: path.length });
      continue;
    }

    // Get outgoing edges
    let edgeQuery = supabase
      .from('curriculum_edges')
      .select('*')
      .eq('source_node_id', nodeId);
    
    if (relationshipTypes && relationshipTypes.length > 0) {
      edgeQuery = edgeQuery.in('relationship_type', relationshipTypes);
    }

    const { data: edges } = await logger.measureRetrieval(
      `fetch-edges-from-${nodeId.substring(0, 8)}`,
      async () => edgeQuery
    );

    for (const edge of (edges || []) as any[]) {
      allEdges.push(mapEdge(edge));
      
      if (!visited.has(edge.target_node_id)) {
        queue.push({
          nodeId: edge.target_node_id,
          path: [...path, edge.target_node_id],
          depth: depth + 1
        });
      }
    }
  }

  // Fetch node data for all visited nodes
  if (visited.size > 0) {
    const { data: nodes } = await logger.measureRetrieval(
      'fetch-path-nodes',
      async () => supabase
        .from('curriculum_nodes')
        .select('*')
        .in('id', Array.from(visited))
    );
    
    for (const node of (nodes || []) as any[]) {
      allNodes.set(node.id, mapNode(node));
    }
  }

  logger.debug('Path search complete', { 
    nodesVisited: visited.size, 
    pathsFound: foundPaths.length 
  });

  return {
    nodes: Array.from(allNodes.values()),
    edges: allEdges,
    paths: foundPaths,
    statistics: {
      nodesVisited: visited.size,
      edgesTraversed: allEdges.length,
      maxDepthReached: maxDepth,
      executionTimeMs: 0
    }
  };
}

async function getPrerequisites(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  topicNodeId: string,
  maxDepth: number
): Promise<TraversalResult> {
  
  // Use the database function
  const { data: prereqData, error } = await logger.measureRetrieval(
    'rpc-get_prerequisites',
    async () => supabase.rpc('get_prerequisites', {
      topic_node_id: topicNodeId
    })
  );

  if (error) {
    logger.error('Prerequisites RPC error', { error: error.message });
    throw error;
  }

  const prereqResults = (prereqData || []) as any[];
  const nodeIds = prereqResults.map((r: any) => r.prerequisite_id);
  nodeIds.push(topicNodeId);

  logger.debug('Prerequisites found', { count: prereqResults.length });

  const { data: nodes } = await logger.measureRetrieval(
    'fetch-prerequisite-nodes',
    async () => supabase
      .from('curriculum_nodes')
      .select('*')
      .in('id', nodeIds.length > 0 ? nodeIds : ['00000000-0000-0000-0000-000000000000'])
  );

  const { data: edges } = await logger.measureRetrieval(
    'fetch-prerequisite-edges',
    async () => supabase
      .from('curriculum_edges')
      .select('*')
      .eq('relationship_type', 'prerequisite')
      .in('target_node_id', nodeIds)
  );

  return {
    nodes: ((nodes || []) as any[]).map(mapNode),
    edges: ((edges || []) as any[]).map(mapEdge),
    paths: [],
    statistics: {
      nodesVisited: nodes?.length || 0,
      edgesTraversed: edges?.length || 0,
      maxDepthReached: Math.max(...prereqResults.map((r: any) => r.depth as number), 0),
      executionTimeMs: 0
    }
  };
}

async function getDescendants(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  startNodeId: string,
  maxDepth: number,
  relationshipTypes?: RelationshipType[]
): Promise<TraversalResult> {
  return traverseGraph(supabase, logger, startNodeId, maxDepth, relationshipTypes || ['contains', 'extends'], 'bfs');
}

async function findRelatedNodes(
  supabase: any,
  logger: ReturnType<typeof createLogger>,
  curriculumSystem?: string,
  nodeType?: string,
  gradeLevel?: number,
  _maxResults: number = 50
): Promise<TraversalResult> {
  
  let query = supabase.from('curriculum_nodes').select('*');
  
  if (curriculumSystem) {
    query = query.eq('curriculum_system', curriculumSystem);
  }
  
  if (nodeType) {
    query = query.eq('node_type', nodeType);
  }
  
  if (gradeLevel) {
    query = query.lte('grade_level_min', gradeLevel).gte('grade_level_max', gradeLevel);
  }

  const { data: nodes } = await logger.measureRetrieval(
    'fetch-related-nodes',
    async () => query.limit(50)
  );

  const nodesArr = (nodes || []) as any[];
  const nodeIds = nodesArr.map((n: any) => n.id);

  logger.debug('Found related nodes', { count: nodesArr.length });

  const { data: edges } = nodeIds.length > 0 
    ? await logger.measureRetrieval(
        'fetch-related-edges',
        async () => supabase
          .from('curriculum_edges')
          .select('*')
          .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`)
      )
    : { data: [] };

  return {
    nodes: nodesArr.map(mapNode),
    edges: ((edges || []) as any[]).map(mapEdge),
    paths: [],
    statistics: {
      nodesVisited: nodes?.length || 0,
      edgesTraversed: edges?.length || 0,
      maxDepthReached: 1,
      executionTimeMs: 0
    }
  };
}

function mapNode(node: Record<string, unknown>): GraphNode {
  return {
    id: node.id as string,
    nodeType: node.node_type as string,
    name: node.name as string,
    description: node.description as string | null,
    gradeLevelMin: node.grade_level_min as number | null,
    gradeLevelMax: node.grade_level_max as number | null,
    curriculumSystem: node.curriculum_system as string | null,
    metadata: (node.metadata as Record<string, unknown>) || {}
  };
}

function mapEdge(edge: Record<string, unknown>): GraphEdge {
  return {
    id: edge.id as string,
    sourceNodeId: edge.source_node_id as string,
    targetNodeId: edge.target_node_id as string,
    relationshipType: edge.relationship_type as RelationshipType,
    weight: edge.weight as number,
    metadata: (edge.metadata as Record<string, unknown>) || {}
  };
}
