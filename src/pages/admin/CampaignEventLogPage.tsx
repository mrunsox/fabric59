import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Activity, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const RANGES = [
  { key: "1h", label: "Last hour", ms: 60 * 60 * 1000 },
  { key: "24h", label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
];

export default function CampaignEventLogPage() {
  const { organization } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("24h");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!organization) return;
    setLoading(true);
    const r = RANGES.find((x) => x.key === range)!;
    const since = new Date(Date.now() - r.ms).toISOString();
    supabase
      .from("five9_event_log")
      .select("id, event_type, status, created_at, campaign_name, ani, dnis, error, five9_domain")
      .eq("organization_id", organization.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, [organization, range]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (campaignFilter && !(e.campaign_name || "").toLowerCase().includes(campaignFilter.toLowerCase())) return false;
      return true;
    });
  }, [events, statusFilter, campaignFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event log"
        subtitle="Every Five9 event ingested into Fabric59"
        icon={<Activity className="h-6 w-6 text-primary" />}
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 text-xs rounded-md border ${range === r.key ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {["all", "success", "failed", "pending"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs rounded-md border capitalize ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <Input
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            placeholder="Filter by campaign…"
            className="max-w-xs ml-auto"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No events match the current filters.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((e) => (
                <div key={e.id} className="grid grid-cols-12 items-center gap-3 p-3 text-sm hover:bg-muted/30">
                  <div className="col-span-2 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                  <div className="col-span-2 font-medium truncate">{e.event_type}</div>
                  <div className="col-span-3 text-xs text-muted-foreground truncate">{e.campaign_name || "—"}</div>
                  <div className="col-span-2 text-xs text-muted-foreground truncate">{e.ani || e.dnis || "—"}</div>
                  <div className="col-span-2 text-xs text-muted-foreground truncate">{e.five9_domain || "—"}</div>
                  <div className="col-span-1 text-right">
                    <Badge
                      variant="outline"
                      className={
                        e.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/30" :
                        e.status === "success" ? "bg-success/10 text-success border-success/30" :
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {e.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
