import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Phase 6 · Landing for /app/agent/workspace.
 *
 * Lists workspaces + campaigns the agent can pick a session for, then deep-links
 * into the canonical runner at /app/agent/workspace/:workspaceId/:campaignId.
 * In production Five9's dispatcher will preselect both via query params.
 */
export default function AgentWorkspaceLandingPage() {
  const { data: rows = [] } = useQuery({
    queryKey: ["agent-runner-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, workspace_id, workspaces(id, name)")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        workspace_id: string;
        workspaces: { id: string; name: string } | null;
      }>;
    },
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Live call runner</p>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Headphones className="h-5 w-5" /> Start a session
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick a workspace and campaign to open the runner. In production, Five9 preselects both.
          </p>
        </header>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground text-center">
              No campaigns available.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Available campaigns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-border p-2.5"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Workspace · {r.workspaces?.name ?? r.workspace_id}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link
                      to={`/app/agent/workspace/${r.workspace_id}/${r.id}`}
                      data-testid={`runner-pick-${r.id}`}
                    >
                      Open runner
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
