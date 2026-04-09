import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Retry policy ────────────────────────────────────────────────────

const NON_RETRYABLE = new Set([
  "invalid_signature",
  "unsupported_action",
  "payload_validation_failed",
  "duplicate_event",
]);

function getBackoffMs(attempt: number): number {
  // Exponential backoff: 10s, 30s, 90s, 270s, capped at 15min
  return Math.min(10_000 * Math.pow(3, attempt), 900_000);
}

function classifyFailure(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("429")) return "rate_limited";
  if (lower.includes("timeout") || lower.includes("econnreset")) return "transient_network_error";
  if (lower.includes("unauthorized") || lower.includes("401")) return "token_refresh_failed";
  if (lower.includes("not found") || lower.includes("404")) return "provider_unavailable";
  if (lower.includes("unsupported")) return "unsupported_action";
  if (lower.includes("validation")) return "payload_validation_failed";
  if (lower.includes("502") || lower.includes("503") || lower.includes("504")) return "provider_unavailable";
  return "internal_processing_error";
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

    switch (action) {
      case "processQueue": {
        // Dequeue up to N jobs that are ready
        const batchSize = payload.batch_size ?? 10;

        const { data: jobs, error: fetchErr } = await supabaseAdmin
          .from("legal_connect_sync_jobs")
          .select("*")
          .eq("status", "queued")
          .lte("next_attempt_at", new Date().toISOString())
          .order("priority", { ascending: true })
          .order("next_attempt_at", { ascending: true })
          .limit(batchSize);

        if (fetchErr) throw fetchErr;
        if (!jobs || jobs.length === 0) {
          return new Response(JSON.stringify({ processed: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let processed = 0;
        let failed = 0;
        let deadLettered = 0;

        for (const job of jobs) {
          // Check outage mode
          const { data: config } = await supabaseAdmin
            .from("legal_connect_tenant_configs")
            .select("outage_mode")
            .eq("organization_id", job.organization_id)
            .eq("client_id", job.client_id)
            .maybeSingle();

          if (config?.outage_mode) {
            // Re-queue with paused status
            await supabaseAdmin
              .from("legal_connect_sync_jobs")
              .update({ status: "paused", next_attempt_at: null })
              .eq("id", job.id);
            continue;
          }

          // Mark as processing
          await supabaseAdmin
            .from("legal_connect_sync_jobs")
            .update({
              status: "processing",
              last_attempt_at: new Date().toISOString(),
              attempt_count: job.attempt_count + 1,
            })
            .eq("id", job.id);

          try {
            // ── Process the job ──
            // In production, this would call provider APIs based on job_type.
            // For now, we simulate processing and mark as succeeded.
            // The actual provider dispatch would go here.

            const jobType = job.job_type;
            const inputPayload = job.input_payload as Record<string, unknown> | null;

            // Simulate provider call - placeholder for real implementation
            const result = {
              status: "succeeded",
              output: { job_type: jobType, processed_at: new Date().toISOString() },
            };

            await supabaseAdmin
              .from("legal_connect_sync_jobs")
              .update({
                status: "succeeded",
                succeeded_at: new Date().toISOString(),
                output_payload: result.output,
              })
              .eq("id", job.id);

            // Update event log if linked
            if (job.source_event_log_id) {
              await supabaseAdmin
                .from("legal_connect_event_log")
                .update({ processing_status: "processed", processed_at: new Date().toISOString() })
                .eq("id", job.source_event_log_id);
            }

            processed++;
          } catch (procErr) {
            const errMsg = procErr instanceof Error ? procErr.message : "Unknown error";
            const classification = classifyFailure(errMsg);
            const isRetryable = !NON_RETRYABLE.has(classification);
            const newAttempt = job.attempt_count + 1;

            // Record failure classification
            await supabaseAdmin.from("legal_connect_failure_classifications").insert({
              organization_id: job.organization_id,
              client_id: job.client_id,
              sync_job_id: job.id,
              source_event_log_id: job.source_event_log_id,
              classification,
              is_retryable: isRetryable,
              notes: errMsg,
            });

            if (!isRetryable || newAttempt >= job.max_attempts) {
              // Dead-letter
              await supabaseAdmin
                .from("legal_connect_sync_jobs")
                .update({
                  status: "dead_letter",
                  failed_at: new Date().toISOString(),
                  failure_reason: errMsg,
                  failure_classification: classification,
                })
                .eq("id", job.id);

              // Create review queue item for human decision
              await supabaseAdmin.from("legal_connect_review_queue").insert({
                organization_id: job.organization_id,
                client_id: job.client_id,
                review_type: "dead_letter",
                title: `Dead-lettered sync job: ${job.job_type}`,
                description: `Job failed after ${newAttempt} attempts. Classification: ${classification}. Error: ${errMsg}`,
                provider: job.provider,
                entity_type: job.job_type.split(".")[0] ?? "unknown",
                correlation_id: job.correlation_id,
                context: { job_id: job.id, classification, attempts: newAttempt },
                status: "pending",
              });

              deadLettered++;
            } else {
              // Retry with backoff
              const backoff = getBackoffMs(newAttempt);
              await supabaseAdmin
                .from("legal_connect_sync_jobs")
                .update({
                  status: "queued",
                  failure_reason: errMsg,
                  failure_classification: classification,
                  next_attempt_at: new Date(Date.now() + backoff).toISOString(),
                })
                .eq("id", job.id);

              failed++;
            }
          }
        }

        return new Response(JSON.stringify({ processed, failed, deadLettered, total: jobs.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "replayJob": {
        const { job_id, event_log_id, use_original_rules } = payload;

        let sourceJob: Record<string, unknown> | null = null;
        let sourceEvent: Record<string, unknown> | null = null;

        if (job_id) {
          const { data } = await supabaseAdmin
            .from("legal_connect_sync_jobs")
            .select("*")
            .eq("id", job_id)
            .single();
          sourceJob = data;
        }

        if (event_log_id) {
          const { data } = await supabaseAdmin
            .from("legal_connect_event_log")
            .select("*")
            .eq("id", event_log_id)
            .single();
          sourceEvent = data;
        }

        if (!sourceJob && !sourceEvent) {
          return new Response(JSON.stringify({ error: "Source job or event not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const source = sourceJob ?? sourceEvent!;
        const newCorrelationId = crypto.randomUUID();
        const newIdempotencyKey = `replay:${newCorrelationId}`;

        const { data: replayJob, error: replayErr } = await supabaseAdmin
          .from("legal_connect_sync_jobs")
          .insert({
            organization_id: source.organization_id,
            client_id: source.client_id,
            provider: source.provider,
            job_type: sourceJob ? (source as any).job_type : `${(source as any).source_event_type}`,
            direction: (source as any).direction ?? "inbound",
            priority: 50, // higher priority for replays
            idempotency_key: newIdempotencyKey,
            correlation_id: newCorrelationId,
            source_event_log_id: sourceJob ? (source as any).source_event_log_id : (source as any).id,
            status: "queued",
            input_payload: sourceJob ? (source as any).input_payload : { raw: (source as any).payload, normalized: (source as any).normalized_payload },
            is_replay: true,
            replay_source_id: job_id ?? null,
            next_attempt_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (replayErr) throw replayErr;

        return new Response(JSON.stringify({ replay_job_id: replayJob.id, correlation_id: newCorrelationId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "renewExpiring": {
        // Find subscriptions approaching expiry
        const renewWindow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h from now

        const { data: expiring } = await supabaseAdmin
          .from("legal_connect_webhook_subscriptions")
          .select("*")
          .eq("status", "active")
          .lt("expires_at", renewWindow)
          .order("expires_at", { ascending: true });

        if (!expiring || expiring.length === 0) {
          return new Response(JSON.stringify({ renewed: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let renewed = 0;
        let failedRenewals = 0;

        for (const sub of expiring) {
          try {
            // In production: call provider API to renew webhook
            // For Clio: PUT /webhooks/{id} with new expiry
            // For now, extend by 7 days
            const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            const newRenewAfter = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

            await supabaseAdmin
              .from("legal_connect_webhook_subscriptions")
              .update({
                expires_at: newExpiry,
                renew_after: newRenewAfter,
                failure_count: 0,
              })
              .eq("id", sub.id);

            renewed++;
          } catch (renewErr) {
            const errMsg = renewErr instanceof Error ? renewErr.message : "Renewal failed";

            await supabaseAdmin
              .from("legal_connect_webhook_subscriptions")
              .update({
                failure_count: (sub.failure_count ?? 0) + 1,
                status: (sub.failure_count ?? 0) + 1 >= 3 ? "unhealthy" : "active",
              })
              .eq("id", sub.id);

            await supabaseAdmin.from("legal_connect_failure_classifications").insert({
              organization_id: sub.organization_id,
              client_id: sub.client_id,
              classification: "renewal_failed",
              is_retryable: true,
              notes: `Webhook renewal failed for ${sub.provider}: ${errMsg}`,
            });

            failedRenewals++;
          }
        }

        return new Response(JSON.stringify({ renewed, failedRenewals, checked: expiring.length }), {
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
    console.error("Job processor error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
