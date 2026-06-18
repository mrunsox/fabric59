import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldAlert, ExternalLink, EyeOff, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ENTITY_LABEL } from "@/lib/business-brain/entitySchemas";
import { BB_ENTITY_TYPES } from "@/lib/business-brain/types";
import type {
  BbEntityType,
  VerticalGapKind,
} from "@/lib/business-brain/types";
import {
  getVerticalCoverageSummary,
  getWorkspaceVerticalProfile,
  listVerticalGaps,
  suppressVerticalGap,
  triggerVerticalEvaluation,
} from "@/lib/business-brain/selectors";
import { emitBbEvent } from "@/lib/business-brain/telemetry";

const GAP_KIND_LABEL: Record<VerticalGapKind, string> = {
  missing_entity: "Missing entity",
  missing_field: "Missing field",
  under_min_count: "Under required count",
};

/**
 * Phase 6 — Coverage & gaps section embedded in Governance.
 *
 * Surfaces per-entity coverage rollups + open gaps for the workspace's
 * assigned vertical profile. Required-entity coverage only (min_count > 0).
 * No auto-fix; reviewers either navigate to the fact or suppress the gap.
 */
export default function BrainVerticalGovernanceSection() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { organization } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [gapKind, setGapKind] = useState<"all" | VerticalGapKind>("all");
  const [entityType, setEntityType] = useState<"all" | BbEntityType>("all");
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["bb_vertical_profile", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => getWorkspaceVerticalProfile(workspaceId!),
  });

  const coverageQuery = useQuery({
    queryKey: ["bb_vertical_coverage", workspaceId],
    enabled: !!workspaceId && !!profileQuery.data,
    queryFn: () => getVerticalCoverageSummary(workspaceId!),
  });

  const gapsQuery = useQuery({
    queryKey: [
      "bb_vertical_gaps",
      workspaceId,
      gapKind,
      entityType,
      highPriorityOnly,
    ],
    enabled: !!workspaceId && !!profileQuery.data,
    queryFn: () =>
      listVerticalGaps(workspaceId!, {
        gapKind: gapKind === "all" ? undefined : gapKind,
        entityType: entityType === "all" ? undefined : entityType,
        highPriorityOnly,
        status: "open",
      }),
  });

  // Telemetry: fire once when section becomes visible with a profile assigned.
  useEffect(() => {
    if (!profileQuery.data) return;
    emitBbEvent("bb_vertical_governance_view_opened", {
      workspaceId: workspaceId ?? null,
      organizationId: organization?.id ?? null,
      section: "coverage",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQuery.data?.id]);

  const filtersApplied = useMemo(
    () =>
      (gapKind !== "all" ? 1 : 0) +
      (entityType !== "all" ? 1 : 0) +
      (highPriorityOnly ? 1 : 0),
    [gapKind, entityType, highPriorityOnly],
  );

  async function runEvaluation() {
    if (!workspaceId) return;
    setEvaluating(true);
    await triggerVerticalEvaluation(workspaceId);
    setEvaluating(false);
    qc.invalidateQueries({ queryKey: ["bb_vertical_coverage"] });
    qc.invalidateQueries({ queryKey: ["bb_vertical_gaps"] });
  }

  async function onSuppress(gapId: string, kind: VerticalGapKind, type: BbEntityType) {
    const ok = await suppressVerticalGap(gapId);
    if (ok) {
      emitBbEvent("bb_vertical_gap_suppressed", {
        workspaceId: workspaceId ?? null,
        organizationId: organization?.id ?? null,
        gapKind: kind,
        entityType: type,
      });
      qc.invalidateQueries({ queryKey: ["bb_vertical_gaps"] });
    }
  }

  function onGoFix(entity: BbEntityType, factId: string | null) {
    const params = new URLSearchParams();
    params.set("entity", entity);
    params.set("staleFilter", "has_gaps");
    if (factId) params.set("fact", factId);
    navigate(`/w/${workspaceId}/brain/approved?${params.toString()}`);
  }

  if (!profileQuery.isLoading && !profileQuery.data) {
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Coverage & gaps</h3>
        <Card className="p-6 text-sm text-muted-foreground">
          No vertical profile is assigned to this workspace. Vertical coverage
          checks are skipped.
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Coverage & gaps</h3>
          {profileQuery.data ? (
            <p className="text-xs text-muted-foreground">
              Vertical: <span className="font-medium">{profileQuery.data.label}</span>
            </p>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={runEvaluation}
          disabled={evaluating}
        >
          {evaluating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Layers className="mr-2 h-4 w-4" />
          )}
          Re-evaluate coverage
        </Button>
      </div>

      {/* Coverage cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(coverageQuery.data ?? []).map((c) => {
          const pct = Math.round(c.coverageRatio * 100);
          return (
            <Card key={`${c.verticalProfileId}-${c.entityType}`} className="p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {ENTITY_LABEL[c.entityType] ?? c.entityType}
                </span>
                {c.highPriority ? (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                    <ShieldAlert className="mr-1 h-3 w-3" /> High priority
                  </Badge>
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground">
                {c.actualCount} / {c.requiredCount} required ({pct}%)
              </div>
              <Progress value={pct} className="mt-2 h-1.5" />
            </Card>
          );
        })}
        {coverageQuery.data && coverageQuery.data.length === 0 ? (
          <Card className="col-span-full p-6 text-sm text-muted-foreground">
            No coverage data yet. Run "Re-evaluate coverage" to compute the
            first snapshot.
          </Card>
        ) : null}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Select value={gapKind} onValueChange={(v) => setGapKind(v as typeof gapKind)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All gap kinds</SelectItem>
            <SelectItem value="missing_field">Missing field</SelectItem>
            <SelectItem value="under_min_count">Under required count</SelectItem>
            <SelectItem value="missing_entity">Missing entity</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityType} onValueChange={(v) => setEntityType(v as typeof entityType)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity types</SelectItem>
            {BB_ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ENTITY_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={highPriorityOnly ? "default" : "outline"}
          onClick={() => setHighPriorityOnly((v) => !v)}
        >
          <ShieldAlert className="mr-1 h-3.5 w-3.5" /> High-priority only
        </Button>
        {filtersApplied > 0 ? (
          <span className="text-xs text-muted-foreground">{filtersApplied} filter(s) applied</span>
        ) : null}
      </div>

      {/* Gap list */}
      {gapsQuery.isLoading ? (
        <div className="flex items-center py-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading gaps…
        </div>
      ) : (gapsQuery.data ?? []).length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No open gaps. Coverage looks good for this vertical.
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {(gapsQuery.data ?? []).map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-rose-100 text-rose-900">
                    {GAP_KIND_LABEL[g.gapKind]}
                  </Badge>
                  <span className="text-sm font-medium">
                    {ENTITY_LABEL[g.entityType] ?? g.entityType}
                  </span>
                  {g.highPriority ? (
                    <Badge variant="outline" className="text-[10px]">High priority</Badge>
                  ) : null}
                </div>
                {g.fieldPath ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {g.validationHint ?? g.fieldPath}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onGoFix(g.entityType, g.factId)}
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> Go fix
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSuppress(g.id, g.gapKind, g.entityType)}
                >
                  <EyeOff className="mr-1 h-3.5 w-3.5" /> Suppress
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
