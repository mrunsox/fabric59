import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save,
  Settings as SettingsIcon,
  Building2,
  Palette,
  CheckSquare,
  Users as UsersIcon,
  Brain,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { ConfigPage, type ConfigSection } from "@/components/workspace/page-types";
import { WorkspaceMembersSection } from "@/components/workspace/WorkspaceMembersSection";
import { WorkspaceSetupChecklist } from "@/components/workspace/WorkspaceSetupChecklist";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useActiveWorkspaceId } from "@/hooks/useActiveWorkspaceId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Phase 3 — Sectioned workspace settings shell.
 *
 * Sections: Workspace · Brand · Readiness · Members · Brain · Advanced.
 *
 * The Brain section is a *summary + deep link* to the canonical Brain
 * settings route at /w/:id/settings/brain — Settings does not own Brain
 * configuration. Section state lives in `?section=` so deep links work.
 */
export default function WorkspaceSettingsPage() {
  const { workspace } = useWorkspace();
  if (!workspace) return null;

  const sections: ConfigSection[] = [
    {
      key: "workspace",
      label: "Workspace",
      icon: <Building2 className="h-3.5 w-3.5" />,
      render: () => <WorkspaceSection />,
    },
    {
      key: "brand",
      label: "Brand",
      icon: <Palette className="h-3.5 w-3.5" />,
      render: () => <BrandSection />,
    },
    {
      key: "readiness",
      label: "Readiness",
      icon: <CheckSquare className="h-3.5 w-3.5" />,
      render: () => <ReadinessSection />,
    },
    {
      key: "members",
      label: "Members",
      icon: <UsersIcon className="h-3.5 w-3.5" />,
      render: () => <WorkspaceMembersSection />,
    },
    {
      key: "brain",
      label: "Brain",
      icon: <Brain className="h-3.5 w-3.5" />,
      render: () => <BrainSection />,
    },
    {
      key: "advanced",
      label: "Advanced",
      icon: <Wrench className="h-3.5 w-3.5" />,
      render: () => <AdvancedSection />,
    },
  ];

  return (
    <ConfigPage
      eyebrow="Workspace settings"
      title="Settings"
      lede="Workspace-local settings. Branding and billing are managed at the organization level."
      sections={sections}
    />
  );
}

function WorkspaceSection() {
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
    onError: (e) =>
      toast({ title: "Could not save", description: String(e), variant: "destructive" }),
  });

  if (!workspace) return null;
  const dirty = name.trim() !== workspace.name;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-medium">General</CardTitle>
        <Button
          size="sm"
          onClick={() => save.mutate()}
          disabled={!dirty || !name.trim() || save.isPending}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" /> Save
        </Button>
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
      </CardContent>
    </Card>
  );
}

function BrandSection() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Brand</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2">
        <p>
          Branding is managed at the organization level so it stays consistent
          across every workspace in the org.
        </p>
        <Button asChild size="sm" variant="outline">
          <a href="/admin/settings">
            Open organization branding <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function ReadinessSection() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        The workspace setup checklist. Each step deep-links into the surface
        that owns it.
      </p>
      <WorkspaceSetupChecklist variant="panel" />
    </div>
  );
}

function BrainSection() {
  const workspaceId = useActiveWorkspaceId();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Business Brain</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-3">
        <p>
          Brain configuration — knowledge sources, assistant flags, and
          governance — is managed on its own canonical page so the settings
          and Brain surfaces don't blur into mixed ownership.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to={`/w/${workspaceId}/settings/brain`}>
            Open Brain settings <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function AdvancedSection() {
  const { workspace } = useWorkspace();
  if (!workspace) return null;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Identifiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-1.5 max-w-md">
            <Label className="text-xs">Workspace ID</Label>
            <code className="text-xs px-2.5 py-2 rounded border bg-muted/30 text-muted-foreground select-all">
              {workspace.id}
            </code>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Looking for something else?</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>
            Billing and branding are managed at the organization level under{" "}
            <a href="/admin/settings" className="text-primary hover:underline">
              organization settings
            </a>.
          </p>
          <p>
            Integration credentials live under this workspace's{" "}
            <a href="integrations" className="text-primary hover:underline">Integrations</a>{" "}
            tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
