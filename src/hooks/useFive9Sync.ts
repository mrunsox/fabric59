import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function inferRole(extension: string): string {
  const ext = parseInt(extension, 10);
  if (isNaN(ext)) return 'Unknown';
  if (ext >= 0 && ext <= 99) return 'Manager';
  if (ext >= 1000 && ext <= 1100) return 'English Support';
  if (ext >= 2000 && ext <= 2100) return 'French Support';
  if (ext >= 3000 && ext <= 3100) return 'Spanish Support';
  if (ext >= 4000 && ext <= 4100) return 'Trilingual Support';
  if (ext >= 5000 && ext <= 5100) return 'Supervisor';
  if (ext >= 6000 && ext <= 6100) return 'QA Specialist';
  if (ext >= 7000 && ext <= 7100) return 'Tech Support';
  return 'Agent';
}

interface SyncResult {
  agentsAdded: number;
  tenantsAdded: number;
}

export function useFive9Sync() {
  const [isSyncing, setIsSyncing] = useState(false);

  const syncFromFive9 = useCallback(async (organizationId?: string): Promise<SyncResult | null> => {
    setIsSyncing(true);
    try {
      // 1. Fetch users + skills from Five9
      const { data, error: fnError } = await supabase.functions.invoke('five9-provisioning', {
        body: { action: 'syncFromFive9' },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Sync failed');

      const users = data.users as Array<{
        firstName: string; lastName: string; email: string;
        userName: string; extension: string; active: boolean;
      }>;
      const skills = data.skills as string[];

      // 2. Get existing agents by five9_username to avoid duplicates
      const { data: existingAgents } = await supabase
        .from('agents')
        .select('five9_username');
      const existingUsernames = new Set((existingAgents || []).map(a => a.five9_username));

      // 3. Insert new agents
      const newAgents = users
        .filter(u => u.userName && !existingUsernames.has(u.userName))
        .map(u => ({
          first_name: u.firstName,
          last_name: u.lastName,
          email: u.email || `${u.userName}@five9.local`,
          role: inferRole(u.extension),
          extension: u.extension || null,
          five9_username: u.userName,
          status: u.active ? 'active' : 'inactive',
        }));

      if (newAgents.length > 0) {
        const { error: insertErr } = await supabase.from('agents').insert(newAgents);
        if (insertErr) console.error('Agent insert error:', insertErr);
      }

      // 4. Get existing tenants by name to avoid duplicates
      const { data: existingTenants } = await supabase
        .from('tenants')
        .select('name');
      const existingNames = new Set((existingTenants || []).map(t => t.name));

      // 5. Insert new tenants (skills → clients)
      const newTenants = skills
        .filter(s => !existingNames.has(s))
        .map(s => ({
          name: s,
          crm_type: 'other' as const,
          status: 'active',
          ...(organizationId ? { organization_id: organizationId } : {}),
        }));

      if (newTenants.length > 0) {
        const { error: insertErr } = await supabase.from('tenants').insert(newTenants);
        if (insertErr) console.error('Tenant insert error:', insertErr);
      }

      const result = { agentsAdded: newAgents.length, tenantsAdded: newTenants.length };
      toast.success(`Synced: ${result.agentsAdded} new agents, ${result.tenantsAdded} new clients`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      toast.error(msg);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { syncFromFive9, isSyncing };
}
