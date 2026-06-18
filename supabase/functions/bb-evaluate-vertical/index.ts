// Business Brain Phase 6 — bb-evaluate-vertical
// Computes per-workspace coverage and opens/closes gaps against approved facts
// using the workspace's assigned vertical profile.
//
// POST { workspaceId?: string } — if workspaceId omitted, evaluates every
// workspace that has a vertical profile mapping. Idempotent: relies on partial
// unique indexes on bb_vertical_gaps to dedupe open and suppressed gaps.
//
// Scope guards:
//   - Approved facts only (verification_state = 'approved').
//   - Suppressed gaps are NEVER reopened. They stay until an explicit future
//     unsuppress action.
//   - No auto-fix. We only record coverage + gap signals for reviewers.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type GapKind = "missing_entity" | "missing_field" | "under_min_count";

interface EntityReq {
  vertical_profile_id: string;
  entity_type: string;
  is_required: boolean;
  min_count: number;
  high_priority: boolean;
}

interface FieldReq {
  vertical_profile_id: string;
  entity_type: string;
  field_path: string;
  is_required: boolean;
}

interface FactRow {
  id: string;
  workspace_id: string;
  entity_type: string;
  payload: Record<string, unknown> | null;
}

interface GapRow {
  id: string;
  workspace_id: string;
  vertical_profile_id: string;
  entity_type: string;
  gap_kind: GapKind;
  fact_id: string | null;
  field_path: string | null;
  status: "open" | "resolved" | "suppressed";
}

