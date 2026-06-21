import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
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
import BbStateBlock from "@/components/business-brain/BbStateBlock";
import { BrainPanel, BrainBadge } from "@/components/business-brain/ui";
import BrainVerticalGovernanceSection from "./BrainVerticalGovernanceSection";
import BrainGapGovernanceSection from "./BrainGapGovernanceSection";

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

const REASON_TONE: Record<string, "muted" | "warn" | "bad"> = {
  stale_due_to_age: "muted",
  stale_due_to_usage: "muted",
  stale_due_to_conflict: "warn",
};

function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

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
    <div className="space-y-8 animate-fade-in">
      <SectionHeader
        title="Governance"
        description="Staleness, conflicts, and usage signals. Humans make every call."
        actions={
          <Button onClick={runSweep} disabled={sweeping} size="sm" variant="outline">
            {sweeping ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Run sweep
          </Button>
        }
      />

      {/* Stale */}
      <section className="space-y-3">
        <SectionHeader
          title="Stale facts"
          description="Facts overdue for review based on age, usage, or open conflict."
          actions={
            <>
              <Select value={staleEntity} onValueChange={setStaleEntity}>
                <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
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
            </>
          }
        />
        {staleQuery.isLoading ? (
          <BrainPanel>
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          </BrainPanel>
        ) : (staleQuery.data ?? []).length === 0 ? (
          <BbStateBlock
            kind="noData"
            title="No stale facts"
            description="Knowledge looks fresh — nothing requires reviewer attention right now."
          />
        ) : (
          <BrainPanel className="p-0 overflow-hidden">
            <ul className="divide-y divide-bb-border-subtle">
              {(staleQuery.data ?? []).map((f) => (
                <li key={f.id}>
                  <button
                    className="bb-row-hover flex w-full items-center justify-between gap-3 px-4 py-3 text-left bb-focus-ring"
                    onClick={() => setOpenStale(f)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{f.displayName}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground bb-tnum">
                        {f.entityType} · reviewed {new Date(f.lastReviewedAt).toLocaleDateString()} · usage {f.usageScore.toFixed(1)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {f.staleReasons.map((r) => {
                        const I = REASON_ICON[r];
                        return (
                          <BrainBadge key={r} tone={REASON_TONE[r] ?? "muted"}>
                            <I className="mr-1 h-3 w-3" />
                            {REASON_LABEL[r]}
                          </BrainBadge>
                        );
                      })}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </BrainPanel>
        )}
      </section>

      {/* Conflicts */}
      <section className="space-y-3">
        <SectionHeader
          title="Conflicts"
          description="Facts the system thinks may disagree. Resolution is always reviewer-confirmed."
        />
        {conflictsQuery.isLoading ? (
          <BrainPanel>
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          </BrainPanel>
        ) : (conflictsQuery.data ?? []).length === 0 ? (
          <BbStateBlock
            kind="noData"
            title="No open conflicts"
            description="No facts are flagged as conflicting right now."
          />
        ) : (
          <BrainPanel tone="warn" className="p-0 overflow-hidden">
            <ul className="divide-y divide-bb-border-subtle">
              {(conflictsQuery.data ?? []).map((c) => (
                <li key={c.id}>
                  <button
                    className="bb-row-hover flex w-full items-center justify-between gap-3 px-4 py-3 text-left bb-focus-ring"
                    onClick={() => setOpenConflict(c)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {c.primaryFact?.displayName ?? "—"} ⇄ {c.conflictingFact?.displayName ?? "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground bb-tnum">
                        {c.conflictKind.replace(/_/g, " ")}
                        {c.similarity != null ? ` · similarity ${c.similarity.toFixed(2)}` : ""}
                        {" · "}
                        {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <BrainBadge tone="warn">{c.entityType}</BrainBadge>
                  </button>
                </li>
              ))}
            </ul>
          </BrainPanel>
        )}
      </section>

      {/* Phase 6 — Vertical coverage & gaps */}
      <BrainVerticalGovernanceSection />

      {/* Phase 7 — Demand gaps */}
      <BrainGapGovernanceSection />

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
