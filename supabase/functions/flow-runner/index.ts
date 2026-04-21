import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Flow runner — Phase 1.
 * Loads a deployment, evaluates filters against the trigger event payload,
 * applies field mappings, and records a deployment_run row.
 *
 * Body: { deployment_id: string, trigger_event_id?: string, payload: Record<string, unknown> }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { deployment_id, trigger_event_id, payload } = await req.json();
    if (!deployment_id) return json({ error: "deployment_id required" }, 400);

    const { data: deployment, error: dErr } = await supabase
      .from("deployments")
      .select("*, flows(*)")
      .eq("id", deployment_id)
      .maybeSingle();
    if (dErr || !deployment) return json({ error: "Deployment not found" }, 404);

    if (deployment.status !== "active") {
      return json({ skipped: true, reason: `deployment status=${deployment.status}` });
    }

    // Insert pending run
    const { data: run, error: runErr } = await supabase
      .from("deployment_runs")
      .insert({
        deployment_id,
        trigger_event_id: trigger_event_id ?? null,
        organization_id: deployment.organization_id,
        status: "running",
        payload,
      })
      .select()
      .single();
    if (runErr || !run) return json({ error: runErr?.message ?? "run insert failed" }, 500);

    try {
      const flow = deployment.flows;
      const def = flow?.definition ?? {};
      const filters: Array<{ field: string; op: string; value: unknown }> = def.filters ?? [];

      // Evaluate filters
      for (const f of filters) {
        const actual = getPath(payload, f.field);
        if (!matches(actual, f.op, f.value)) {
          await supabase
            .from("deployment_runs")
            .update({ status: "skipped", finished_at: new Date().toISOString(), error: `filter failed: ${f.field}` })
            .eq("id", run.id);
          return json({ success: true, run_id: run.id, status: "skipped" });
        }
      }

      // Apply mappings → mapped payload (action dispatch is a stub for Phase 1)
      const mappings: Array<{ source: string; target: string }> = def.mappings ?? [];
      const mapped: Record<string, unknown> = {};
      for (const m of mappings) {
        mapped[m.target] = getPath(payload, m.source);
      }

      await supabase
        .from("deployment_runs")
        .update({
          status: "succeeded",
          finished_at: new Date().toISOString(),
          payload: { input: payload, mapped, action: def.action ?? null },
        })
        .eq("id", run.id);

      return json({ success: true, run_id: run.id, status: "succeeded", mapped });
    } catch (innerErr) {
      await supabase
        .from("deployment_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: (innerErr as Error).message,
        })
        .eq("id", run.id);
      return json({ error: (innerErr as Error).message, run_id: run.id }, 500);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function getPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  return path.split(".").reduce<any>((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function matches(actual: unknown, op: string, expected: unknown): boolean {
  switch (op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "contains":
      return typeof actual === "string" && typeof expected === "string" && actual.includes(expected);
    case "exists":
      return actual !== undefined && actual !== null;
    default:
      return true;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
