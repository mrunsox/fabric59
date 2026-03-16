/**
 * useTenants — CRUD hooks for the tenants (clients) table.
 *
 * All integration credentials are now stored in the `integration_configs` JSONB
 * column using the IntegrationConfigsUnified structure. Individual flat columns
 * are kept for backward compatibility but are no longer read by the UI.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant, TenantFormData, CrmType, TenantStatus, NotificationTriggers } from "@/types/database";
import type { IntegrationConfigsUnified } from "@/types/integrations";
import { toast } from "sonner";

const DEFAULT_NOTIFICATION_TRIGGERS: NotificationTriggers = {
  intake_created: false,
  call_ended: false,
  contact_updated: false,
};

function mapRow(row: Record<string, unknown>): Tenant {
  const ic = (row.integration_configs as IntegrationConfigsUnified) || {};
  return {
    id: row.id as string,
    name: row.name as string,
    organization_id: (row.organization_id as string) ?? null,
    partner_id: (row.partner_id as string) ?? null,
    five9_domain_id: (row.five9_domain_id as string) ?? null,
    crm_type: row.crm_type as CrmType,
    crm_api_url: ic.crm?.api_url ?? (row.crm_api_url as string | null),
    crm_api_key: ic.crm?.api_key ?? (row.crm_api_key as string | null),
    custom_mappings: (row.custom_mappings || {}) as Record<string, unknown>,
    webhook_url: ic.webhooks?.general ?? (row.webhook_url as string | null),
    slack_webhook_url: ic.webhooks?.slack ?? (row.slack_webhook_url as string | null),
    zapier_webhook_url: ic.webhooks?.zapier ?? (row.zapier_webhook_url as string | null),
    make_webhook_url: ic.webhooks?.make ?? (row.make_webhook_url as string | null),
    pabbly_webhook_url: ic.webhooks?.pabbly ?? (row.pabbly_webhook_url as string | null),
    n8n_webhook_url: ic.webhooks?.n8n ?? (row.n8n_webhook_url as string | null),
    teams_webhook_url: ic.webhooks?.teams ?? (row.teams_webhook_url as string | null),
    twilio_account_sid: ic.twilio?.account_sid ?? (row.twilio_account_sid as string | null),
    twilio_auth_token: ic.twilio?.auth_token ?? (row.twilio_auth_token as string | null),
    twilio_from_number: ic.twilio?.from_number ?? (row.twilio_from_number as string | null),
    zoom_api_key: ic.scheduling?.zoom_api_key ?? (row.zoom_api_key as string | null),
    google_calendar_id: ic.scheduling?.google_calendar_id ?? (row.google_calendar_id as string | null),
    stripe_api_key: ic.billing?.stripe_api_key ?? (row.stripe_api_key as string | null),
    quickbooks_api_key: ic.billing?.quickbooks_api_key ?? (row.quickbooks_api_key as string | null),
    calendly_api_key: ic.scheduling?.calendly_api_key ?? (row.calendly_api_key as string | null),
    docusign_api_key: ic.documents?.docusign_api_key ?? (row.docusign_api_key as string | null),
    dropbox_api_key: ic.documents?.dropbox_api_key ?? (row.dropbox_api_key as string | null),
    microsoft365_api_key: ic.scheduling?.microsoft365_api_key ?? (row.microsoft365_api_key as string | null),
    asana_api_key: ic.scheduling?.asana_api_key ?? (row.asana_api_key as string | null),
    openai_api_key: ic.ai?.openai_api_key ?? (row.openai_api_key as string | null),
    power_automate_webhook_url: ic.webhooks?.power_automate ?? (row.power_automate_webhook_url as string | null),
    billing_rate_per_minute: (row.billing_rate_per_minute as number | null) ?? null,
    five9_campaign_identifier: (row.five9_campaign_identifier as string | null) ?? null,
    integration_configs: ic as Record<string, string>,
    notification_triggers: (row.notification_triggers as unknown as NotificationTriggers) || DEFAULT_NOTIFICATION_TRIGGERS,
    status: row.status as TenantStatus,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** Build the integration_configs JSONB from form data */
