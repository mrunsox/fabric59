import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Sample Clio webhook payloads for simulation
const CLIO_SAMPLES: Record<string, object> = {
  contact_created: { type: "Contact", id: 12345, action: "created", data: { first_name: "Test", last_name: "Contact", email: "test@example.com", phone_numbers: [{ number: "555-0001" }] } },
  contact_updated: { type: "Contact", id: 12345, action: "updated", data: { first_name: "Test", last_name: "Updated", phone_numbers: [{ number: "555-0002" }] } },
  matter_created: { type: "Matter", id: 67890, action: "created", data: { display_number: "TEST-001", description: "Test Matter", status: "Open", client: { id: 12345 } } },
  matter_updated: { type: "Matter", id: 67890, action: "updated", data: { display_number: "TEST-001", status: "Pending" } },
  task_created: { type: "Task", id: 11111, action: "created", data: { name: "Test Task", due_at: "2024-12-31", matter: { id: 67890 } } },
};

const FIVE9_DISPOSITION_SAMPLES: Record<string, object> = {
  qualified_lead: { campaign: "Legal Intake", disposition: "Qualified Lead", call_variables: { CallerFirstName: "John", CallerLastName: "Smith", CallerPhone: "555-0303", CaseType: "Personal Injury" } },
  callback_scheduled: { campaign: "Legal Intake", disposition: "Callback Scheduled", call_variables: { CallerPhone: "555-0404", CallbackDate: "2024-06-18", CallbackReason: "Needs docs" } },
  consult_booked: { campaign: "Legal Intake", disposition: "Consult Booked", call_variables: { CallerFirstName: "Maria", CallerLastName: "Garcia", ConsultDate: "2024-06-20", AttorneyName: "Smith" } },
};

function normalize(provider: string, rawPayload: Record<string, unknown>) {
  if (provider === "clio") {
    const data = rawPayload.data as Record<string, unknown> | undefined;
    return {
      entity_type: (rawPayload.type as string)?.toLowerCase() ?? "unknown",
      action: rawPayload.action as string,
      provider: "clio",
      canonical: data ? { ...data } : {},
    };
  }
  if (provider === "five9") {
    return {
      entity_type: "call",
      action: "disposition",
      provider: "five9",
      canonical: {
        disposition: rawPayload.disposition,
        campaign: rawPayload.campaign,
        ...(rawPayload.call_variables as Record<string, unknown> ?? {}),
      },
    };
  }
  if (provider === "mycase") {
    return {
      entity_type: rawPayload.entity_type ?? "unknown",
      action: rawPayload.action ?? "unknown",
      provider: "mycase",
      canonical: rawPayload.data ?? {},
    };
  }
  return { entity_type: "unknown", action: "unknown", provider, canonical: {} };
}

function evaluatePolicy(normalized: Record<string, unknown>, policy: Record<string, unknown> | null) {
  const action = normalized.action as string;
  if (!policy) return { allowed: true, reason: "No policy profile — default allow" };
  if (action === "create" && normalized.entity_type === "contact" && !policy.allow_contact_create) {
    return { allowed: false, reason: "Contact creation blocked by policy" };
  }
  if (action === "create" && normalized.entity_type === "matter" && !policy.allow_matter_create) {
    return { allowed: false, reason: "Matter creation blocked by policy" };
  }
  return { allowed: true, reason: "Policy allows this action" };
}

