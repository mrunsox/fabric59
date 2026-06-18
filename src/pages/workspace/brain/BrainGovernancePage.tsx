import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, AlertTriangle, Clock, Activity, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  listConflicts,
  listStaleFacts,
  triggerGovernanceSweep,
  type ConflictView,
  type StaleFactView,
} from "@/lib/business-brain/selectors";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import BbStaleFactDrawer from "@/components/business-brain/BbStaleFactDrawer";
import BbConflictDrawer from "@/components/business-brain/BbConflictDrawer";

const REASON_LABEL: Record<string, string> = {
  stale_due_to_age: "Age",
  stale_due_to_usage: "Usage",
  stale_due_to_conflict: "Conflict",
};

const REASON_ICON = {
  stale_due_to_age: Clock,
  stale_due_to_usage: Activity,
  stale_due_to_conflict: AlertTriangle,
} as const;

export default function BrainGovernancePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { organization } = useAuth();
  const qc = useQueryClient();
  const [staleEntity, setStaleEntity] = useState<string>("all");
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [openStale, setOpenStale] = useState<StaleFactView | null>(null);
  const [openConflict, setOpenConflict] = useState<ConflictView | null>(null);
  const [sweeping, setSweeping] = useState(false);

  const staleQuery = useQuery({
    queryKey: ["bb_governance_stale", workspaceId, staleEntity, highRiskOnly],
    enabled: !!workspaceId,
    queryFn: () =>
      listStaleFacts({
        workspaceId: workspaceId!,
        entityType: staleEntity === "all" ? undefined : (staleEntity as never),
        highRiskOnly,
      }),
  });

  const conflictsQuery = useQuery({
    queryKey: ["bb_governance_conflicts", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listConflicts(workspaceId!),
  });

  // Telemetry on view open (once per query change).
  useState(() => {
    emitBbEvent("bb_governance_view_opened", {
      workspaceId: workspaceId ?? null,
      organizationId: organization?.id ?? null,
      section: "stale",
      filtersApplied: (staleEntity !== "all" ? 1 : 0) + (highRiskOnly ? 1 : 0),
    });
    return null;
  });

  async function runSweep() {
    if (!workspaceId) return;
    setSweeping(true);
    await triggerGovernanceSweep(workspaceId);
    setSweeping(false);
    qc.invalidateQueries({ queryKey: ["bb_governance_stale"] });
    qc.invalidateQueries({ queryKey: ["bb_governance_conflicts"] });
    qc.invalidateQueries({ queryKey: ["bb_facts"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Governance</h2>
          <p className="text-sm text-muted-foreground">
            Staleness, conflicts, and usage signals. Humans make every call.
          </p>
        </div>
        <Button onClick={runSweep} disabled={sweeping} size="sm" variant="outline">
          {sweeping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Run sweep
        </Button>
      </div>

      {/* Stale */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Stale facts</h3>
          <div className="flex items-center gap-2">
            <Select value={staleEntity} onValueChange={setStaleEntity}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entity types</SelectItem>
                {["phone", "hours", "destination_contact", "escalation_contact", "service", "faq", "policy", "intake_requirement"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant={highRiskOnly ? "default" : "outline"} onClick={() => setHighRiskOnly((v) => !v)}>
              <ShieldAlert className="mr-1 h-3.5 w-3.5" /> High-risk only
            </Button>
          </div>
        </div>
        {staleQuery.isLoading ? (
          <div className="flex items-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (staleQuery.data ?? []).length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No stale facts. Knowledge looks fresh.</Card>
        ) : (
          <Card className="divide-y overflow-hidden">
            {(staleQuery.data ?? []).map((f) => (
              <button
                key={f.id}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                onClick={() => setOpenStale(f)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{f.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.entityType} · reviewed {new Date(f.lastReviewedAt).toLocaleDateString()} · usage {f.usageScore.toFixed(1)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {f.staleReasons.map((r) => {
                    const I = REASON_ICON[r];
                    return (
                      <Badge key={r} variant="secondary" className="text-xs">
                        <I className="mr-1 h-3 w-3" />
                        {REASON_LABEL[r]}
                      </Badge>
                    );
                  })}
                </div>
              </button>
            ))}
          </Card>
        )}
      </section>

      {/* Conflicts */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Conflicts</h3>
        {conflictsQuery.isLoading ? (
          <div className="flex items-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (conflictsQuery.data ?? []).length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No open conflicts.</Card>
        ) : (
          <Card className="divide-y overflow-hidden">
            {(conflictsQuery.data ?? []).map((c) => (
              <button
                key={c.id}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                onClick={() => setOpenConflict(c)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {c.primaryFact?.displayName ?? "—"} ⇄ {c.conflictingFact?.displayName ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.conflictKind.replaceAll("_", " ")}
                    {c.similarity != null ? ` · similarity ${c.similarity.toFixed(2)}` : ""}
                    {" · "}
                    {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-900">{c.entityType}</Badge>
              </button>
            ))}
          </Card>
        )}
      </section>

      <BbStaleFactDrawer
        fact={openStale}
        onClose={() => setOpenStale(null)}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: ["bb_governance_stale"] });
          qc.invalidateQueries({ queryKey: ["bb_facts"] });
        }}
      />
      <BbConflictDrawer
        conflict={openConflict}
        onClose={() => setOpenConflict(null)}
        onResolved={() => {
          qc.invalidateQueries({ queryKey: ["bb_governance_conflicts"] });
          qc.invalidateQueries({ queryKey: ["bb_governance_stale"] });
          qc.invalidateQueries({ queryKey: ["bb_facts"] });
        }}
      />
    </div>
  );
}
