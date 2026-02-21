import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProvisioningInput, ProvisioningResult, ProvisioningStep, ProvisioningHistory, PROVISIONING_STEPS, AgentRole } from "@/types/provisioning";
import { useAuditLog } from "./useAuditLog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function initSteps(): ProvisioningStep[] {
  return PROVISIONING_STEPS.map(s => ({ ...s, status: 'pending' as const }));
}

export function useProvisioning() {
  const [steps, setSteps] = useState<ProvisioningStep[]>(initSteps());
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [lastResult, setLastResult] = useState<ProvisioningResult | null>(null);
  const [history, setHistory] = useState<ProvisioningHistory[]>([]);
  const { logAction } = useAuditLog();

  const updateStep = (id: string, patch: Partial<ProvisioningStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const refreshAgents = useCallback(async () => {
    const { data } = await db.from('agents').select('*').order('created_at', { ascending: false });
    if (data) {
      setHistory(data.map((a: Record<string, unknown>) => ({
        id: a.id,
        agentName: `${a.first_name} ${a.last_name}`,
        email: a.email,
        role: a.role,
        extension: parseInt(String(a.extension || '0'), 10),
        status: a.status as ProvisioningHistory['status'],
        createdAt: new Date(String(a.created_at)),
        externalEmailSent: false,
        five9Username: a.five9_username ?? undefined,
      })));
    }
  }, []);

  useEffect(() => {
    refreshAgents();
  }, [refreshAgents]);

  const provisionAgent = async (input: ProvisioningInput): Promise<ProvisioningResult> => {
    setIsProvisioning(true);
    const freshSteps = initSteps();
    setSteps(freshSteps);

    const [firstName, ...lastParts] = input.agentName.trim().split(' ');
    const lastName = lastParts.join(' ') || '';
    const email = input.emailHandle;
    let googleUserId: string | null = null;
    let slackUserId: string | null = null;
    let allSuccess = true;

    // Step 1 — Google Workspace
    updateStep('google-workspace', { status: 'active' });
    try {
      const { data } = await supabase.functions.invoke('google-workspace', {
        body: { action: 'createUser', primaryEmail: email, givenName: firstName, familyName: lastName, password: input.password },
      });
      if (data?.success) {
        googleUserId = data.googleUserId;
        updateStep('google-workspace', { status: 'complete' });
      } else {
        updateStep('google-workspace', { status: 'error', errorMessage: data?.error || 'Skipped — secrets not configured' });
      }
    } catch {
      updateStep('google-workspace', { status: 'error', errorMessage: 'Google Workspace unavailable' });
    }

    // Step 2 — Password generation
    updateStep('password-generation', { status: 'active' });
    await delay(800);
    updateStep('password-generation', { status: 'complete' });

    // Step 3 — Slack invitation (real)
    updateStep('slack-invitation', { status: 'active' });
    try {
      const { data: slackData } = await supabase.functions.invoke('slack-agent', {
        body: {
          action: 'inviteUser',
          email,
          agentName: input.agentName,
          channels: input.role.slackChannels,
        },
      });
      updateStep('slack-invitation', {
        status: slackData?.success ? 'complete' : 'error',
        errorMessage: slackData?.error,
      });
      if (slackData?.slackUserId) {
        slackUserId = slackData.slackUserId;
      }
    } catch {
      updateStep('slack-invitation', { status: 'error', errorMessage: 'Slack unavailable' });
    }

    // Step 4 — Five9
    updateStep('five9-creation', { status: 'active' });
    let five9UserId: string | null = null;
    try {
      const { data } = await supabase.functions.invoke('five9-provisioning', {
        body: {
          action: 'create',
          firstName,
          lastName,
          email,
          username: input.five9Username,
          extension: String(input.extension),
          role: input.role.five9RoleName,
          password: input.password,
        },
      });
      if (data?.success) {
        five9UserId = data.five9UserId;
        updateStep('five9-creation', { status: 'complete' });
        if (input.skills && input.skills.length > 0) {
          await supabase.functions.invoke('five9-provisioning', {
            body: { action: 'addSkillsToUser', username: input.five9Username, skills: input.skills },
          });
        }
      } else {
        updateStep('five9-creation', { status: 'error', errorMessage: data?.error || 'Five9 creation failed' });
        allSuccess = false;
      }
    } catch {
      updateStep('five9-creation', { status: 'error', errorMessage: 'Five9 unavailable' });
      allSuccess = false;
    }

    // Step 5 — Credential delivery
    updateStep('credential-delivery', { status: 'active' });
    try {
      const { data } = await supabase.functions.invoke('send-credentials', {
        body: {
          agentName: input.agentName,
          email,
          five9Username: input.five9Username,
          extension: String(input.extension),
          role: input.role.name,
          password: input.password,
          toEmail: input.externalEmail,
          organizationId: input.organizationId ?? null,
        },
      });
      updateStep('credential-delivery', { status: data?.success ? 'complete' : 'error', errorMessage: data?.error });
    } catch {
      updateStep('credential-delivery', { status: 'error', errorMessage: 'Email delivery failed' });
    }

    const finalStatus = allSuccess ? 'active' : 'failed';
    const { data: { user } } = await supabase.auth.getUser();
    const { data: agentData } = await db.from('agents').insert({
      first_name: firstName,
      last_name: lastName,
      email,
      role: input.role.name,
      extension: String(input.extension),
      five9_username: input.five9Username,
      five9_user_id: five9UserId,
      google_user_id: googleUserId,
      slack_user_id: slackUserId,
      status: finalStatus,
      provisioned_by: user?.id ?? null,
    }).select().single();

    await logAction({
      action: `agent_${finalStatus === 'active' ? 'provisioned' : 'provision_failed'}`,
      entity_type: 'agent',
      entity_id: agentData?.id,
      details: { agentName: input.agentName, role: input.role.name, extension: input.extension },
    });

    const currentSteps = PROVISIONING_STEPS.map(s => ({
      ...s,
      status: 'complete' as const,
    }));

    const result: ProvisioningResult = {
      id: agentData?.id || crypto.randomUUID(),
      agentName: input.agentName,
      email,
      password: input.password,
      extension: input.extension,
      role: input.role.name,
      five9Username: input.five9Username,
      createdAt: new Date(),
      status: allSuccess ? 'success' : 'partial',
      steps: currentSteps,
    };

    setLastResult(result);
    setIsProvisioning(false);
    await refreshAgents();
    return result;
  };

  const resetProvisioning = () => {
    setSteps(initSteps());
    setLastResult(null);
  };

  const findNextExtension = useCallback(async (role: AgentRole): Promise<number | null> => {
    const { start, end } = { start: role.extensionRangeStart, end: role.extensionRangeEnd };
    const usedSet = new Set<number>();

    // Get extensions used in local agents table
    const { data: localAgents } = await db.from('agents').select('extension').neq('status', 'deprovisioned');
    if (localAgents) {
      for (const a of localAgents) {
        const ext = parseInt(String(a.extension || '0'), 10);
        if (ext >= start && ext <= end) usedSet.add(ext);
      }
    }

    // Get extensions used in Five9
    try {
      const { data } = await supabase.functions.invoke('five9-provisioning', { body: { action: 'getExtensions' } });
      if (data?.success && Array.isArray(data.extensions)) {
        for (const e of data.extensions) {
          const ext = parseInt(String(e), 10);
          if (ext >= start && ext <= end) usedSet.add(ext);
        }
      }
    } catch { /* ignore */ }

    for (let i = start; i <= end; i++) {
      if (!usedSet.has(i)) return i;
    }
    return null;
  }, []);

  return { steps, isProvisioning, lastResult, history, provisionAgent, resetProvisioning, refreshAgents, findNextExtension };
}
