import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, GitCompareArrows } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StandardMatch {
  sourceId: string;
  sourceCode: string;
  sourceName: string;
  targetId: string;
  targetCode: string;
  targetName: string;
  targetCurriculum: string;
  matchScore: number;
  matchType: "exact" | "equivalent" | "partial" | "related";
  confidence: number;
  alignmentNotes: string[];
}

interface MatchingResult {
  query: { curriculum: string; code?: string; name?: string };
  matches: StandardMatch[];
  statistics: {
    totalCandidates: number;
    matchesFound: number;
    averageScore: number;
    executionTimeMs: number;
  };
}

const matchTypeBadgeStyles: Record<string, string> = {
  exact: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300",
  equivalent: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300",
  partial: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
  related: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/30 dark:text-slate-300",
};

const scoreBarColor = (score: number) => {
  if (score >= 0.8) return "bg-emerald-500";
  if (score >= 0.6) return "bg-blue-500";
  if (score >= 0.4) return "bg-amber-500";
  return "bg-slate-400";
};

const CurriculumComparison = () => {
  const [sourceCode, setSourceCode] = useState("");
  const [sourceCurriculum, setSourceCurriculum] = useState("common_core");
  const [targetCurriculum, setTargetCurriculum] = useState("cbse");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchingResult | null>(null);

  const handleSearch = async () => {
    if (!sourceCode.trim()) {
      toast.error("Please enter a standard code or topic name");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("standards-matching", {
        body: {
          sourceStandard: {
            code: sourceCode.trim(),
            name: sourceCode.trim(),
            curriculum: sourceCurriculum,
          },
          targetStandards: [targetCurriculum],
          matchingMode: "fuzzy",
          threshold: 0.3,
        },
      });

      if (error) throw error;

      if (data?.success && data.data) {
        setResult(data.data);
        if (data.data.matches.length === 0) {
          toast.info("No matching standards found. Try a different search term.");
        }
      } else {
        throw new Error(data?.error || "Unexpected response");
      }
    } catch (err: any) {
      console.error("Standards matching error:", err);
      toast.error("Could not fetch curriculum matches. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-0 shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5 text-primary" />
          Curriculum Standards Comparison
        </CardTitle>
        <CardDescription>
          Search for a standard or topic to see how it aligns across curricula
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Controls */}
        <div className="grid sm:grid-cols-4 gap-4 items-end">
          <div className="sm:col-span-1">
            <Label htmlFor="source-curriculum">Source</Label>
            <Select value={sourceCurriculum} onValueChange={setSourceCurriculum}>
              <SelectTrigger id="source-curriculum">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="common_core">US Common Core</SelectItem>
                <SelectItem value="ib">IB</SelectItem>
                <SelectItem value="igcse">IGCSE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1">
            <Label htmlFor="target-curriculum">Target</Label>
            <Select value={targetCurriculum} onValueChange={setTargetCurriculum}>
              <SelectTrigger id="target-curriculum">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cbse">CBSE</SelectItem>
                <SelectItem value="icse">ICSE</SelectItem>
                <SelectItem value="ib">IB</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1">
            <Label htmlFor="standard-code">Standard / Topic</Label>
            <Input
              id="standard-code"
              placeholder="e.g. Algebra, CCSS.MATH.8"
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} className="sm:col-span-1">
            <Search className="h-4 w-4 mr-2" />
            {loading ? "Searching…" : "Compare"}
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {/* Results Table */}
        {result && result.matches.length > 0 && (
          <>
            <div className="text-sm text-muted-foreground">
              {result.statistics.matchesFound} match{result.statistics.matchesFound !== 1 ? "es" : ""} found
              from {result.statistics.totalCandidates} candidates
              {" · "}Avg score: {Math.round(result.statistics.averageScore * 100)}%
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Standard</TableHead>
                    <TableHead>Best Match</TableHead>
                    <TableHead className="w-[180px]">Score</TableHead>
                    <TableHead className="w-[110px]">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.matches.map((m, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {m.sourceName}
                        {m.sourceCode && (
                          <span className="block text-xs text-muted-foreground">{m.sourceCode}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.targetName}
                        {m.targetCode && (
                          <span className="block text-xs text-muted-foreground">
                            {m.targetCode} · {m.targetCurriculum}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${scoreBarColor(m.matchScore)}`}
                              style={{ width: `${Math.round(m.matchScore * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-10 text-right">
                            {Math.round(m.matchScore * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={matchTypeBadgeStyles[m.matchType] || ""}
                        >
                          {m.matchType}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {result && result.matches.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-6">
            No matching standards found for this search. Try a broader topic name.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CurriculumComparison;