function buildIntegrationConfigs(data: Partial<TenantFormData>): IntegrationConfigsUnified {
  const existing = ((data as any).integration_configs || {}) as IntegrationConfigsUnified;
  return {
    ...existing,
    webhooks: {
      ...(existing.webhooks || {}),
      slack: data.slack_webhook_url || undefined,
      zapier: data.zapier_webhook_url || undefined,
      make: data.make_webhook_url || undefined,
      pabbly: data.pabbly_webhook_url || undefined,
      n8n: data.n8n_webhook_url || undefined,
      teams: data.teams_webhook_url || undefined,
      power_automate: (data as any).power_automate_webhook_url || undefined,
      general: data.webhook_url || undefined,
    },
    twilio: {
      account_sid: data.twilio_account_sid || undefined,
      auth_token: data.twilio_auth_token || undefined,
      from_number: data.twilio_from_number || undefined,
    },
    scheduling: {
      zoom_api_key: (data as any).zoom_api_key || undefined,
      google_calendar_id: (data as any).google_calendar_id || undefined,
      calendly_api_key: (data as any).calendly_api_key || undefined,
      microsoft365_api_key: (data as any).microsoft365_api_key || undefined,
      asana_api_key: (data as any).asana_api_key || undefined,
    },
    billing: {
      stripe_api_key: (data as any).stripe_api_key || undefined,
      quickbooks_api_key: (data as any).quickbooks_api_key || undefined,
    },
    documents: {
      docusign_api_key: (data as any).docusign_api_key || undefined,
      dropbox_api_key: (data as any).dropbox_api_key || undefined,
    },
    ai: {
      openai_api_key: (data as any).openai_api_key || undefined,
    },
    crm: {
      api_url: data.crm_api_url || undefined,
      api_key: data.crm_api_key || undefined,
    },
  };
}

