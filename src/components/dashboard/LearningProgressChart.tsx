import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line as LineRaw, XAxis as XAxisRaw, YAxis as YAxisRaw, CartesianGrid, ResponsiveContainer } from "recharts";
const XAxis = XAxisRaw as any;
const YAxis = YAxisRaw as any;
const Line = LineRaw as any;
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ReportDataPoint {
  date: string;
  alignment: number;
  label: string;
}

const chartConfig = {
  alignment: {
    label: "Alignment %",
    color: "hsl(var(--success))",
  },
};

const LearningProgressChart = () => {
  const [data, setData] = useState<ReportDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data: reports, error } = await supabase
        .from("saved_reports")
        .select("created_at, analysis_data")
        .eq("user_id", session.user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) { console.error(error); setLoading(false); return; }

      const points: ReportDataPoint[] = (reports ?? []).map((r) => {
        const analysis = r.analysis_data as any;
        const pct = analysis?.overallAlignment?.percentage ?? 0;
        return {
          date: r.created_at,
          alignment: pct,
          label: format(new Date(r.created_at), "MMM d"),
        };
      });

      setData(points);
      setLoading(false);
    };
    fetchReports();
  }, []);

  if (loading) {
    return (
      <Card className="shadow-medium border-0 bg-gradient-card col-span-full">
        <CardContent className="p-6 text-center text-muted-foreground">Loading progress…</CardContent>
      </Card>
    );
  }

  if (data.length < 2) return null;

  const latest = data[data.length - 1].alignment;
  const previous = data[data.length - 2].alignment;
  const diff = latest - previous;
  const improved = diff > 0;
  const same = diff === 0;

  return (
    <Card className="shadow-medium border-0 bg-gradient-card col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {improved ? (
              <TrendingUp className="h-6 w-6 text-success" />
            ) : same ? (
              <Minus className="h-6 w-6 text-muted-foreground" />
            ) : (
              <TrendingDown className="h-6 w-6 text-warning" />
            )}
            <CardTitle className="text-xl">Learning Progress</CardTitle>
          </div>
          <Badge
            variant="secondary"
            className={improved ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}
          >
            {improved ? `+${diff}%` : same ? "No change" : `${diff}%`}
          </Badge>
        </div>
        <CardDescription>
          {improved
            ? `Your alignment improved by ${diff}% since your last assessment — great work!`
            : "Keep going — consistency is key to a smooth transition."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
              tickFormatter={(v) => `${v}%`}
            />
            <ChartTooltip content={<ChartTooltipContent />} {...({} as any)} />
            <Line
              type="monotone"
              dataKey="alignment"
              stroke="hsl(var(--success))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--success))", r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }}
              activeDot={{ r: 7, fill: "hsl(var(--success))" }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default LearningProgressChart;
