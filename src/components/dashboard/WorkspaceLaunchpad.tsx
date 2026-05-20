import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Rocket,
  FileText,
  BookOpen,
  Megaphone,
  Headphones,
  ArrowRight,
  Layers,
} from "lucide-react";

interface WorkspaceRow {
  id: string;
  name: string;
  is_default: boolean;
}

interface Props {
  organizationId?: string | null;
}

/**
 * WorkspaceLaunchpad — surfaces the canonical product loop on /admin.
 *
 * Bridges the org cockpit into the workspace shell's Forms / Guides /
 * Campaigns / Agent Cockpit surfaces so admins land on the actual work
 * instead of stopping at org ops. Reuses the `lastWorkspaceId` localStorage
 * key consumed by `useActiveWorkspaceId` — no second source of truth.
 */
export function WorkspaceLaunchpad({ organizationId }: Props) {
  const { data: workspaces, isLoading } = useQuery({
    queryKey: ["launchpad-workspaces", organizationId ?? "none"],
    enabled: !!organizationId,
    queryFn: async (): Promise<WorkspaceRow[]> => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, is_default")
        .eq("organization_id", organizationId!)
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as WorkspaceRow[];
    },
  });

  const initial =
    (typeof window !== "undefined" && localStorage.getItem("lastWorkspaceId")) || null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!workspaces?.length) return;
    const resolved =
      (initial && workspaces.find((w) => w.id === initial)?.id) ||
      workspaces.find((w) => w.is_default)?.id ||
      workspaces[0]?.id ||
      null;
    setSelectedId(resolved);
  }, [workspaces, initial]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("lastWorkspaceId", id);
      } catch {
        // localStorage may be unavailable; non-fatal.
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <Card data-testid="workspace-launchpad" className="border-dashed">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <LaunchpadIcon />
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">Workspace launchpad</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a workspace to start building intake forms, guides, and campaigns.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/admin/workspaces">Create workspace</Link>
          </Button>
        </CardHeader>
      </Card>
    );
  }

  const current = workspaces.find((w) => w.id === selectedId) ?? workspaces[0];
  const base = `/w/${current.id}`;

  const surfaces: { key: string; label: string; to: string; icon: typeof FileText }[] = [
    { key: "forms", label: "Forms", to: `${base}/forms`, icon: FileText },
    { key: "guides", label: "Guides", to: `${base}/guides`, icon: BookOpen },
    { key: "campaigns", label: "Campaigns", to: `${base}/campaigns`, icon: Megaphone },
    // Canonical Agent Cockpit lives at /w/:workspaceId/agent (singular).
    { key: "agent", label: "Agent Cockpit", to: `${base}/agent`, icon: Headphones },
  ];

  return (
    <Card data-testid="workspace-launchpad">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <LaunchpadIcon />
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">Build your intake workflow</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jump into the workspace where forms, guides, campaigns, and the agent cockpit live.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {workspaces.length > 1 && (
            <Select value={current.id} onValueChange={handleSelect}>
              <SelectTrigger className="h-9 w-[200px]">
                <Layers className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <span className="truncate">
                      {w.name}
                      {w.is_default ? " · default" : ""}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button asChild size="sm" className="gap-1.5">
            <Link to={`${base}/home`}>
              Open workspace <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {surfaces.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.key}
                to={s.to}
                data-testid={`launchpad-link-${s.key}`}
                className="group flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 hover:border-primary/40 transition-colors"
              >
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span className="flex-1 truncate">{s.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function LaunchpadIcon() {
  return (
    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Rocket className="h-4 w-4 text-primary" />
    </div>
  );
}
