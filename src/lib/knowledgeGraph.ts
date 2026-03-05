import { supabase } from '@/integrations/supabase/client';

export type NodeType = 'curriculum' | 'subject' | 'topic' | 'learning_outcome' | 'skill' | 'standard';
export type RelationshipType = 'contains' | 'prerequisite' | 'related_to' | 'equivalent_to' | 'maps_to' | 'extends';
export type GapType = 'content' | 'depth' | 'timing' | 'approach' | 'none';

export interface CurriculumNode {
  id: string;
  node_type: NodeType;
  name: string;
  description: string | null;
  grade_level_min: number | null;
  grade_level_max: number | null;
  curriculum_system: string | null;
  metadata: Record<string, unknown>;
}

export interface CurriculumEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: RelationshipType;
  weight: number;
  metadata: Record<string, unknown>;
}

export interface CurriculumAlignment {
  id: string;
  source_curriculum: string;
  target_curriculum: string;
  source_node_id: string;
  target_node_id: string;
  alignment_score: number;
  gap_type: GapType | null;
  notes: string | null;
}

export interface TraversalResult {
  node_id: string;
  node_type: NodeType;
  name: string;
  depth: number;
  path: string[];
}

export interface GapAnalysisResult {
  source_topic: string;
  target_topic: string;
  alignment_score: number;
  gap_type: GapType | null;
  notes: string | null;
}

export interface PrerequisiteResult {
  prerequisite_id: string;
  prerequisite_name: string;
  prerequisite_type: NodeType;
  depth: number;
}

/**
 * Fetch all curriculum nodes for a specific curriculum system
 */
export async function getCurriculumNodes(
  curriculumSystem?: string,
  nodeType?: NodeType,
  gradeLevel?: number
): Promise<CurriculumNode[]> {
  let query = supabase.from('curriculum_nodes').select('*');

  if (curriculumSystem) {
    query = query.eq('curriculum_system', curriculumSystem);
  }

  if (nodeType) {
    query = query.eq('node_type', nodeType);
  }

  if (gradeLevel !== undefined) {
    query = query
      .lte('grade_level_min', gradeLevel)
      .gte('grade_level_max', gradeLevel);
  }

  const { data, error } = await query.order('name');

  if (error) {
    console.error('Error fetching curriculum nodes:', error);
    throw error;
  }

  return data as CurriculumNode[];
}

/**
 * Fetch edges (relationships) for a node
 */
export async function getNodeEdges(
  nodeId: string,
  direction: 'outgoing' | 'incoming' | 'both' = 'both'
): Promise<CurriculumEdge[]> {
  let query = supabase.from('curriculum_edges').select('*');

  if (direction === 'outgoing') {
    query = query.eq('source_node_id', nodeId);
  } else if (direction === 'incoming') {
    query = query.eq('target_node_id', nodeId);
  } else {
    query = query.or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching node edges:', error);
    throw error;
  }

  return data as CurriculumEdge[];
}

/**
 * Traverse the curriculum graph from a starting node using the database function
 */
export async function traverseGraph(
  startNodeId: string,
  maxDepth: number = 3,
  relationshipTypes?: RelationshipType[]
): Promise<TraversalResult[]> {
  const { data, error } = await supabase.rpc('traverse_curriculum_graph', {
    start_node_id: startNodeId,
    max_depth: maxDepth,
    relationship_types: relationshipTypes || null,
  });

  if (error) {
    console.error('Error traversing graph:', error);
    throw error;
  }

  return data as TraversalResult[];
}

/**
 * Find gaps between two curricula using the database function
 */
export async function findCurriculumGaps(
  sourceCurriculum: string,
  targetCurriculum: string,
  gradeLevel?: number
): Promise<GapAnalysisResult[]> {
  const { data, error } = await supabase.rpc('find_curriculum_gaps', {
    source_curriculum_param: sourceCurriculum,
    target_curriculum_param: targetCurriculum,
    grade_level: gradeLevel || null,
  });

  if (error) {
    console.error('Error finding curriculum gaps:', error);
    throw error;
  }

  return data as GapAnalysisResult[];
}

/**
 * Get prerequisites for a topic using the database function
 */
export async function getPrerequisites(topicNodeId: string): Promise<PrerequisiteResult[]> {
  const { data, error } = await supabase.rpc('get_prerequisites', {
    topic_node_id: topicNodeId,
  });

  if (error) {
    console.error('Error fetching prerequisites:', error);
    throw error;
  }

  return data as PrerequisiteResult[];
}

/**
 * Get alignment mappings between curricula
 */
export async function getCurriculumAlignments(
  sourceCurriculum?: string,
  targetCurriculum?: string
): Promise<CurriculumAlignment[]> {
  let query = supabase.from('curriculum_alignments').select('*');

  if (sourceCurriculum) {
    query = query.eq('source_curriculum', sourceCurriculum);
  }

  if (targetCurriculum) {
    query = query.eq('target_curriculum', targetCurriculum);
  }

  const { data, error } = await query.order('alignment_score', { ascending: true });

  if (error) {
    console.error('Error fetching curriculum alignments:', error);
    throw error;
  }

  return data as CurriculumAlignment[];
}

/**
 * Build a local graph representation for client-side operations
 */
export function buildLocalGraph(
  nodes: CurriculumNode[],
  edges: CurriculumEdge[]
): Map<string, { node: CurriculumNode; outgoing: CurriculumEdge[]; incoming: CurriculumEdge[] }> {
  const graph = new Map<string, { node: CurriculumNode; outgoing: CurriculumEdge[]; incoming: CurriculumEdge[] }>();

  // Initialize nodes
  nodes.forEach((node) => {
    graph.set(node.id, { node, outgoing: [], incoming: [] });
  });

  // Add edges
  edges.forEach((edge) => {
    const sourceEntry = graph.get(edge.source_node_id);
    const targetEntry = graph.get(edge.target_node_id);

    if (sourceEntry) {
      sourceEntry.outgoing.push(edge);
    }
    if (targetEntry) {
      targetEntry.incoming.push(edge);
    }
  });

  return graph;
}

/**
 * Find the shortest path between two nodes (client-side BFS)
 */
export function findShortestPath(
  graph: Map<string, { node: CurriculumNode; outgoing: CurriculumEdge[]; incoming: CurriculumEdge[] }>,
  startId: string,
  endId: string
): string[] | null {
  if (!graph.has(startId) || !graph.has(endId)) {
    return null;
  }

  const visited = new Set<string>();
  const queue: { nodeId: string; path: string[] }[] = [{ nodeId: startId, path: [startId] }];

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;

    if (nodeId === endId) {
      return path;
    }

    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);

    const entry = graph.get(nodeId);
    if (!entry) continue;

    for (const edge of entry.outgoing) {
      if (!visited.has(edge.target_node_id)) {
        queue.push({
          nodeId: edge.target_node_id,
          path: [...path, edge.target_node_id],
        });
      }
    }
  }

  return null;
}

/**
 * Calculate learning path complexity
 */
export function calculatePathComplexity(
  graph: Map<string, { node: CurriculumNode; outgoing: CurriculumEdge[]; incoming: CurriculumEdge[] }>,
  path: string[]
): number {
  let complexity = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const sourceEntry = graph.get(path[i]);
    if (!sourceEntry) continue;

    const edge = sourceEntry.outgoing.find((e) => e.target_node_id === path[i + 1]);
    if (edge) {
      complexity += edge.weight;
    } else {
      complexity += 1; // Default weight if edge not found
    }
  }

  return complexity;
}
