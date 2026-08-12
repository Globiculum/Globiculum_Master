import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Network, X, BookOpen, ArrowRight, Loader2, GitBranch, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";

// ── Types ────────────────────────────────────────────────────────────

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
  relationshipType: string;
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

type MasteryStatus = "mastered" | "in-progress" | "gap";

interface SimNode extends SimulationNodeDatum {
  id: string;
  label: string;
  mastery: MasteryStatus;
  nodeType: string;
  description: string | null;
  curriculumSystem: string | null;
  metadata: Record<string, unknown>;
  radius: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  id: string;
  type: string;
}

// ── Props ────────────────────────────────────────────────────────────

interface KnowledgeGraphViewProps {
  gradeLevel: number;
  targetCurriculum: string;
  gapTopics?: string[];
  masteredTopics?: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────

const masteryColor: Record<MasteryStatus, string> = {
  mastered: "hsl(142, 71%, 45%)",   // green-500
  "in-progress": "hsl(45, 93%, 47%)", // amber-500
  gap: "hsl(0, 84%, 60%)",           // red-500
};

const masteryLabel: Record<MasteryStatus, string> = {
  mastered: "Mastered",
  "in-progress": "In Progress",
  gap: "Gap",
};

function classifyMastery(
  node: GraphNode,
  gaps: Set<string>,
  mastered: Set<string>
): MasteryStatus {
  const lower = node.name.toLowerCase();
  if ([...gaps].some((g) => lower.includes(g.toLowerCase()))) return "gap";
  if ([...mastered].some((m) => lower.includes(m.toLowerCase()))) return "mastered";
  return "in-progress";
}

// ── Component ────────────────────────────────────────────────────────

const KnowledgeGraphView = ({
  gradeLevel,
  targetCurriculum,
  gapTopics = [],
  masteredTopics = [],
}: KnowledgeGraphViewProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [prerequisites, setPrerequisites] = useState<GraphNode[]>([]);
  const [prereqLoading, setPrereqLoading] = useState(false);
  const [dimensions] = useState({ width: 800, height: 500 });

  const gapSet = useRef(new Set(gapTopics));
  const masteredSet = useRef(new Set(masteredTopics));

  // Keep sets in sync
  useEffect(() => {
    gapSet.current = new Set(gapTopics);
    masteredSet.current = new Set(masteredTopics);
  }, [gapTopics, masteredTopics]);

  // ── Fetch graph data ─────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const fetchGraph = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("knowledge-graph", {
          body: {
            operation: "find-related",
            curriculumSystem: targetCurriculum,
            gradeLevel,
            maxDepth: 3,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Graph fetch failed");

        const result: TraversalResult = data.data;
        if (cancelled) return;

        // Build simulation data
        const nodeMap = new Map<string, SimNode>();
        result.nodes.forEach((n) => {
          nodeMap.set(n.id, {
            id: n.id,
            label: n.name,
            mastery: classifyMastery(n, gapSet.current, masteredSet.current),
            nodeType: n.nodeType,
            description: n.description,
            curriculumSystem: n.curriculumSystem,
            metadata: n.metadata,
            radius: n.nodeType === "subject" ? 24 : n.nodeType === "unit" ? 18 : 14,
          });
        });

        const links: SimLink[] = result.edges
          .filter((e) => nodeMap.has(e.sourceNodeId) && nodeMap.has(e.targetNodeId))
          .map((e) => ({
            id: e.id,
            source: e.sourceNodeId,
            target: e.targetNodeId,
            type: e.relationshipType,
          }));

        const nodes = Array.from(nodeMap.values());

        // Run simulation
        runSimulation(nodes, links);
      } catch (err: any) {
        console.error("[KnowledgeGraphView] Error:", err);
        toast.error("Could not load curriculum graph.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchGraph();
    return () => { cancelled = true; };
  }, [gradeLevel, targetCurriculum]);

  // ── D3 force simulation ──────────────────────────────────────────

  const runSimulation = useCallback(
    (nodes: SimNode[], links: SimLink[]) => {
      const sim = forceSimulation<SimNode>(nodes)
        .force(
          "link",
          forceLink<SimNode, SimLink>(links)
            .id((d) => d.id)
            .distance(80)
        )
        .force("charge", forceManyBody().strength(-200))
        .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2))
        .force("collide", forceCollide<SimNode>().radius((d) => d.radius + 8));

      sim.on("end", () => {
        // Clamp inside bounds
        nodes.forEach((n) => {
          n.x = Math.max(n.radius, Math.min(dimensions.width - n.radius, n.x ?? 0));
          n.y = Math.max(n.radius, Math.min(dimensions.height - n.radius, n.y ?? 0));
        });
        setSimNodes([...nodes]);
        setSimLinks([...links]);
      });

      // Fast-forward ticks for instant layout
      sim.tick(200);
      sim.stop();
      nodes.forEach((n) => {
        n.x = Math.max(n.radius, Math.min(dimensions.width - n.radius, n.x ?? 0));
        n.y = Math.max(n.radius, Math.min(dimensions.height - n.radius, n.y ?? 0));
      });
      setSimNodes([...nodes]);
      setSimLinks([...links]);
    },
    [dimensions]
  );

  // ── Node click → side panel ──────────────────────────────────────

  const handleNodeClick = async (node: SimNode) => {
    setSelectedNode(node);
    setPrerequisites([]);
    setPrereqLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("knowledge-graph", {
        body: {
          operation: "get-prerequisites",
          startNodeId: node.id,
          maxDepth: 3,
        },
      });

      if (!error && data?.success) {
        const prereqNodes: GraphNode[] = (data.data.nodes as GraphNode[]).filter(
          (n: GraphNode) => n.id !== node.id
        );
        setPrerequisites(prereqNodes);
      }
    } catch {
      // silently fail for prereqs
    } finally {
      setPrereqLoading(false);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────

  const resolveCoord = (val: string | number | SimNode | undefined, axis: "x" | "y"): number => {
    if (typeof val === "number") return val;
    if (typeof val === "object" && val !== null) return (val as any)[axis] ?? 0;
    return 0;
  };

  // ── JSX ──────────────────────────────────────────────────────────

  return (
    <>
      <Card className="shadow-medium border-0 bg-gradient-card hover:shadow-strong transition-all col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Curriculum Knowledge Graph</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {(["mastered", "in-progress", "gap"] as MasteryStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: masteryColor[s] }}
                  />
                  {masteryLabel[s]}
                </div>
              ))}
            </div>
          </div>
          <CardDescription>
            Interactive map of curriculum topics for {targetCurriculum.toUpperCase()} · Grade {gradeLevel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : simNodes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No curriculum nodes found for this grade and curriculum.</p>
            </div>
          ) : (
            <div className="relative rounded-lg border bg-muted/20 overflow-hidden">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                className="w-full"
                style={{ maxHeight: 500 }}
              >
                {/* Edges */}
                {simLinks.map((link) => {
                  const sx = resolveCoord(link.source, "x");
                  const sy = resolveCoord(link.source, "y");
                  const tx = resolveCoord(link.target, "x");
                  const ty = resolveCoord(link.target, "y");
                  return (
                    <line
                      key={link.id}
                      x1={sx}
                      y1={sy}
                      x2={tx}
                      y2={ty}
                      stroke="hsl(var(--border))"
                      strokeWidth={1.5}
                      strokeOpacity={0.5}
                    />
                  );
                })}

                {/* Nodes */}
                {simNodes.map((node) => (
                  <g
                    key={node.id}
                    transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
                    onClick={() => handleNodeClick(node)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleNodeClick(node);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.label}, mastery: ${node.mastery}`}
                    className="cursor-pointer focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                  >
                    <circle
                      r={node.radius}
                      fill={masteryColor[node.mastery]}
                      fillOpacity={0.85}
                      stroke={selectedNode?.id === node.id ? "hsl(var(--primary))" : "white"}
                      strokeWidth={selectedNode?.id === node.id ? 3 : 1.5}
                    />
                    <text
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize={node.radius > 18 ? 9 : 7}
                      fill="white"
                      fontWeight={600}
                      pointerEvents="none"
                      className="select-none"
                    >
                      {node.label.length > 14 ? node.label.slice(0, 12) + "…" : node.label}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Stats */}
              <div className="absolute bottom-2 left-2 flex gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {simNodes.length} nodes
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {simLinks.length} edges
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Side Panel ─────────────────────────────────────────────── */}
      <Sheet open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <SheetContent className="w-[400px] sm:w-[440px]">
          {selectedNode && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: masteryColor[selectedNode.mastery] }}
                  />
                  <SheetTitle className="text-lg">{selectedNode.label}</SheetTitle>
                </div>
                <SheetDescription>
                  {selectedNode.curriculumSystem?.toUpperCase() || "—"} · {selectedNode.nodeType}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="mt-6 h-[calc(100vh-180px)]">
                <div className="space-y-6 pr-4">
                  {/* Status */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Mastery Status</h4>
                    <Badge
                      className="text-xs"
                      style={{
                        backgroundColor: masteryColor[selectedNode.mastery] + "22",
                        color: masteryColor[selectedNode.mastery],
                        borderColor: masteryColor[selectedNode.mastery],
                      }}
                      variant="outline"
                    >
                      {masteryLabel[selectedNode.mastery]}
                    </Badge>
                  </div>

                  {/* Description */}
                  {selectedNode.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Description</h4>
                      <p className="text-sm">{selectedNode.description}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Prerequisites */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <GitBranch className="h-4 w-4" />
                      Prerequisites
                    </h4>
                    {prereqLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-3/4" />
                      </div>
                    ) : prerequisites.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No prerequisites found.</p>
                    ) : (
                      <ul className="space-y-2">
                        {prerequisites.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/40"
                          >
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{p.name}</span>
                            <Badge variant="secondary" className="ml-auto text-[10px]">
                              {p.nodeType}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Separator />

                  {/* Learning Resources link */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      Learning Resources
                    </h4>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a
                        href={`/begin-journey?topic=${encodeURIComponent(selectedNode.label)}`}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Find Resources for "{selectedNode.label}"
                      </a>
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default KnowledgeGraphView;