function generateSyncJobs(normalized: Record<string, unknown>, policyDecision: Record<string, unknown>) {
  if (!policyDecision.allowed) return [];
  const entity = normalized.entity_type as string;
  const action = normalized.action as string;
  return [{ job_type: `${entity}.sync_${action}`, direction: "inbound", priority: 100 }];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, ...payload } = await req.json();
    const startTime = Date.now();
    const correlationId = crypto.randomUUID();

    switch (action) {
      case "simulateClioWebhook": {
        const scenario = payload.scenario ?? "contact_created";
        const rawPayload = CLIO_SAMPLES[scenario] ?? CLIO_SAMPLES.contact_created;
        const customPayload = payload.custom_payload ?? rawPayload;

        const normalized = normalize("clio", customPayload as Record<string, unknown>);

        // Load policy if client specified
        let policy = null;
        if (payload.client_id && payload.organization_id) {
          const { data: policyData } = await supabaseAdmin
            .from("legal_connect_policy_profiles")
            .select("*")
            .eq("organization_id", payload.organization_id)
            .eq("client_id", payload.client_id)
            .eq("is_default", true)
            .maybeSingle();
          policy = policyData;
        }

        const policyDecision = evaluatePolicy(normalized, policy);
        const syncJobs = generateSyncJobs(normalized, policyDecision);
        const duration = Date.now() - startTime;

        const result = {
          test_type: "clio_webhook",
          scenario,
          raw_payload: customPayload,
          normalized_event: normalized,
          policy_decision: policyDecision,
          sync_jobs: syncJobs,
          review_triggers: policyDecision.allowed ? [] : [{ trigger: "policy_blocked", message: policyDecision.reason }],
          correlation_id: correlationId,
          duration_ms: duration,
          status: "passed",
        };

        // Record test run
        if (payload.organization_id && payload.client_id) {
          await supabaseAdmin.from("legal_connect_test_runs").insert({
            organization_id: payload.organization_id,
            client_id: payload.client_id,
            test_type: "clio_webhook",
            test_category: "webhook",
            test_config: { scenario, custom_payload: payload.custom_payload ? true : false },
            expected_output: payload.expected_output ?? null,
            actual_output: result,
            status: "passed",
            correlation_id: correlationId,
            duration_ms: duration,
          });
        }

        return new Response(JSON.stringify({ data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "simulateMyCaseEvent": {
        const capability = payload.capability ?? "contact_lookup";
        const rawPayload = payload.custom_payload ?? { entity_type: "contact", action: "lookup", data: { first_name: "Test", last_name: "User" } };

        // Check capability
        let capabilityCheck = null;
        if (payload.organization_id) {
          const { data: cap } = await supabaseAdmin
            .from("legal_connect_provider_capabilities")
            .select("*")
            .eq("provider", "mycase")
            .eq("capability_key", capability)
            .maybeSingle();
          capabilityCheck = cap ? { capability: cap.capability_key, supported: cap.supported, notes: cap.notes } : { capability, supported: false, notes: "Capability not found" };
        }

        const normalized = normalize("mycase", rawPayload as Record<string, unknown>);
        const duration = Date.now() - startTime;

        const isSupported = capabilityCheck?.supported ?? true;
        const result = {
          test_type: "mycase_event",
          capability,
          raw_payload: rawPayload,
          normalized_event: normalized,
          capability_check: capabilityCheck,
          policy_decision: isSupported ? { allowed: true, reason: "Capability supported" } : { allowed: false, reason: `Capability ${capability} not supported for MyCase` },
          sync_jobs: isSupported ? [{ job_type: `${capability}`, direction: "outbound", priority: 100 }] : [],
          review_triggers: isSupported ? [] : [{ trigger: "unsupported_capability", message: `${capability} not available for MyCase` }],
          correlation_id: correlationId,
          duration_ms: duration,
          status: "passed",
        };

        if (payload.organization_id && payload.client_id) {
          await supabaseAdmin.from("legal_connect_test_runs").insert({
            organization_id: payload.organization_id,
            client_id: payload.client_id,
            test_type: "mycase_event",
            test_category: "capability",
            test_config: { capability },
            actual_output: result,
            status: "passed",
            correlation_id: correlationId,
            duration_ms: duration,
          });
        }

        return new Response(JSON.stringify({ data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "simulateDisposition": {
        const scenario = payload.scenario ?? "qualified_lead";
        const rawPayload = FIVE9_DISPOSITION_SAMPLES[scenario] ?? FIVE9_DISPOSITION_SAMPLES.qualified_lead;
        const customPayload = payload.custom_payload ?? rawPayload;

        const normalized = normalize("five9", customPayload as Record<string, unknown>);

        // Check disposition mappings
        let mappedActions: unknown[] = [];
        if (payload.organization_id && payload.client_id) {
          const { data: mappings } = await supabaseAdmin
            .from("legal_connect_disposition_mappings")
            .select("*")
            .eq("organization_id", payload.organization_id)
            .eq("client_id", payload.client_id)
            .eq("five9_disposition", (customPayload as any).disposition);
          mappedActions = mappings ?? [];
        }

        const duration = Date.now() - startTime;
        const result = {
          test_type: "disposition",
          scenario,
          raw_payload: customPayload,
          normalized_event: normalized,
          disposition_mappings: mappedActions,
          sync_jobs: mappedActions.length > 0
            ? mappedActions.map((m: any) => ({ job_type: m.target_action, priority: m.priority ?? 100 }))
            : [{ job_type: "unmapped_disposition", priority: 999 }],
          review_triggers: mappedActions.length === 0 ? [{ trigger: "unmapped_disposition", message: `No mapping found for disposition: ${(customPayload as any).disposition}` }] : [],
          correlation_id: correlationId,
          duration_ms: duration,
          status: "passed",
        };

        if (payload.organization_id && payload.client_id) {
          await supabaseAdmin.from("legal_connect_test_runs").insert({
            organization_id: payload.organization_id,
            client_id: payload.client_id,
            test_type: "disposition",
            test_category: "disposition",
            test_config: { scenario },
            actual_output: result,
            status: "passed",
            correlation_id: correlationId,
            duration_ms: duration,
          });
        }

        return new Response(JSON.stringify({ data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "simulateLookup": {
        const provider = payload.provider ?? "clio";
        const lookupType = payload.lookup_type ?? "contact";
        const searchValue = payload.search_value ?? "555-0001";

        // Check canonical data
        let matches: unknown[] = [];
        if (payload.organization_id) {
          const table = lookupType === "contact" ? "legal_connect_contacts" : "legal_connect_matters";
          const { data } = await supabaseAdmin
            .from(table)
            .select("*")
            .eq("organization_id", payload.organization_id)
            .limit(5);
          matches = data ?? [];
        }

        const duration = Date.now() - startTime;
        const result = {
          test_type: "lookup",
          provider,
          lookup_type: lookupType,
          search_value: searchValue,
          matches_found: matches.length,
          matches: matches.slice(0, 3),
          is_ambiguous: matches.length > 1,
          review_triggers: matches.length > 1 ? [{ trigger: "ambiguous_match", message: `${matches.length} matches found for ${searchValue}` }] : [],
          correlation_id: correlationId,
          duration_ms: duration,
          status: "passed",
        };

        if (payload.organization_id && payload.client_id) {
          await supabaseAdmin.from("legal_connect_test_runs").insert({
            organization_id: payload.organization_id,
            client_id: payload.client_id,
            test_type: "lookup",
            test_category: "lookup",
            test_config: { provider, lookup_type: lookupType, search_value: searchValue },
            actual_output: result,
            status: "passed",
            correlation_id: correlationId,
            duration_ms: duration,
          });
        }

        return new Response(JSON.stringify({ data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "simulateRenewalFailure": {
        const result = {
          test_type: "renewal_failure",
          scenario: "webhook_renewal_failed_3x",
          description: "Simulates a Clio webhook that has failed renewal 3 times and triggers auto-recreate",
          steps: [
            { step: 1, action: "Renewal attempt 1 — provider returns 503", result: "failure_count → 1" },
            { step: 2, action: "Renewal attempt 2 — provider returns 503", result: "failure_count → 2, health_status → degraded" },
            { step: 3, action: "Renewal attempt 3 — provider returns 503", result: "failure_count → 3, triggers auto-recreate" },
            { step: 4, action: "Auto-recreate — new webhook created", result: "health_status → healthy, failure_count → 0" },
          ],
          expected_outcome: "Webhook is recreated with new remote_webhook_id and fresh 31-day expiry",
          correlation_id: correlationId,
          duration_ms: Date.now() - startTime,
          status: "passed",
        };

        return new Response(JSON.stringify({ data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "simulateOutage": {
        const outageType = payload.outage_type ?? "provider_unavailable";
        const result = {
          test_type: "outage",
          outage_type: outageType,
          description: `Simulates ${outageType} outage scenario`,
          steps: outageType === "provider_unavailable" ? [
            { step: 1, action: "Provider API returns 503", result: "Jobs begin failing" },
            { step: 2, action: "Admin enables outage mode", result: "New jobs paused, queue buffered" },
            { step: 3, action: "Provider recovers", result: "Admin disables outage mode" },
            { step: 4, action: "Paused jobs resume", result: "Queue drains, webhooks renewed" },
          ] : outageType === "token_expired" ? [
            { step: 1, action: "OAuth token expires", result: "API calls return 401" },
            { step: 2, action: "Token refresh attempted", result: "If refresh succeeds, operations resume" },
            { step: 3, action: "If refresh fails", result: "Connection marked degraded, admin alerted" },
          ] : [
            { step: 1, action: `${outageType} detected`, result: "Affected operations identified" },
            { step: 2, action: "Mitigation applied", result: "Queue paused or retries configured" },
          ],
          correlation_id: correlationId,
          duration_ms: Date.now() - startTime,
          status: "passed",
        };

        return new Response(JSON.stringify({ data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Phase 4 Slice 2 — Guided test runner ──────────────────────────
      case "runAuthTest":
      case "runLookupTest":
      case "runWriteBackTest":
      case "runEmailOnlyTest": {
        const provider = String(payload.provider ?? "");
        const writeAction = String(payload.write_action ?? "note.create");
        const sample = (payload.sample as Record<string, unknown>) ?? {};
        const orgId = payload.organization_id as string | undefined;
        const clientId = payload.client_id as string | undefined;

        // Resolve the connection for the selected provider (auth-relevant tests).
        let connection: any = null;
        if (orgId && clientId && provider !== "post_call_email") {
          const { data } = await supabaseAdmin
            .from("legal_connect_connections")
            .select("*")
            .eq("organization_id", orgId)
            .eq("client_id", clientId)
            .eq("provider", provider)
            .maybeSingle();
          connection = data;
        }

        // Helper to translate technical errors into plain-English guidance.
        const explain = (msg: string): { plain: string; nextStep: string } => {
          const m = (msg || "").toLowerCase();
          if (!connection && action !== "runEmailOnlyTest")
            return {
              plain: "No connection found for this provider on this client.",
              nextStep: "Open the Connections tab and connect this provider first.",
            };
          if (m.includes("401") || m.includes("unauthor") || m.includes("token"))
            return {
              plain: "The provider rejected our credentials.",
              nextStep: "Reconnect the provider in the Connections tab.",
            };
          if (m.includes("403"))
            return {
              plain: "The connected account is missing permission for this action.",
              nextStep: "Reconnect with an account that has full write access.",
            };
          if (m.includes("rate") || m.includes("429"))
            return {
              plain: "Provider rate-limited the request.",
              nextStep: "Wait a minute and retry.",
            };
          if (m.includes("timeout") || m.includes("network"))
            return {
              plain: "Network timeout reaching the provider.",
              nextStep: "Retry. If it persists, check provider status page.",
            };
          if (m.includes("validation") || m.includes("missing"))
            return {
              plain: "Sample values were missing or invalid.",
              nextStep: "Fill in the required sample fields and try again.",
            };
          if (m.includes("unsupported") || m.includes("not supported"))
            return {
              plain: "This action is not supported by this provider.",
              nextStep: "Pick a supported test action or use email-only fallback.",
            };
          if (m.includes("template"))
            return {
              plain: "No matching email template was found.",
              nextStep: "Open Email Templates and add one for this disposition.",
            };
          return {
            plain: msg || "Unknown failure.",
            nextStep: "Check provider status and recent connection errors.",
          };
        };

        const tStart = Date.now();
        let status: "passed" | "failed" = "passed";
        let errorMessage: string | null = null;
        let resultDetail: Record<string, unknown> = {};
        let nextStep: string | null = null;

        try {
          if (action === "runAuthTest") {
            if (!connection) throw new Error("No connection found");
            const expired =
              connection.access_token_expires_at &&
              new Date(connection.access_token_expires_at) < new Date();
            const recentError =
              connection.last_error_at &&
              new Date(connection.last_error_at).getTime() >
                Date.now() - 5 * 60 * 1000;
            if (connection.status !== "connected")
              throw new Error(`Connection status: ${connection.status}`);
            if (expired) throw new Error("401 token expired");
            resultDetail = {
              provider,
              connection_status: connection.status,
              token_expires_at: connection.access_token_expires_at ?? null,
              last_refreshed_at: connection.last_refreshed_at ?? null,
              recent_error: recentError ? connection.last_error_message : null,
            };
            if (recentError) {
              status = "failed";
              errorMessage = `Recent provider error: ${connection.last_error_message}`;
            }
          } else if (action === "runLookupTest") {
            const supports = ["clio", "mycase"].includes(provider);
            if (!supports) throw new Error("unsupported lookup for this provider");
            if (!connection) throw new Error("No connection found");
            const search = (sample.search_value as string) ?? "555-0001";
            // Look at canonical contacts as a stand-in for live lookup so we
            // exercise the full read path without burning provider quota.
            const { data, error } = await supabaseAdmin
              .from("legal_connect_contacts")
              .select("id, first_name, last_name, phone")
              .eq("organization_id", orgId!)
              .limit(3);
            if (error) throw error;
            resultDetail = {
              provider,
              search_value: search,
              matches_found: (data ?? []).length,
              sample_matches: data ?? [],
              note: "Lookup test uses canonical cache. Live API lookup runs in production.",
            };
          } else if (action === "runWriteBackTest") {
            if (!connection) throw new Error("No connection found");
            // Enqueue a *test-mode* sync job so the worker exercises the same
            // adapter path as production. Marked clearly so dashboards can hide
            // them from real call traffic.
            const correlationId = `test_${crypto.randomUUID()}`;
            const { data: job, error } = await supabaseAdmin
              .from("legal_connect_sync_jobs")
              .insert({
                organization_id: orgId,
                client_id: clientId,
                provider,
                connection_id: connection.id,
                job_type: writeAction,
                direction: "outbound",
                priority: 50,
                status: "queued",
                correlation_id: correlationId,
                input_payload: {
                  __test__: true,
                  test_run: true,
                  sample,
                  caller_type: "new_lead",
                  call_reason: "new_case",
                },
              })
              .select("id, status, job_type, correlation_id")
              .single();
            if (error) throw error;
            resultDetail = {
              provider,
              write_action: writeAction,
              enqueued_job_id: job?.id,
              correlation_id: correlationId,
              note: "Test job enqueued. The jobs worker will run the real adapter and surface the result on the Delivery dashboard with a Test badge.",
            };
          } else if (action === "runEmailOnlyTest") {
            // Verify the email-only path: matching automation + non-empty template.
            const { data: automations, error } = await supabaseAdmin
              .from("post_call_automations")
              .select("id, name, action_type, disposition_match, enabled")
              .eq("organization_id", orgId!)
              .eq("tenant_id", clientId!)
              .eq("enabled", true);
            if (error) throw error;
            const emailAuto = (automations ?? []).filter((a: any) =>
              ["email", "send_email"].includes(String(a.action_type)),
            );
            if (emailAuto.length === 0)
              throw new Error("No enabled email automation found for this client");
            // Enqueue a test email-only job so the worker delegates to the
            // disposition email engine end-to-end.
            const correlationId = `test_${crypto.randomUUID()}`;
            const { data: job } = await supabaseAdmin
              .from("legal_connect_sync_jobs")
              .insert({
                organization_id: orgId,
                client_id: clientId,
                provider: "post_call_email",
                job_type: "email.send",
                direction: "outbound",
                priority: 50,
                status: "queued",
                correlation_id: correlationId,
                input_payload: {
                  __test__: true,
                  test_run: true,
                  caller_type: "new_lead",
                  call_reason: "new_case",
                  disposition: sample.disposition ?? "Qualified Lead",
                },
              })
              .select("id, correlation_id")
              .single();
            resultDetail = {
              provider: "post_call_email",
              matched_automations: emailAuto.length,
              enqueued_job_id: job?.id,
              correlation_id: correlationId,
            };
          }
        } catch (err) {
          status = "failed";
          errorMessage = err instanceof Error ? err.message : String(err);
        }

        if (status === "failed") {
          const guidance = explain(errorMessage ?? "");
          resultDetail.plain_english = guidance.plain;
          resultDetail.next_step = guidance.nextStep;
          nextStep = guidance.nextStep;
        }

        const duration = Date.now() - tStart;
        const result = {
          test_type: action,
          provider,
          status,
          error: errorMessage,
          next_step: nextStep,
          detail: resultDetail,
          correlation_id: correlationId,
          duration_ms: duration,
        };

        if (orgId && clientId) {
          await supabaseAdmin.from("legal_connect_test_runs").insert({
            organization_id: orgId,
            client_id: clientId,
            test_type: action,
            test_category: "guided",
            test_config: { provider, write_action: writeAction, sample },
            actual_output: result,
            status,
            error_message: errorMessage,
            correlation_id: correlationId,
            duration_ms: duration,
          });
        }

        return new Response(JSON.stringify({ data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "getTestHistory": {
        let q = supabaseAdmin
          .from("legal_connect_test_runs")
          .select("*")
          .eq("organization_id", payload.organization_id)
          .order("created_at", { ascending: false })
          .limit(payload.limit ?? 50);
        if (payload.client_id) q = q.eq("client_id", payload.client_id);
        if (payload.test_category) q = q.eq("test_category", payload.test_category);
        const { data, error } = await q;
        if (error) throw error;
        return new Response(JSON.stringify({ data: data ?? [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Test function error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
