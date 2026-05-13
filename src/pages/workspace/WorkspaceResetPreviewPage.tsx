import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionBanner } from "@/components/ui/action-banner";
import {
  ArrowLeft,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

type ResetCount = { scanned: number; deleted: number };
type ResetResult = {
  audit_id: string;
  workspace_id: string;
  organization_id: string;
  heuristic: string;
  predicate: string;
  counts: {
    tenants: ResetCount;
    campaigns: ResetCount;
    guides: ResetCount;
    forms: ResetCount;
    templates: ResetCount;
  };
};

const TABLE_LABELS: Array<{ key: keyof PreviewResult & keyof ResetResult["counts"]; label: string }> = [
  { key: "tenants", label: "Clients (tenants)" },
  { key: "campaigns", label: "Campaigns" },
  { key: "guides", label: "Guides" },
  { key: "forms", label: "Forms" },
  { key: "templates", label: "Templates" },
];

export default function WorkspaceResetPreviewPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspace } = useWorkspace();
  const { workspaceRole } = useAuth();
  const queryClient = useQueryClient();

  const [confirmText, setConfirmText] = useState("");
  const [phase, setPhase] = useState<"preview" | "confirm" | "result">("preview");
  const [result, setResult] = useState<ResetResult | null>(null);

  const canDestroy = workspaceRole === "owner" || workspaceRole === "admin";

  const { data: preview, isLoading, error, refetch } = useQuery({
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

  const totalCandidates = useMemo(() => {
    if (!preview) return 0;
    return (
      preview.tenants.count +
      preview.campaigns.count +
      preview.guides.count +
      preview.forms.count +
      preview.templates.count
    );
  }, [preview]);

  const expectedToken = (workspace?.name ?? "").trim().toLowerCase();
  const tokenMatches = confirmText.trim().toLowerCase() === expectedToken && expectedToken.length > 0;

  const reset = useMutation({
    mutationFn: async (): Promise<ResetResult> => {
      if (!workspace) throw new Error("no workspace");
      const { data, error } = await supabase.rpc("reset_workspace_demo_data", {
        _workspace_id: workspace.id,
        _confirm_token: confirmText,
      });
      if (error) throw error;
      return data as unknown as ResetResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setPhase("result");
      const totalDeleted = Object.values(data.counts).reduce((s, c) => s + c.deleted, 0);
      toast.success(`Cleanup complete — ${totalDeleted} row${totalDeleted === 1 ? "" : "s"} deleted`);
      // Invalidate workspace surfaces so they refresh.
      void queryClient.invalidateQueries({ queryKey: ["workspace-campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-guides"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-forms"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-clients"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-demo-preview"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Cleanup failed");
    },
  });

  if (!workspace) {
    return (
      <div className="max-w-3xl space-y-4">
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/app/workspaces/${workspaceId}/home`}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to workspace
        </Link>
      </Button>

      <div className="space-y-1">
        <Badge variant="outline" className="border-destructive/40 text-destructive">
          Destructive · org owners and admins only
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Clean up junk data</h1>
        <p className="text-sm text-muted-foreground">
          Deletes rows in this workspace's organization whose name matches a strict junk/test/demo heuristic.
          This action is permanent. Real client/campaign/guide rows are not affected.
        </p>
      </div>

      <ActionBanner
        icon={ShieldAlert}
        variant="warning"
        title="Strictly heuristic-scoped"
        description="Only rows whose name contains test, demo, sandbox, please_ignore, or starts with old_ are deleted. Tenants delete cascades to children via existing FK chains; tenants matched here are obviously junk by name only."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Scanning…</p>
      ) : error ? (
        <Card><CardContent className="pt-6 text-sm text-destructive">{(error as Error).message}</CardContent></Card>
      ) : !preview ? null : (
        <>
          <Card>
            <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Heuristic</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground"><code>{preview.heuristic}</code></CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {TABLE_LABELS.map(({ key, label }) => {
              const row = preview[key];
              const deleted = result?.counts[key]?.deleted;
              return (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold tabular-nums">{row.count}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {phase === "result" && typeof deleted === "number"
                        ? `${deleted} deleted`
                        : "candidate rows"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {preview.tenants.sample && preview.tenants.sample.length > 0 && phase !== "result" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sample of clients to be deleted (up to 25)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 font-mono">
                  {preview.tenants.sample.map((t) => (
                    <li key={t.id} className="text-muted-foreground">{t.name}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {phase === "preview" && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm">
                    <div className="font-medium">{totalCandidates} candidate row{totalCandidates === 1 ? "" : "s"}</div>
                    <div className="text-xs text-muted-foreground">
                      {canDestroy
                        ? "You can proceed to typed confirmation."
                        : "Only org owners and admins can delete."}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!canDestroy || totalCandidates === 0}
                    onClick={() => setPhase("confirm")}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete junk data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {phase === "confirm" && (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Confirm destructive cleanup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This deletes {totalCandidates} row{totalCandidates === 1 ? "" : "s"} matching the heuristic across clients,
                  campaigns, guides, forms, and templates in <strong className="text-foreground">{workspace.name}</strong>'s
                  organization. Deletion is logged to <code className="text-xs">canonical_cleanup_audit</code>.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="confirm-token">
                    Type the workspace name <strong className="font-mono">{workspace.name}</strong> to enable deletion
                  </Label>
                  <Input
                    id="confirm-token"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={workspace.name}
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setConfirmText("");
                      setPhase("preview");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!tokenMatches || reset.isPending}
                    onClick={() => reset.mutate()}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    {reset.isPending ? "Deleting…" : `Delete ${totalCandidates} row${totalCandidates === 1 ? "" : "s"}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {phase === "result" && result && (
            <Card className="border-emerald-500/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Cleanup complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Audit row{" "}
                  <code className="text-xs">{result.audit_id}</code>{" "}
                  written. The per-table cards above show deleted counts.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConfirmText("");
                      setResult(null);
                      setPhase("preview");
                      void refetch();
                    }}
                  >
                    Run another scan
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/app/workspaces/${workspaceId}/home`}>Back to workspace</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
