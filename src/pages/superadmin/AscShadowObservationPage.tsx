/**
 * ASC Shadow Observation — Phase 6 · Slice 2.
 *
 * Superadmin-only view over `platform_events` for the ASC pilot. No new
 * tables, no new edge functions — all aggregation is client-side.
 *
 * Catalog + rollout intent: docs/asc-shadow-rollout.md
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ASC_EVENT_TYPES, type AscEventType } from "@/lib/asc/telemetry";

interface AscPlatformEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

function isAscEvent(t: string): t is AscEventType {
  return (ASC_EVENT_TYPES as readonly string[]).includes(t);
}

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default function AscShadowObservationPage() {
  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, []);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["asc-shadow-events", since],
    queryFn: async (): Promise<AscPlatformEvent[]> => {
      const { data, error } = await supabase
        .from("platform_events")
        .select("id, event_type, payload, created_at")
        .gte("created_at", since)
        .in("event_type", ASC_EVENT_TYPES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as AscPlatformEvent[];
    },
  });

  const summary = useMemo(() => {
    const counts = new Map<AscEventType, number>();
    const draftsByEvent = new Map<AscEventType, Set<string>>();
    const aiByRole = new Map<
      string,
      { calls: number; ok: number; fail: number; confirmed: number }
    >();
    const stepCompletedWithAi = { total: 0, withAi: 0 };
    const blockerSeen = new Map<string, number>();

    for (const ev of events) {
      if (!isAscEvent(ev.event_type)) continue;
      counts.set(ev.event_type, (counts.get(ev.event_type) ?? 0) + 1);
      const draftId = str(ev.payload?.ascDraftId);
      if (draftId) {
        const set = draftsByEvent.get(ev.event_type) ?? new Set<string>();
        set.add(draftId);
        draftsByEvent.set(ev.event_type, set);
      }
      if (ev.event_type === "asc_ai_call") {
        const role = str(ev.payload?.role) ?? "unknown";
        const slot = aiByRole.get(role) ?? { calls: 0, ok: 0, fail: 0, confirmed: 0 };
        slot.calls += 1;
        if (ev.payload?.outcome === "ok") slot.ok += 1;
        if (ev.payload?.outcome === "fail") slot.fail += 1;
        aiByRole.set(role, slot);
      }
      if (ev.event_type === "asc_ai_proposal_confirmed") {
        const role = str(ev.payload?.role) ?? "unknown";
        const slot = aiByRole.get(role) ?? { calls: 0, ok: 0, fail: 0, confirmed: 0 };
        slot.confirmed += 1;
        aiByRole.set(role, slot);
      }
      if (ev.event_type === "asc_step_completed") {
        stepCompletedWithAi.total += 1;
        if (ev.payload?.usedAi === true) stepCompletedWithAi.withAi += 1;
      }
      if (ev.event_type === "asc_readiness_blocker_seen") {
        const id = str(ev.payload?.blockerId) ?? "(unknown)";
        blockerSeen.set(id, (blockerSeen.get(id) ?? 0) + 1);
      }
    }

    const draftReachedStep = (step: number): number => {
      const ids = new Set<string>();
      for (const ev of events) {
        if (ev.event_type !== "asc_step_completed") continue;
        const s = num(ev.payload?.step);
        const id = str(ev.payload?.ascDraftId);
        if (id && typeof s === "number" && s >= step) ids.add(id);
      }
      return ids.size;
    };

    const uniqueDraftsFor = (t: AscEventType): number =>
      draftsByEvent.get(t)?.size ?? 0;

    const funnel: Array<{ label: string; value: number }> = [
      { label: "Wizard opened", value: uniqueDraftsFor("asc_wizard_opened") },
      { label: "Reached Step 5", value: draftReachedStep(5) },
      { label: "Reached Step 8", value: draftReachedStep(8) },
      { label: "Reached Step 10", value: draftReachedStep(10) },
      { label: "Handoff initiated", value: uniqueDraftsFor("asc_handoff_initiated") },
      { label: "Handoff completed", value: uniqueDraftsFor("asc_handoff_completed") },
      {
        label: "Canonical saved",
        value: uniqueDraftsFor("canonical_from_asc_saved"),
      },
      {
        label: "Canonical published",
        value: uniqueDraftsFor("canonical_from_asc_published"),
      },
    ];

    const topBlockers = Array.from(blockerSeen.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const aiAdoptionPct =
      stepCompletedWithAi.total > 0
        ? Math.round((stepCompletedWithAi.withAi / stepCompletedWithAi.total) * 100)
        : 0;

    return {
      counts,
      funnel,
      topBlockers,
      aiAdoptionPct,
      aiByRole: Array.from(aiByRole.entries()),
      totalEvents: events.length,
    };
  }, [events]);

  return (
    <div className="space-y-6 p-6" data-testid="asc-shadow-observation">
      <header>
        <h1 className="text-2xl font-semibold">ASC Shadow Observation</h1>
        <p className="text-sm text-muted-foreground">
          Last 30 days · {summary.totalEvents.toLocaleString()} ASC events ·
          {isLoading ? " loading…" : " live read of platform_events"}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funnel (unique drafts)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.funnel.map((row) => {
            const top = summary.funnel[0]?.value ?? 0;
            const pct = top > 0 ? Math.round((row.value / top) * 100) : 0;
            return (
              <div key={row.label} className="flex items-center gap-3 text-sm">
                <div className="w-44 shrink-0">{row.label}</div>
                <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-20 text-right tabular-nums">
                  {row.value} ({pct}%)
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI adoption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-2xl font-semibold">{summary.aiAdoptionPct}%</span>{" "}
              <span className="text-muted-foreground">
                of step completions used AI on that draft
              </span>
            </p>
            <div className="space-y-1">
              {summary.aiByRole.length === 0 && (
                <p className="text-muted-foreground">No AI calls yet.</p>
              )}
              {summary.aiByRole.map(([role, s]) => (
                <div key={role} className="flex items-center justify-between">
                  <Badge variant="outline">{role}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {s.calls} calls · {s.ok} ok · {s.fail} fail · {s.confirmed} confirmed
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top blockers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {summary.topBlockers.length === 0 && (
              <p className="text-muted-foreground">No blockers seen.</p>
            )}
            {summary.topBlockers.map(([id, n]) => (
              <div key={id} className="flex items-center justify-between">
                <code className="text-xs">{id}</code>
                <span className="tabular-nums">{n}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raw event counts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-3">
            {ASC_EVENT_TYPES.map((t) => (
              <div key={t} className="flex items-center justify-between">
                <code className="text-xs">{t}</code>
                <span className="tabular-nums">{summary.counts.get(t) ?? 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
