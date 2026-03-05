import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, CheckCircle2, AlertCircle } from "lucide-react";

interface SubjectAnalysis {
  subject: string;
  topicsCovered: number;
  totalTopics: number;
  alignmentLevel: "strong" | "moderate" | "high_gap";
  keyGaps: string[];
}

interface AnalysisData {
  overallAlignment: {
    percentage: number;
    subjectsNeedingBridge: string[];
    estimatedDuration: string;
  };
  subjectAnalysis: SubjectAnalysis[];
  criticalGaps: string[];
}

interface ReportComparisonProps {
  previousAnalysis: AnalysisData;
  currentAnalysis: AnalysisData;
  previousDate: string;
}

const ReportComparison = ({ previousAnalysis, currentAnalysis, previousDate }: ReportComparisonProps) => {
  // Build maps for subject alignment %
  const prevSubjectMap = new Map<string, SubjectAnalysis>();
  previousAnalysis.subjectAnalysis?.forEach(s => prevSubjectMap.set(s.subject, s));

  const currSubjectMap = new Map<string, SubjectAnalysis>();
  currentAnalysis.subjectAnalysis?.forEach(s => currSubjectMap.set(s.subject, s));

  // All subjects from both reports
  const allSubjects = Array.from(new Set([
    ...(previousAnalysis.subjectAnalysis?.map(s => s.subject) || []),
    ...(currentAnalysis.subjectAnalysis?.map(s => s.subject) || []),
  ]));

  // Gaps analysis
  const prevGaps = new Set(previousAnalysis.criticalGaps || []);
  const currGaps = new Set(currentAnalysis.criticalGaps || []);
  const closedGaps = [...prevGaps].filter(g => !currGaps.has(g));
  const newGaps = [...currGaps].filter(g => !prevGaps.has(g));

  const overallDelta = (currentAnalysis.overallAlignment?.percentage || 0) - (previousAnalysis.overallAlignment?.percentage || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Compare with Previous Report</h3>
        <Badge variant="outline" className="text-xs ml-auto">
          vs. {new Date(previousDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </Badge>
      </div>

      {/* Overall delta */}
      <Card className="border">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="font-medium">Overall Alignment Change</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {previousAnalysis.overallAlignment?.percentage || 0}% → {currentAnalysis.overallAlignment?.percentage || 0}%
            </span>
            <Badge className={overallDelta > 0
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : overallDelta < 0
                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                : "bg-muted text-muted-foreground"
            }>
              {overallDelta > 0 ? "+" : ""}{overallDelta}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Subject-by-subject table */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Subject Alignment Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Previous %</TableHead>
                <TableHead className="text-right">Current %</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allSubjects.map(subject => {
                const prev = prevSubjectMap.get(subject);
                const curr = currSubjectMap.get(subject);
                const prevPct = prev ? Math.round((prev.topicsCovered / Math.max(prev.totalTopics, 1)) * 100) : 0;
                const currPct = curr ? Math.round((curr.topicsCovered / Math.max(curr.totalTopics, 1)) * 100) : 0;
                const delta = currPct - prevPct;

                return (
                  <TableRow key={subject}>
                    <TableCell className="font-medium">{subject}</TableCell>
                    <TableCell className="text-right">{prevPct}%</TableCell>
                    <TableCell className="text-right">{currPct}%</TableCell>
                    <TableCell className="text-right">
                      <span className={delta > 0 ? "text-emerald-600 dark:text-emerald-400" : delta < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
                        {delta > 0 ? "+" : ""}{delta}%
                        {delta > 0 ? <TrendingUp className="inline h-3 w-3 ml-1" /> : delta < 0 ? <TrendingDown className="inline h-3 w-3 ml-1" /> : null}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Closed gaps */}
      {closedGaps.length > 0 && (
        <Card className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Gaps Closed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {closedGaps.map((gap, i) => (
                <li key={i} className="text-sm flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
                  <span className="mt-0.5">✓</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* New gaps */}
      {newGaps.length > 0 && (
        <Card className="border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              New Gaps Identified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {newGaps.map((gap, i) => (
                <li key={i} className="text-sm flex items-start gap-2 text-rose-700 dark:text-rose-400">
                  <span className="mt-0.5">•</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {closedGaps.length === 0 && newGaps.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">No change in critical gaps between reports.</p>
      )}
    </div>
  );
};

export default ReportComparison;
