import { useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { WorkspaceMembersSection } from "@/components/workspace/WorkspaceMembersSection";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Phase 4 — Canonical workspace settings.
 *
 * Workspace-scoped surface. Org-level settings (members, billing, branding)
 * live under /admin/settings. This page exposes only safe, workspace-local
 * controls; deeper feature settings stay close to their feature surfaces.
 */
export default function WorkspaceSettingsPage() {
  const { workspace, refetch } = useWorkspace();
  const qc = useQueryClient();
  const [name, setName] = useState(workspace?.name ?? "");

  useEffect(() => {
    if (workspace?.name) setName(workspace.name);
  }, [workspace?.name]);

  const save = useMutation({
    mutationFn: async () => {
      if (!workspace) return;
      const { error } = await supabase
        .from("workspaces")
        .update({ name: name.trim() })
        .eq("id", workspace.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "Workspace updated" });
      await qc.invalidateQueries({ queryKey: ["canonical-workspaces"] });
      refetch();
    },
    onError: (e) => toast({ title: "Could not save", description: String(e), variant: "destructive" }),
  });

  if (!workspace) return null;
  const dirty = name.trim() !== workspace.name;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Workspace settings"
        title="Settings"
        lede="Settings local to this workspace, including workspace members and roles. Billing and branding live under organization settings."
        action={
          <Button
            size="sm"
            onClick={() => save.mutate()}
            disabled={!dirty || !name.trim() || save.isPending}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" /> Save
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5 max-w-md">
            <Label htmlFor="ws-name" className="text-xs">Workspace name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace name"
            />
          </div>
          <div className="grid gap-1.5 max-w-md">
            <Label className="text-xs">Workspace ID</Label>
            <code className="text-xs px-2.5 py-2 rounded border bg-muted/30 text-muted-foreground select-all">
              {workspace.id}
            </code>
          </div>
        </CardContent>
      </Card>

      <WorkspaceMembersSection />

      <Card className="border-dashed">
        <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Looking for something else?</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Branding and billing are managed at the organization level under{" "}
          <a href="/admin/settings" className="text-primary hover:underline">organization settings</a>.
          Integration credentials live under this workspace's{" "}
          <a href="integrations" className="text-primary hover:underline">Integrations</a> tab.
        </CardContent>
      </Card>
    </div>
  );
}
