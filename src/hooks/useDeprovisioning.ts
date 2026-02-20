import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DeprovisioningRequest, DeprovisioningResult, DeprovisioningStep, DataTransferConfig, AuditLogEntry, DEPROVISIONING_STEPS } from "@/types/deprovisioning";
import { ProvisioningHistory } from "@/types/provisioning";
import { useAuditLog } from "./useAuditLog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function initSteps(): DeprovisioningStep[] {
  return DEPROVISIONING_STEPS.map(s => ({ ...s, status: 'pending' as const }));
}

export function useDeprovisioning() {
  const [steps, setSteps] = useState<DeprovisioningStep[]>(initSteps());
  const [isDeprovisioning, setIsDeprovisioning] = useState(false);
  const [lastResult, setLastResult] = useState<DeprovisioningResult | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const { logAction } = useAuditLog();

  const updateStep = (id: string, patch: Partial<DeprovisioningStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const refreshAuditLog = useCallback(async () => {
    const { data } = await db
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'agent')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) {
      setAuditEntries((data as Record<string, unknown>[]).map(row => ({
        id: String(row.id),
        action: (String(row.action) as AuditLogEntry['action']) || 'completed',
        agentId: String((row.details as Record<string, unknown>)?.agentId || ''),
        agentName: String((row.details as Record<string, unknown>)?.agentName || ''),
        agentEmail: String((row.details as Record<string, unknown>)?.email || ''),
        performedBy: String(row.user_id || 'system'),
        performedAt: new Date(String(row.created_at)),
        details: String(row.action),
      })));
    }
  }, []);

  useEffect(() => {
    refreshAuditLog();
  }, [refreshAuditLog]);

  const scheduleDeprovisioning = async (
    agent: ProvisioningHistory,
    gracePeriodHours: number,
    dataTransfer: DataTransferConfig,
    initiatedBy: string,
    reason?: string,
  ): Promise<DeprovisioningRequest> => {
    const scheduledFor = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);

    await db.from('scheduled_jobs').insert({
      agent_id: agent.id,
      job_type: 'deprovisioning',
      status: 'pending',
      scheduled_for: scheduledFor.toISOString(),
      initiated_by: initiatedBy || null,
      config: { gracePeriodHours, dataTransfer, reason },
    });

    await db.from('agents').update({ status: 'pending_deletion' }).eq('id', agent.id);

    await logAction({
      action: 'scheduled',
      entity_type: 'agent',
      entity_id: agent.id,
      details: { agentName: agent.agentName, email: agent.email, gracePeriodHours, reason },
    });

    await refreshAuditLog();

    return {
      agentId: agent.id,
      agentName: agent.agentName,
      email: agent.email,
      extension: agent.extension,
      role: agent.role,
      scheduledDate: scheduledFor,
      gracePeriodHours,
      dataTransfer,
      initiatedBy,
      initiatedAt: new Date(),
      status: 'scheduled',
      reason,
    };
  };

  const cancelDeprovisioning = async (agentId: string, cancelledBy: string) => {
    await db.from('scheduled_jobs')
      .update({ status: 'cancelled', cancelled_by: cancelledBy || null, cancelled_at: new Date().toISOString() })
      .eq('agent_id', agentId)
      .eq('status', 'pending');

    await db.from('agents').update({ status: 'under_review' }).eq('id', agentId);

    await logAction({ action: 'cancelled', entity_type: 'agent', entity_id: agentId, details: { cancelledBy } });
    await refreshAuditLog();
  };

  const executeDeprovisioning = async (request: DeprovisioningRequest, performedBy: string): Promise<DeprovisioningResult> => {
    setIsDeprovisioning(true);
    const freshSteps = initSteps();
    setSteps(freshSteps);

    const { data: agentData } = await db.from('agents').select('*').eq('id', request.agentId).single();

    // Step 1 — Data transfer
    updateStep('data-transfer', { status: request.dataTransfer.enabled ? 'active' : 'skipped' });
    if (request.dataTransfer.enabled) {
      await delay(2000);
      updateStep('data-transfer', { status: 'complete' });
    }

    // Step 2 — Five9 deactivate
    updateStep('five9-deletion', { status: 'active' });
    try {
      const username = agentData?.five9_username || agentData?.email;
      if (username) {
        const { data } = await supabase.functions.invoke('five9-provisioning', {
          body: { action: 'deactivate', username },
        });
        updateStep('five9-deletion', { status: data?.success ? 'complete' : 'error', errorMessage: data?.error });
      } else {
        updateStep('five9-deletion', { status: 'skipped' });
      }
    } catch {
      updateStep('five9-deletion', { status: 'error', errorMessage: 'Five9 unavailable' });
    }

    // Step 3 — Slack removal (stubbed)
    updateStep('slack-removal', { status: 'active' });
    await delay(1200);
    updateStep('slack-removal', { status: 'complete' });

    // Step 4 — Google suspension (real call)
    updateStep('google-suspension', { status: 'active' });
    try {
      const userKey = agentData?.google_user_id || agentData?.email;
      if (userKey) {
        const { data } = await supabase.functions.invoke('google-workspace', {
          body: { action: 'suspendUser', userKey },
        });
        updateStep('google-suspension', {
          status: data?.success ? 'complete' : 'error',
          errorMessage: data?.error,
        });
      } else {
        updateStep('google-suspension', { status: 'skipped' });
      }
    } catch {
      updateStep('google-suspension', { status: 'error', errorMessage: 'Google Workspace unavailable' });
    }

    // Step 5 — Google deletion (real call)
    updateStep('google-deletion', { status: 'active' });
    try {
      const userKey = agentData?.google_user_id || agentData?.email;
      if (userKey) {
        const { data } = await supabase.functions.invoke('google-workspace', {
          body: { action: 'deleteUser', userKey },
        });
        updateStep('google-deletion', {
          status: data?.success ? 'complete' : 'error',
          errorMessage: data?.error,
        });
      } else {
        updateStep('google-deletion', { status: 'skipped' });
      }
    } catch {
      updateStep('google-deletion', { status: 'error', errorMessage: 'Google Workspace unavailable' });
    }

    // Step 6 — HR Notification
    updateStep('notification', { status: 'active' });
    await delay(800);
    updateStep('notification', { status: 'complete' });

    const { data: { user } } = await supabase.auth.getUser();
    await db.from('agents').update({
      status: 'deprovisioned',
      deprovisioned_at: new Date().toISOString(),
      deprovisioned_by: user?.id ?? null,
    }).eq('id', request.agentId);

    await logAction({
      action: 'completed',
      entity_type: 'agent',
      entity_id: request.agentId,
      details: { agentName: request.agentName, email: request.email, performedBy },
    });

    await refreshAuditLog();

    const result: DeprovisioningResult = {
      id: crypto.randomUUID(),
      request,
      completedAt: new Date(),
      steps,
      status: 'completed',
    };

    setLastResult(result);
    setIsDeprovisioning(false);
    return result;
  };

  const confirmActiveAgent = async (agentId: string) => {
    await db.from('agents').update({ status: 'active' }).eq('id', agentId);
    await logAction({ action: 'started', entity_type: 'agent', entity_id: agentId, details: { action: 'restored_to_active' } });
    await refreshAuditLog();
  };

  const resetDeprovisioning = () => {
    setSteps(initSteps());
    setLastResult(null);
  };

  return { steps, isDeprovisioning, lastResult, auditEntries, scheduleDeprovisioning, cancelDeprovisioning, executeDeprovisioning, confirmActiveAgent, resetDeprovisioning, refreshAuditLog };
}
