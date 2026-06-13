import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isServiceRoleRequest } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const cronSecret = req.headers.get('x-cron-secret') ?? '';
    let isCron = false;
    if (cronSecret) {
      const { data: row } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'process_jobs_cron_secret')
        .maybeSingle();
      isCron = !!row?.value && row.value === cronSecret;
    }

    if (!isServiceRoleRequest(req) && !isCron) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch pending jobs that are due
    const { data: jobs, error: fetchError } = await supabase
      .from('scheduled_jobs')
      .select('*, agents(*)')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(10);

    if (fetchError) throw fetchError;

    const results: Array<{ jobId: string; status: string; error?: string }> = [];

    for (const job of (jobs || [])) {
      try {
        // Mark as processing
        await supabase.from('scheduled_jobs').update({ status: 'processing' }).eq('id', job.id);

        if (job.job_type === 'deprovisioning') {
          const agent = job.agents;
          const username = agent?.five9_username || agent?.email;

          if (username) {
            // Call five9-provisioning to deactivate
            await fetch(`${SUPABASE_URL}/functions/v1/five9-provisioning`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ action: 'deactivate', username }),
            });
          }

          // Update agent status
          await supabase.from('agents')
            .update({ status: 'deprovisioned', deprovisioned_at: new Date().toISOString() })
            .eq('id', job.agent_id);

        } else if (job.job_type === 'data_transfer') {
          console.log(`Data transfer job ${job.id} - stub implementation`);
        } else if (job.job_type === 'cleanup') {
          console.log(`Cleanup job ${job.id} - stub implementation`);
        }

        // Mark completed
        await supabase.from('scheduled_jobs').update({
          status: 'completed',
          result: { completed_at: new Date().toISOString() },
        }).eq('id', job.id);

        // Log audit entry
        await supabase.from('audit_logs').insert({
          action: `job_completed_${job.job_type}`,
          entity_type: 'scheduled_job',
          entity_id: job.id,
          details: { job_type: job.job_type, agent_id: job.agent_id },
        });

        results.push({ jobId: job.id, status: 'completed' });
      } catch (jobError) {
        const errorMsg = jobError instanceof Error ? jobError.message : 'Unknown error';
        await supabase.from('scheduled_jobs').update({
          status: 'failed',
          error_message: errorMsg,
        }).eq('id', job.id);
        results.push({ jobId: job.id, status: 'failed', error: errorMsg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Process jobs error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
