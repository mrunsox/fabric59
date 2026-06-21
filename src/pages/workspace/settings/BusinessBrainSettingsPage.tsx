/**
 * Business Brain — Settings page (Phase 8).
 *
 * Workspace-admin surface that wraps existing feature flags and vertical
 * profile assignment. Writes go to `organizations.integration_configs`
 * (`features.businessBrain.*`); reads use the existing flag resolver chain.
 *
 * Scope guard (Phase 8): per-row "effective state / source / editability"
 * are shown separately. Writes are limited to the org level here; partner
 * and client-level overrides remain authoritative when present (read-only
 * surface labels reflect that).
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BbPermissionDenied } from "@/components/business-brain/BbPermissionDenied";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BrainPageHeader } from "@/components/business-brain/ui/BrainPageHeader";
import { BrainPanel } from "@/components/business-brain/ui/BrainPanel";
import { BrainBadge } from "@/components/business-brain/ui/BrainBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import {
  getWorkspaceVerticalProfile,
  triggerVerticalEvaluation,
} from "@/lib/business-brain/bridge/governance";
import { Activity, AlertCircle, Loader2 } from "lucide-react";


type FlagKey =
  | "enabled"
  | "asc"
  | "assist"
  | "search"
  | "governance"
  | "gaps";

const FLAG_DEFS: Array<{
  key: FlagKey;
  path: string[]; // path into features.businessBrain.*
  label: string;
  description: string;
}> = [
  {
    key: "enabled",
    path: ["enabled"],
    label: "Business Brain core UI",
    description: "Sidebar entry and the /brain/** routes.",
  },
  {
    key: "asc",
    path: ["asc", "enabled"],
    label: "ASC advisory",
    description: "Phase 2 — suggestion trays inside ASC.",
  },
  {
    key: "assist",
    path: ["assist", "enabled"],
    label: "Live Assist",
    description: "Phase 4 — Knowledge Assist panel in the call runner.",
  },
  {
    key: "search",
    path: ["search", "enabled"],
    label: "Search & internal console",
    description: "Phase 3 — /brain/search tab.",
  },
  {
    key: "governance",
    path: ["governance", "enabled"],
    label: "Governance & gaps",
    description: "Phase 5/6 — staleness, conflicts, coverage.",
  },
  {
    key: "gaps",
    path: ["gaps", "enabled"],
    label: "Demand-driven gaps",
    description: "Phase 7 — missing-knowledge backlog from real usage.",
  },
];

type Source = "client" | "partner" | "org" | "default";

function readPath(obj: unknown, path: string[]): boolean | undefined {
  let cur: unknown = obj;
  for (const p of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "boolean" ? cur : undefined;
}

function resolveFlag(
  path: string[],
  org: Record<string, unknown> | null,
): { effective: boolean; source: Source } {
  // Phase 8 — workspace settings only writes at org level. Partner/client are
  // read but not editable here. (Higher-level overrides remain authoritative.)
  const features = (org?.features as Record<string, unknown> | undefined) ?? {};
  const bb = (features.businessBrain as Record<string, unknown> | undefined) ?? {};
  const v = readPath(bb, path);
  if (v === true) return { effective: true, source: "org" };
  if (v === false) return { effective: false, source: "org" };
  return { effective: false, source: "default" };
}

function setPath(
  obj: Record<string, unknown>,
  path: string[],
  value: boolean,
): Record<string, unknown> {
  const out = { ...obj };
  let cur: Record<string, unknown> = out;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    const next = { ...(cur[k] as Record<string, unknown> | undefined ?? {}) };
    cur[k] = next;
    cur = next;
  }
  cur[path[path.length - 1]] = value;
  return out;
}

export default function BusinessBrainSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { organization, isWorkspaceAdmin, workspaceRole } = useAuth();
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const [pendingToggle, setPendingToggle] = useState<{
    flag: FlagKey;
    next: boolean;
    factCount: number;
  } | null>(null);
  const [pendingVertical, setPendingVertical] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceId) {
      emitBbEvent("bb_settings_view_opened", {
        workspaceId,
        organizationId: organization?.id ?? null,
        actorRole: workspaceRole ?? undefined,
      });
    }
  }, [workspaceId, organization?.id, workspaceRole]);

  const orgConfigs = (organization?.integration_configs ?? {}) as Record<string, unknown>;

  // Approved fact count — used to gate the confirm dialog when disabling ASC/Assist.
  const factCountQ = useQuery({
    queryKey: ["bb-approved-fact-count", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<number> => {
      const { count } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_facts" as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId!)
        .eq("verification_state", "approved");
      return count ?? 0;
    },
  });

  const verticalProfileQ = useQuery({
    queryKey: ["bb-workspace-vertical-profile", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => getWorkspaceVerticalProfile(workspaceId!),
  });

  const profilesQ = useQuery({
    queryKey: ["bb-vertical-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_vertical_profiles" as any)
        .select("id,slug,label,description")
        .order("label", { ascending: true });
      return ((data ?? []) as unknown) as Array<{
        id: string;
        slug: string;
        label: string;
        description: string | null;
      }>;
    },
  });

  // Status summary — derived from existing telemetry, last 90d.
  const statusQ = useQuery({
    queryKey: ["bb-status-summary", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 86400_000).toISOString();
      const { data, error } = await supabase
        .from("platform_events")
        .select("event_type,payload,created_at")
        .eq("organization_id", organization!.id)
        .eq("source", "business-brain")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Array<{
        event_type: string;
        payload: Record<string, unknown> | null;
        created_at: string;
      }>;
    },
  });

  const flagMutation = useMutation({
    mutationFn: async ({ path, next }: { path: string[]; next: boolean }) => {
      if (!organization?.id) throw new Error("no_org");
      const cur = (organization.integration_configs ?? {}) as Record<string, unknown>;
      const features = { ...((cur.features as Record<string, unknown> | undefined) ?? {}) };
      const bb = { ...((features.businessBrain as Record<string, unknown> | undefined) ?? {}) };
      const updatedBb = setPath(bb, path, next);
      features.businessBrain = updatedBb;
      const updated = { ...cur, features };
      const { error } = await supabase
        .from("organizations")
        .update({ integration_configs: updated as never })
        .eq("id", organization.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
      toast({ title: "Setting updated" });
    },
    onError: () => toast({ title: "Could not update setting", variant: "destructive" }),
  });

  const verticalMutation = useMutation({
    mutationFn: async (verticalProfileId: string) => {
      if (!workspaceId) throw new Error("no_ws");
      const { error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_workspace_vertical_profiles" as any)
        .upsert(
          { workspace_id: workspaceId, client_id: null, vertical_profile_id: verticalProfileId },
          { onConflict: "workspace_id" },
        );
      if (error) throw error;
      await triggerVerticalEvaluation(workspaceId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bb-workspace-vertical-profile"] });
      toast({ title: "Vertical updated. Re-evaluating coverage…" });
    },
    onError: () => toast({ title: "Could not update vertical", variant: "destructive" }),
  });

  const resolved = useMemo(
    () => FLAG_DEFS.map((f) => ({ def: f, ...resolveFlag(f.path, orgConfigs) })),
    [orgConfigs],
  );

  if (!isWorkspaceAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <BrainPageHeader
          eyebrow="Workspace"
          title="Business Brain settings"
          subtitle="Workspace controls for the Business Brain."
        />
        <BbPermissionDenied
          resource="Brain settings"
          requiredRole="workspace admin or owner"
          action={
            <Button asChild size="sm" variant="outline">
              <Link to={`/w/${workspaceId}/brain`}>Back to Business Brain</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const onToggle = (flag: FlagKey, next: boolean) => {
    const factCount = factCountQ.data ?? 0;
    // Confirm before disabling ASC/Assist with facts present.
    if (!next && (flag === "asc" || flag === "assist") && factCount > 0) {
      setPendingToggle({ flag, next, factCount });
      return;
    }
    applyToggle(flag, next);
  };

  const applyToggle = (flag: FlagKey, next: boolean) => {
    const def = FLAG_DEFS.find((f) => f.key === flag);
    if (!def) return;
    const before = resolveFlag(def.path, orgConfigs).effective;
    flagMutation.mutate(
      { path: def.path, next },
      {
        onSuccess: () => {
          emitBbEvent("bb_settings_flag_changed", {
            workspaceId: workspaceId ?? null,
            organizationId: organization?.id ?? null,
            flag,
            from: before,
            to: next,
          });
        },
      },
    );
  };

  const verticalRows = profilesQ.data ?? [];
  const currentVertical = verticalProfileQ.data?.id ?? "";

  return (
    <div className="space-y-6 animate-fade-in">
      <BrainPageHeader
        eyebrow="Workspace"
        title="Business Brain settings"
        subtitle={`Manage Business Brain features for ${workspace?.name ?? "this workspace"}.`}
      />

      <BrainPanel
        toolbar={
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Feature flags</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Effective state, source, and editability shown separately. Writes here
              apply at the organization level; partner and client overrides remain
              authoritative when present.
            </p>
          </div>
        }
      >
        <div className="divide-y divide-bb-border-subtle -my-1">
          {resolved.map(({ def, effective, source }) => {
            const editable = source === "org" || source === "default";
            return (
              <div
                key={def.key}
                className="flex items-start justify-between gap-4 py-4 first:pt-1 last:pb-1"
              >
                <div className="space-y-1 min-w-0">
                  <Label className="text-sm font-medium text-foreground">{def.label}</Label>
                  <p className="text-xs text-muted-foreground">{def.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                    <BrainBadge tone={effective ? "ok" : "muted"}>
                      {effective ? "On" : "Off"}
                    </BrainBadge>
                    <BrainBadge tone="muted">
                      <span className="capitalize">Source: {source}</span>
                    </BrainBadge>
                    <BrainBadge tone={editable ? "info" : "warn"}>
                      {editable ? "Editable here" : "Read-only (override)"}
                    </BrainBadge>
                  </div>
                </div>
                <Switch
                  checked={effective}
                  disabled={!editable || flagMutation.isPending}
                  onCheckedChange={(v) => onToggle(def.key, v)}
                  aria-label={`Toggle ${def.label}`}
                />
              </div>
            );
          })}
        </div>
      </BrainPanel>

      <BrainPanel
        toolbar={
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Vertical profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drives coverage and gap evaluation. Changing the vertical will re-run
              the evaluation for this workspace.
            </p>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            value={currentVertical}
            onValueChange={(v) => setPendingVertical(v)}
            disabled={profilesQ.isLoading || verticalMutation.isPending}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select a vertical profile…" />
            </SelectTrigger>
            <SelectContent>
              {verticalRows.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {verticalProfileQ.data?.description && (
            <p className="text-xs text-muted-foreground">
              {verticalProfileQ.data.description}
            </p>
          )}
        </div>
      </BrainPanel>



      <StatusSummaryCard
        loading={statusQ.isLoading}
        error={statusQ.error ? String(statusQ.error) : null}
        events={statusQ.data ?? null}
      />

      <div>
        <Button variant="link" onClick={() => navigate(`/w/${workspaceId}/brain/health`)}>
          <Activity className="mr-2 h-4 w-4" />
          Open Brain health dashboard
        </Button>
      </div>

      <AlertDialog
        open={pendingToggle !== null}
        onOpenChange={(o) => !o && setPendingToggle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {pendingToggle?.flag}?</AlertDialogTitle>
            <AlertDialogDescription>
              This workspace has {pendingToggle?.factCount ?? 0} approved facts.
              Turning this off will hide Brain-powered suggestions but will not
              delete any facts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingToggle) applyToggle(pendingToggle.flag, pendingToggle.next);
                setPendingToggle(null);
              }}
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingVertical !== null}
        onOpenChange={(o) => !o && setPendingVertical(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change vertical?</AlertDialogTitle>
            <AlertDialogDescription>
              Coverage and gap evaluation will be re-run for this workspace.
              Existing approved facts are unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingVertical) verticalMutation.mutate(pendingVertical);
                setPendingVertical(null);
              }}
            >
              Change vertical
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusSummaryCard({
  loading,
  error,
  events,
}: {
  loading: boolean;
  error: string | null;
  events: Array<{ event_type: string; payload: Record<string, unknown> | null; created_at: string }> | null;
}) {
  type Row = { label: string; matchOk: string[]; matchFail?: string[] };
  const rows: Row[] = [
    { label: "Last ingest", matchOk: ["bb_source_processed"], matchFail: ["bb_source_failed"] },
    { label: "Last embedding run", matchOk: ["bb_embed_run_completed"] },
    { label: "Last governance sweep", matchOk: ["bb_governance_view_opened", "bb_conflict_resolved"] },
    { label: "Last vertical evaluation", matchOk: ["bb_vertical_evaluation_run"] },
    { label: "Last gap cluster run", matchOk: ["bb_gap_cluster_run"] },
    { label: "Last search activity", matchOk: ["bb_search_query_submitted"] },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status summary</CardTitle>
        <CardDescription>
          Latest signals from the last 90 days. Empty rows mean no data — not failures.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> Could not load status: {error}
          </div>
        )}
        {!loading && !error && (
          <div className="divide-y text-sm">
            {rows.map((r) => {
              const ok = events?.find((e) => r.matchOk.includes(e.event_type));
              const fail = r.matchFail
                ? events?.find((e) => r.matchFail!.includes(e.event_type))
                : undefined;
              const okAt = ok ? new Date(ok.created_at).toLocaleString() : null;
              const failAt = fail ? new Date(fail.created_at).toLocaleString() : null;
              const newest =
                ok && fail
                  ? new Date(ok.created_at) >= new Date(fail.created_at)
                    ? "ok"
                    : "fail"
                  : ok
                    ? "ok"
                    : fail
                      ? "fail"
                      : "none";
              return (
                <div key={r.label} className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="text-right">
                    {newest === "none" && (
                      <Badge variant="outline">No data</Badge>
                    )}
                    {newest === "ok" && (
                      <span className="text-xs">
                        <Badge variant="default" className="mr-2">OK</Badge>
                        {okAt}
                      </span>
                    )}
                    {newest === "fail" && (
                      <span className="text-xs">
                        <Badge variant="destructive" className="mr-2">Failed</Badge>
                        {failAt}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
