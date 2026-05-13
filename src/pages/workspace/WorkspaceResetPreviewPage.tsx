import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type PreviewRow = { count: number; sample?: Array<{ id: string; name: string }> };
type PreviewResult = {
  workspace_id: string;
  organization_id: string;
  heuristic: string;
  tenants: PreviewRow;
  campaigns: PreviewRow;
  guides: PreviewRow;
  forms: PreviewRow;
  templates: PreviewRow;
};

export default function WorkspaceResetPreviewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspace } = useWorkspace();
  const { data, isLoading, error } = useQuery({
    queryKey: ["workspace-demo-preview", workspace?.id],
    enabled: !!workspace,
    queryFn: async (): Promise<PreviewResult> => {
      const { data, error } = await supabase.rpc("preview_workspace_demo_data", {
        _workspace_id: workspace!.id,
      });
      if (error) throw error;
      return data as unknown as PreviewResult;
    },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/w/${workspaceId}/home`}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to workspace
        </Link>
      </Button>

      <div className="space-y-1">
        <Badge variant="outline" className="border-accent/40 text-accent">Admin · preview only</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Reset demo / test data</h1>
        <p className="text-sm text-muted-foreground">
          Read-only preview of rows that match the conservative demo heuristic in this workspace's organization.
          No data is deleted in this phase. The destructive action ships in G2 with typed confirmation.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Scanning…</p>
      ) : error ? (
        <Card><CardContent className="pt-6 text-sm text-destructive">{(error as Error).message}</CardContent></Card>
      ) : !data ? null : (
        <>
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Heuristic</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground"><code>{data.heuristic}</code></CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["Tenants (clients)", data.tenants],
              ["Campaigns", data.campaigns],
              ["Guides", data.guides],
              ["Forms", data.forms],
              ["Templates", data.templates],
            ] as const).map(([label, row]) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tabular-nums">{row.count}</div>
                  <p className="text-xs text-muted-foreground mt-1">candidate rows</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.tenants.sample && data.tenants.sample.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tenant sample (up to 25)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 font-mono">
                  {data.tenants.sample.map((t) => (
                    <li key={t.id} className="text-muted-foreground">{t.name}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className="border-dashed">
            <CardContent className="pt-6 text-xs text-muted-foreground">
              <strong className="text-foreground">G2 (next):</strong> destructive reset action with typed
              workspace-name confirmation, scoped strictly to this workspace's organization, returning
              deleted counts per table. Real-looking client rows will not be deleted by heuristic alone.
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
