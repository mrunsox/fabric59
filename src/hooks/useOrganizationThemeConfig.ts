/**
 * Vertical Skin System — Phase 3
 * Read/write hook for `organizations.integration_configs.theme`, plus a
 * resolved-skin selector that optionally layers partner overrides.
 *
 * No <SkinProvider> mount yet. These hooks are inert consumers — UI
 * surfaces wire up in Phase 4.
 */

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  readThemeConfig,
  resolveOrganizationTheme,
  serializeThemeConfig,
  type ThemeConfig,
  type ThemeConfigSource,
} from "@/lib/skins/themeConfig";
import type { ResolvedTheme } from "@/lib/theme/types";

const ORG_THEME_QUERY_KEY = ["organization", "theme-config"] as const;

interface OrgThemeRow extends ThemeConfigSource {
  id: string;
  partner_id?: string | null;
}

interface PartnerThemeRow extends ThemeConfigSource {
  id: string;
}

async function fetchOrgRow(orgId: string): Promise<OrgThemeRow | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, integration_configs, brand_name, brand_logo_url, brand_primary_color")
    .eq("id", orgId)
    .maybeSingle();
  if (error) throw error;
  return (data as OrgThemeRow | null) ?? null;
}

async function fetchPartnerRow(partnerId: string): Promise<PartnerThemeRow | null> {
  // partners table is loosely typed in this project; cast at the boundary only.
  const { data, error } = await supabase
    .from("partners" as never)
    .select("id, integration_configs, brand_name, brand_logo_url, brand_primary_color")
    .eq("id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PartnerThemeRow | null) ?? null;
}

/**
 * Read the current organization's theme config (skin + branding overrides).
 * Returns a normalized `ThemeConfig` that always has a valid `skinId`.
 */
export function useOrganizationThemeConfig() {
  const { organization } = useAuth();

  const query = useQuery({
    queryKey: [...ORG_THEME_QUERY_KEY, organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      return fetchOrgRow(organization.id);
    },
    enabled: !!organization?.id,
  });

  const config: ThemeConfig = useMemo(
    () => readThemeConfig(query.data ?? null),
    [query.data],
  );

  return {
    config,
    rawRow: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Persist a `ThemeConfig` to the organization carrier without disturbing
 * unrelated `integration_configs` slices.
 */
export function useUpdateOrganizationThemeConfig() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (next: ThemeConfig) => {
      if (!organization?.id) throw new Error("No organization selected");
      const existing = await fetchOrgRow(organization.id);
      const newConfigs = serializeThemeConfig(
        existing?.integration_configs ?? {},
        next,
      );
      const { error } = await supabase
        .from("organizations")
        .update({ integration_configs: newConfigs })
        .eq("id", organization.id);
      if (error) throw error;
      return next;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_THEME_QUERY_KEY });
      toast.success("Theme updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update theme: ${error.message}`);
    },
  });
}

/**
 * Optional partner-layer read. Partner write support is intentionally
 * out of scope for Phase 3 (no clean typed mutation path for the loosely
 * typed partners table yet); admin UI may extend this in a later phase.
 */
export function usePartnerThemeConfig(partnerId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["partner", "theme-config", partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      return fetchPartnerRow(partnerId);
    },
    enabled: !!partnerId,
  });

  const config: ThemeConfig = useMemo(
    () => readThemeConfig(query.data ?? null),
    [query.data],
  );

  return {
    config,
    rawRow: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Compose the final resolved theme for the active organization, layering
 * partner overrides underneath org overrides. Phase 4 will feed this
 * into the SkinProvider; for now it is an inert selector.
 */
export function useResolvedSkin(): {
  theme: ResolvedTheme;
  isLoading: boolean;
} {
  const { organization } = useAuth();
  const org = useOrganizationThemeConfig();
  const partner = usePartnerThemeConfig(
    (organization as unknown as { partner_id?: string | null } | null)
      ?.partner_id ?? null,
  );

  const theme = useMemo(
    () =>
      resolveOrganizationTheme({
        organization: org.rawRow,
        partner: partner.rawRow,
      }),
    [org.rawRow, partner.rawRow],
  );

  return { theme, isLoading: org.isLoading || partner.isLoading };
}
