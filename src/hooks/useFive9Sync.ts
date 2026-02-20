import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SyncResult {
  agentsAdded: number;
  tenantsAdded: number;
}

export function useFive9Sync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const syncFromFive9 = useCallback(async (organizationId?: string): Promise<SyncResult | null> => {
    setIsSyncing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('five9-provisioning', {
        body: { action: 'syncFromFive9', organizationId },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Sync failed');

      const result: SyncResult = {
        agentsAdded: data.agentsAdded ?? 0,
        tenantsAdded: data.tenantsAdded ?? 0,
      };

      toast.success(`Synced: ${result.agentsAdded} new agents, ${result.tenantsAdded} new clients`);

      // Invalidate caches so UI refreshes immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: ["tenants"] }),
      ]);

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      toast.error(msg);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient]);

  return { syncFromFive9, isSyncing };
}