export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: async (): Promise<Tenant[]> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => mapRow(row as Record<string, unknown>));
    },
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: ["tenants", id],
    queryFn: async (): Promise<Tenant | null> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      if (!data) return null;
      return mapRow(data as Record<string, unknown>);
    },
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TenantFormData) => {
      const ic = buildIntegrationConfigs(data);
      const { error } = await supabase.from("tenants").insert([{
        name: data.name,
        partner_id: (data as any).partner_id || null,
        crm_type: data.crm_type,
        crm_api_url: data.crm_api_url || null,
        crm_api_key: data.crm_api_key || null,
        webhook_url: data.webhook_url || null,
        slack_webhook_url: data.slack_webhook_url || null,
        zapier_webhook_url: data.zapier_webhook_url || null,
        make_webhook_url: data.make_webhook_url || null,
        pabbly_webhook_url: data.pabbly_webhook_url || null,
        n8n_webhook_url: data.n8n_webhook_url || null,
        teams_webhook_url: data.teams_webhook_url || null,
        twilio_account_sid: data.twilio_account_sid || null,
        twilio_auth_token: data.twilio_auth_token || null,
        twilio_from_number: data.twilio_from_number || null,
        zoom_api_key: (data as any).zoom_api_key || null,
        google_calendar_id: (data as any).google_calendar_id || null,
        stripe_api_key: (data as any).stripe_api_key || null,
        quickbooks_api_key: (data as any).quickbooks_api_key || null,
        calendly_api_key: (data as any).calendly_api_key || null,
        docusign_api_key: (data as any).docusign_api_key || null,
        dropbox_api_key: (data as any).dropbox_api_key || null,
        microsoft365_api_key: (data as any).microsoft365_api_key || null,
        asana_api_key: (data as any).asana_api_key || null,
        openai_api_key: (data as any).openai_api_key || null,
        power_automate_webhook_url: (data as any).power_automate_webhook_url || null,
        integration_configs: ic as unknown as Record<string, string>,
        notification_triggers: data.notification_triggers as unknown as Record<string, boolean>,
        status: data.status,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant created successfully");
    },
    onError: (error: Error) => toast.error(`Failed to create tenant: ${error.message}`),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TenantFormData> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if ((data as any).partner_id !== undefined) updateData.partner_id = (data as any).partner_id || null;
      if (data.crm_type !== undefined) updateData.crm_type = data.crm_type;
      if (data.crm_api_url !== undefined) updateData.crm_api_url = data.crm_api_url || null;
      if (data.crm_api_key !== undefined) updateData.crm_api_key = data.crm_api_key || null;
      if (data.webhook_url !== undefined) updateData.webhook_url = data.webhook_url || null;
      if (data.slack_webhook_url !== undefined) updateData.slack_webhook_url = data.slack_webhook_url || null;
      if (data.zapier_webhook_url !== undefined) updateData.zapier_webhook_url = data.zapier_webhook_url || null;
      if (data.make_webhook_url !== undefined) updateData.make_webhook_url = data.make_webhook_url || null;
      if (data.pabbly_webhook_url !== undefined) updateData.pabbly_webhook_url = data.pabbly_webhook_url || null;
      if (data.n8n_webhook_url !== undefined) updateData.n8n_webhook_url = data.n8n_webhook_url || null;
      if (data.teams_webhook_url !== undefined) updateData.teams_webhook_url = data.teams_webhook_url || null;
      if (data.twilio_account_sid !== undefined) updateData.twilio_account_sid = data.twilio_account_sid || null;
      if (data.twilio_auth_token !== undefined) updateData.twilio_auth_token = data.twilio_auth_token || null;
      if (data.twilio_from_number !== undefined) updateData.twilio_from_number = data.twilio_from_number || null;
      if ((data as any).zoom_api_key !== undefined) updateData.zoom_api_key = (data as any).zoom_api_key || null;
      if ((data as any).google_calendar_id !== undefined) updateData.google_calendar_id = (data as any).google_calendar_id || null;
      if ((data as any).stripe_api_key !== undefined) updateData.stripe_api_key = (data as any).stripe_api_key || null;
      if ((data as any).quickbooks_api_key !== undefined) updateData.quickbooks_api_key = (data as any).quickbooks_api_key || null;
      if ((data as any).calendly_api_key !== undefined) updateData.calendly_api_key = (data as any).calendly_api_key || null;
      if ((data as any).docusign_api_key !== undefined) updateData.docusign_api_key = (data as any).docusign_api_key || null;
      if ((data as any).dropbox_api_key !== undefined) updateData.dropbox_api_key = (data as any).dropbox_api_key || null;
      if ((data as any).microsoft365_api_key !== undefined) updateData.microsoft365_api_key = (data as any).microsoft365_api_key || null;
      if ((data as any).asana_api_key !== undefined) updateData.asana_api_key = (data as any).asana_api_key || null;
      if ((data as any).openai_api_key !== undefined) updateData.openai_api_key = (data as any).openai_api_key || null;
      if ((data as any).power_automate_webhook_url !== undefined) updateData.power_automate_webhook_url = (data as any).power_automate_webhook_url || null;
      if (data.notification_triggers !== undefined) updateData.notification_triggers = data.notification_triggers as unknown as Record<string, boolean>;
      if (data.status !== undefined) updateData.status = data.status;

      // Always rebuild and write integration_configs from the merged data
      updateData.integration_configs = buildIntegrationConfigs(data) as unknown as Record<string, string>;

      const { error } = await supabase.from("tenants").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant updated successfully");
    },
    onError: (error: Error) => toast.error(`Failed to update tenant: ${error.message}`),
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant deleted successfully");
    },
    onError: (error: Error) => toast.error(`Failed to delete tenant: ${error.message}`),
  });
}
