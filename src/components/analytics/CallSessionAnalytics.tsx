import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Phone, TrendingUp } from "lucide-react";
import { useScriptSessions } from "@/hooks/useScriptSessions";

interface CallSessionAnalyticsProps {
  className?: string;
}

export function CallSessionAnalytics({ className }: CallSessionAnalyticsProps) {
  const { data: sessions = [] } = useScriptSessions(200);

  const hourlyData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todaySessions = sessions.filter(s => s.started_at.slice(0, 10) === today);
    return Array.from({ length: 12 }, (_, i) => {
      const hour = 8 + i;
      const count = todaySessions.filter(s => new Date(s.started_at).getHours() === hour).length;
      return { hour: `${hour}:00`, calls: count };
    });
  }, [sessions]);

  const ahtTrend = useMemo(() => {
    const days = new Map<string, { total: number; count: number }>();
    sessions.forEach(s => {
      if (!s.duration_seconds) return;
      const day = s.started_at.slice(0, 10);
      const cur = days.get(day) || { total: 0, count: 0 };
      cur.total += s.duration_seconds;
      cur.count++;
      days.set(day, cur);
    });
    return Array.from(days.entries())
      .map(([date, v]) => ({ date: date.slice(5), aht: Math.round(v.total / v.count) }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [sessions]);

  const todayTotal = hourlyData.reduce((s, d) => s + d.calls, 0);
  const avgAht = ahtTrend.length > 0
    ? Math.round(ahtTrend.reduce((s, d) => s + d.aht, 0) / ahtTrend.length)
    : 0;

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className || ""}`}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" /> Call Volume Today
            <span className="ml-auto text-lg font-bold">{todayTotal}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Avg Handle Time Trend
            <span className="ml-auto text-lg font-bold font-mono">
              {avgAht > 0 ? `${Math.floor(avgAht / 60)}:${(avgAht % 60).toString().padStart(2, "0")}` : "—"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={ahtTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.floor(v / 60)}m`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: number) => [`${Math.floor(v / 60)}:${(v % 60).toString().padStart(2, "0")}`, "AHT"]}
              />
              <Line type="monotone" dataKey="aht" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
