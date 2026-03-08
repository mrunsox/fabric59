import { useMemo, useCallback } from "react";
import { useTenant, useUpdateTenant } from "@/hooks/useTenants";
import type { IntegrationConfigs } from "@/types/integrations";

export function useClientIntegrationConfigs(clientId: string) {
  const { data: tenant, isLoading, error } = useTenant(clientId);
  const updateTenant = useUpdateTenant();

  const configs = useMemo<IntegrationConfigs | null>(() => {
    if (!tenant) return null;
    return (tenant.integration_configs as unknown as IntegrationConfigs) ?? {};
  }, [tenant]);

  const clioRules = configs?.clio?.rules ?? null;
  const mycaseRules = configs?.mycase?.rules ?? null;
  const isClioConnected = !!configs?.clio?.oauthTokenId;
  const isMyCaseConnected = !!configs?.mycase?.apiKeyId;
  const isClioEnabled = !!configs?.clio?.enabled;
  const isMyCaseEnabled = !!configs?.mycase?.enabled;

  const saveConfigs = useCallback(
    async (next: IntegrationConfigs) => {
      await updateTenant.mutateAsync({
        id: clientId,
        data: { integration_configs: next as unknown as Record<string, string> },
      });
    },
    [clientId, updateTenant]
  );

  return {
    configs,
    isLoading,
    error,
    clioRules,
    mycaseRules,
    isClioConnected,
    isMyCaseConnected,
    isClioEnabled,
    isMyCaseEnabled,
    saveConfigs,
    isSaving: updateTenant.isPending,
  };
}
