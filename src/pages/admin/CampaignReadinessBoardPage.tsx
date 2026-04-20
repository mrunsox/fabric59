import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

const COLUMNS: Array<{ key: string; label: string; tone: string }> = [
  { key: "not_started", label: "Not started", tone: "bg-muted text-muted-foreground" },
  { key: "in_progress", label: "In progress", tone: "bg-primary/10 text-primary" },
  { key: "blocked", label: "Blocked", tone: "bg-destructive/10 text-destructive" },
  { key: "test_ready", label: "Test ready", tone: "bg-warning/10 text-warning" },
  { key: "ready", label: "Ready", tone: "bg-success/10 text-success" },
];

export default function CampaignReadinessBoardPage() {
  const { organization } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    (supabase as any)
      .from("v_campaign_readiness")
      .select("*")
      .eq("organization_id", organization.id)
      .then(({ data }: any) => {
        setRows(data || []);
        setLoading(false);
      });
  }, [organization]);

  const grouped: Record<string, any[]> = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
  for (const r of rows) {
    const key = r.status || "not_started";
    if (grouped[key]) grouped[key].push(r);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Readiness board"
        subtitle="Every campaign grouped by its current readiness status"
        icon={<ListChecks className="h-6 w-6 text-primary" />}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {COLUMNS.map((col) => (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge className={cn("text-xs", col.tone)}>{grouped[col.key].length}</Badge>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {grouped[col.key].length === 0 ? (
                  <div className="text-xs text-muted-foreground/60 italic px-3 py-6 text-center border border-dashed border-border rounded-lg">
                    None
                  </div>
                ) : (
                  grouped[col.key].map((r) => (
                    <Link
                      key={r.route_id}
                      to={`/admin/clients/${r.client_id}/five9-overlay/campaigns/${r.route_id}`}
                    >
                      <Card className="hover:border-primary/40 transition-colors">
                        <CardContent className="p-3 space-y-1.5">
                          <p className="text-sm font-medium truncate">{r.campaign_name || "Untitled"}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{r.five9_domain}</p>
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {r.domain_connected && <span className="text-[9px] uppercase tracking-wider text-success">Domain</span>}
                            {r.variable_group_assigned && <span className="text-[9px] uppercase tracking-wider text-success">Vars</span>}
                            {r.disposition_count > 0 && <span className="text-[9px] uppercase tracking-wider text-success">Disp</span>}
                            {r.provider_connected && <span className="text-[9px] uppercase tracking-wider text-success">Provider</span>}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
