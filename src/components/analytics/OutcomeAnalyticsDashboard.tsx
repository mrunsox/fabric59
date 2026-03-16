import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Target } from "lucide-react";
import { useScriptSessions } from "@/hooks/useScriptSessions";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--warning))",
  "hsl(var(--destructive))", "hsl(var(--accent))",
];

interface OutcomeAnalyticsDashboardProps {
  className?: string;
}

export function OutcomeAnalyticsDashboard({ className }: OutcomeAnalyticsDashboardProps) {
  const { data: sessions = [] } = useScriptSessions(500);

  const dispStats = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => {
      const disp = s.disposition || "No Disposition";
      counts[disp] = (counts[disp] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sessions]);

  const total = dispStats.reduce((s, d) => s + d.value, 0);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className || ""}`}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" /> Disposition Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dispStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No disposition data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dispStats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {dispStats.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disposition Detail</CardTitle>
        </CardHeader>
        <CardContent>
          {dispStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Disposition</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispStats.slice(0, 10).map((d, i) => (
                  <TableRow key={d.name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {d.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{d.value}</TableCell>
                    <TableCell className="text-right font-mono">{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
