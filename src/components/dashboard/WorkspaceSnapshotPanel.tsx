import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Layers, ArrowRight, Star } from "lucide-react";

interface WorkspaceRow {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

interface Snapshot {
  total: number;
  defaultName: string | null;
  recent: WorkspaceRow[];
}

interface Props {
  organizationId?: string;
}

/**
 * Phase G — Org cockpit Workspace Snapshot.
 * Top-of-funnel summary of the org's workspaces with a canonical CTA into
 * /admin/workspaces. Read-only: counts + recent list, no inline mutations.
 */
export function WorkspaceSnapshotPanel({ organizationId }: Props) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, count } = await supabase
        .from("workspaces")
        .select("id, name, is_default, created_at", { count: "exact" })
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(4);
      if (cancelled) return;
      const rows = (data ?? []) as WorkspaceRow[];
      setSnap({
        total: count ?? rows.length,
        defaultName: rows.find((r) => r.is_default)?.name ?? null,
        recent: rows,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <Card data-testid="workspace-snapshot-panel">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Workspaces</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Operational scopes inside this organization
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/admin/workspaces">
            View workspaces <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !snap || snap.total === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center">
            <p className="text-sm text-foreground font-medium">No workspaces yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              A default workspace is created automatically with your organization.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Total workspaces" value={snap.total} />
              <Stat label="Default workspace" value={snap.defaultName ?? "—"} mono={false} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Recent
              </p>
              <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                {snap.recent.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between px-3 py-2.5 text-sm"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-foreground">{w.name}</span>
                      {w.is_default && (
                        <Star className="h-3 w-3 text-primary fill-primary/40 shrink-0" />
                      )}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(w.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, mono = true }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold text-foreground truncate ${
          mono ? "tabular-nums" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