function readPath(obj: unknown, path: string): unknown {
  if (obj == null || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  // Allow "payload.x" or just "x" — caller decides.
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length === 0;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const onlyWorkspace: string | undefined = body?.workspaceId;

    // Resolve workspace → profile mappings.
    let mapQ = supabase
      .from("bb_workspace_vertical_profiles")
      .select("workspace_id,vertical_profile_id");
    if (onlyWorkspace) mapQ = mapQ.eq("workspace_id", onlyWorkspace);
    const { data: mappings, error: mapErr } = await mapQ;
    if (mapErr) throw mapErr;
    if (!mappings || mappings.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, workspaces: 0, gapsOpened: 0, gapsResolved: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const profileIds = Array.from(
      new Set(mappings.map((m) => m.vertical_profile_id as string)),
    );

    const { data: entityReqs } = await supabase
      .from("bb_vertical_entity_requirements")
      .select("vertical_profile_id,entity_type,is_required,min_count,high_priority")
      .in("vertical_profile_id", profileIds);
    const { data: fieldReqs } = await supabase
      .from("bb_vertical_field_requirements")
      .select("vertical_profile_id,entity_type,field_path,is_required")
      .in("vertical_profile_id", profileIds);

    const entityByProfile = new Map<string, EntityReq[]>();
    for (const e of (entityReqs ?? []) as EntityReq[]) {
      const arr = entityByProfile.get(e.vertical_profile_id) ?? [];
      arr.push(e);
      entityByProfile.set(e.vertical_profile_id, arr);
    }
    const fieldByProfile = new Map<string, FieldReq[]>();
    for (const f of (fieldReqs ?? []) as FieldReq[]) {
      const arr = fieldByProfile.get(f.vertical_profile_id) ?? [];
      arr.push(f);
      fieldByProfile.set(f.vertical_profile_id, arr);
    }

    let totalOpened = 0;
    let totalResolved = 0;
    const evaluatedEntityTypes = new Set<string>();

    for (const m of mappings) {
      const workspaceId = m.workspace_id as string;
      const profileId = m.vertical_profile_id as string;
      const entityReqList = (entityByProfile.get(profileId) ?? []).filter(
        (e) => e.is_required && e.min_count > 0,
      );
      const fieldReqList = fieldByProfile.get(profileId) ?? [];
      if (entityReqList.length === 0) continue;

      const requiredEntityTypes = entityReqList.map((e) => e.entity_type);
      for (const t of requiredEntityTypes) evaluatedEntityTypes.add(t);

      // Pull approved facts for required entity types.
      const { data: facts } = await supabase
        .from("bb_facts")
        .select("id,workspace_id,entity_type,payload")
        .eq("workspace_id", workspaceId)
        .eq("verification_state", "approved")
        .in("entity_type", requiredEntityTypes);
      const factRows = (facts ?? []) as FactRow[];

      // Group facts by entity type.
      const byType = new Map<string, FactRow[]>();
      for (const f of factRows) {
        const arr = byType.get(f.entity_type) ?? [];
        arr.push(f);
        byType.set(f.entity_type, arr);
      }

      // 1) Completeness rollup per entity type.
      for (const req of entityReqList) {
        const actual = (byType.get(req.entity_type) ?? []).length;
        const ratio = Math.min(1, actual / Math.max(1, req.min_count));
        await supabase
          .from("bb_vertical_completeness")
          .upsert(
            {
              workspace_id: workspaceId,
              vertical_profile_id: profileId,
              entity_type: req.entity_type,
              required_count: req.min_count,
              actual_count: actual,
              coverage_ratio: ratio,
              last_computed_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,vertical_profile_id,entity_type" },
          );
      }

      // 2) Load existing gaps for this workspace+profile.
      const { data: existing } = await supabase
        .from("bb_vertical_gaps")
        .select(
          "id,workspace_id,vertical_profile_id,entity_type,gap_kind,fact_id,field_path,status",
        )
        .eq("workspace_id", workspaceId)
        .eq("vertical_profile_id", profileId)
        .in("status", ["open", "suppressed"]);

      const keyOf = (g: {
        entity_type: string;
        gap_kind: string;
        fact_id: string | null;
        field_path: string | null;
      }) =>
        `${g.entity_type}|${g.gap_kind}|${g.fact_id ?? ""}|${g.field_path ?? ""}`;

      const openByKey = new Map<string, GapRow>();
      const suppressedByKey = new Map<string, GapRow>();
      for (const g of (existing ?? []) as GapRow[]) {
        (g.status === "open" ? openByKey : suppressedByKey).set(keyOf(g), g);
      }

      // 3) Compute fresh gap signals.
      type GapShape = {
        entity_type: string;
        gap_kind: GapKind;
        fact_id: string | null;
        field_path: string | null;
      };
      const desired: GapShape[] = [];

      for (const req of entityReqList) {
        const facts = byType.get(req.entity_type) ?? [];

        // under_min_count when actual < min_count.
        if (facts.length < req.min_count) {
          desired.push({
            entity_type: req.entity_type,
            gap_kind: "under_min_count",
            fact_id: null,
            field_path: null,
          });
        }

        // missing_field per approved fact when required field missing.
        const fieldsForType = fieldReqList.filter(
          (fr) => fr.entity_type === req.entity_type && fr.is_required,
        );
        for (const fact of facts) {
          for (const fr of fieldsForType) {
            const path = fr.field_path.startsWith("payload.")
              ? fr.field_path.slice("payload.".length)
              : fr.field_path;
            const value = readPath(fact.payload ?? {}, path);
            if (isEmpty(value)) {
              desired.push({
                entity_type: req.entity_type,
                gap_kind: "missing_field",
                fact_id: fact.id,
                field_path: fr.field_path,
              });
            }
          }
        }
      }

      const desiredKeys = new Set(desired.map((d) => keyOf(d)));

      // 4) Open new gaps that aren't already open and aren't suppressed.
      for (const d of desired) {
        const k = keyOf(d);
        if (openByKey.has(k)) continue;
        if (suppressedByKey.has(k)) continue;
        const { error: insErr } = await supabase
          .from("bb_vertical_gaps")
          .insert({
            workspace_id: workspaceId,
            vertical_profile_id: profileId,
            entity_type: d.entity_type,
            gap_kind: d.gap_kind,
            fact_id: d.fact_id,
            field_path: d.field_path,
            status: "open",
          });
        if (!insErr) totalOpened += 1;
      }

      // 5) Resolve open gaps whose condition is satisfied.
      for (const [k, g] of openByKey) {
        if (desiredKeys.has(k)) continue;
        const { error: updErr } = await supabase
          .from("bb_vertical_gaps")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", g.id);
        if (!updErr) totalResolved += 1;
      }
    }

    // Telemetry: one platform_events row per evaluation invocation.
    try {
      // Find an organization to attribute the event to (best-effort).
      const firstWs = onlyWorkspace ?? (mappings[0]?.workspace_id as string);
      if (firstWs) {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("organization_id")
          .eq("id", firstWs)
          .maybeSingle();
        if (ws?.organization_id) {
          await supabase.from("platform_events").insert({
            organization_id: ws.organization_id,
            event_type: "bb_vertical_evaluation_run",
            source: "business-brain",
            payload: {
              workspaceId: onlyWorkspace ?? null,
              workspacesEvaluated: mappings.length,
              entityTypesEvaluated: Array.from(evaluatedEntityTypes),
              gapsOpened: totalOpened,
              gapsResolved: totalResolved,
            },
          });
        }
      }
    } catch {
      /* swallow telemetry errors */
    }

    return new Response(
      JSON.stringify({
        ok: true,
        workspaces: mappings.length,
        gapsOpened: totalOpened,
        gapsResolved: totalResolved,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String((err as Error)?.message ?? err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
