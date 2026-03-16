import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Route } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PathAnalyticsDashboardProps {
  className?: string;
}

interface NodeFrequency {
  node_id: string;
  count: number;
}

export function PathAnalyticsDashboard({ className }: PathAnalyticsDashboardProps) {
  const { organization } = useAuth();
  const [nodeFreqs, setNodeFreqs] = useState<NodeFrequency[]>([]);

  useEffect(() => {
    if (!organization?.id) return;

    const fetchPaths = async () => {
      // Get call_session_events aggregated by node_id through call_sessions
      const { data: events } = await supabase
        .from("call_session_events")
        .select("node_id, call_session_id")
        .not("node_id", "is", null)
        .limit(1000);

      if (!events) return;

      const counts: Record<string, number> = {};
      events.forEach(e => {
        if (e.node_id) {
          counts[e.node_id] = (counts[e.node_id] || 0) + 1;
        }
      });

      const freqs = Object.entries(counts)
        .map(([node_id, count]) => ({ node_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      setNodeFreqs(freqs);
    };

    fetchPaths();
  }, [organization?.id]);

  const chartData = useMemo(() => {
    return nodeFreqs.map(f => ({
      name: f.node_id.length > 16 ? f.node_id.slice(0, 14) + "…" : f.node_id,
      visits: f.count,
    }));
  }, [nodeFreqs]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4" /> Script Path Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No path data available. Events are recorded as agents navigate script nodes during calls.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
