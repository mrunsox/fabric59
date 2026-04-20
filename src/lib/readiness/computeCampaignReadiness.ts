import { supabase } from "@/integrations/supabase/client";

export type ReadinessStatus = "not_started" | "in_progress" | "blocked" | "test_ready" | "ready";

export interface CampaignReadiness {
  route_id: string;
  client_id: string;
  organization_id: string;
  campaign_name: string | null;
  five9_domain: string;
  provider_target: string | null;
  domain_connected: boolean;
  variable_group_assigned: boolean;
  variable_count: number;
  required_variable_count: number;
  disposition_count: number;
  provider_connected: boolean;
  successful_event_count: number;
  status: ReadinessStatus;
}

export interface ClientReadiness {
  client_id: string;
  organization_id: string;
  domain_connected: boolean;
  campaign_exists: boolean;
  variable_group_exists: boolean;
  provider_connected: boolean;
  dispositions_configured: boolean;
  route_count: number;
  ready_route_count: number;
  status: ReadinessStatus;
}

export async function fetchClientReadiness(clientId: string): Promise<ClientReadiness | null> {
  const { data, error } = await (supabase as any)
    .from("v_client_readiness")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) {
    console.warn("fetchClientReadiness error", error);
    return null;
  }
  return data as ClientReadiness | null;
}

export async function fetchCampaignReadiness(routeId: string): Promise<CampaignReadiness | null> {
  const { data, error } = await (supabase as any)
    .from("v_campaign_readiness")
    .select("*")
    .eq("route_id", routeId)
    .maybeSingle();
  if (error) {
    console.warn("fetchCampaignReadiness error", error);
    return null;
  }
  return data as CampaignReadiness | null;
}

export async function fetchCampaignReadinessForClient(clientId: string): Promise<CampaignReadiness[]> {
  const { data, error } = await (supabase as any)
    .from("v_campaign_readiness")
    .select("*")
    .eq("client_id", clientId);
  if (error) {
    console.warn("fetchCampaignReadinessForClient error", error);
    return [];
  }
  return (data ?? []) as CampaignReadiness[];
}

export function getClientChecklist(r: ClientReadiness | null) {
  return [
    { key: "domain", label: "Five9 domain connected", done: !!r?.domain_connected, href: "/admin/domains" },
    { key: "campaign", label: "Campaign created", done: !!r?.campaign_exists, href: "/admin/five9/campaign-builder" },
    { key: "variables", label: "Variables configured", done: !!r?.variable_group_exists, href: "/admin/five9/campaign-builder" },
    { key: "dispositions", label: "Dispositions configured", done: !!r?.dispositions_configured, href: "/admin/dispositions" },
    { key: "provider", label: "Provider connected", done: !!r?.provider_connected, href: "/admin/legal-connect" },
    { key: "ready", label: "At least one ready campaign", done: (r?.ready_route_count ?? 0) > 0, href: "/admin/campaigns" },
  ];
}

export function getNextActions(r: ClientReadiness | null) {
  const actions: { title: string; description: string; href: string }[] = [];
  if (!r?.domain_connected) {
    actions.push({
      title: "Connect a Five9 domain",
      description: "No active Five9 domain detected. Connect one to start receiving call events.",
      href: "/admin/domains",
    });
  }
  if (r?.domain_connected && !r.campaign_exists) {
    actions.push({
      title: "Create your first campaign",
      description: "Use the Campaign Builder to walk through setup in 6 steps.",
      href: "/admin/five9/campaign-builder",
    });
  }
  if (r?.campaign_exists && !r.variable_group_exists) {
    actions.push({
      title: "Add a call variable group",
      description: "Variables drive what agents see and what gets sent to your CRM.",
      href: "/admin/five9/campaign-builder",
    });
  }
  if (r?.campaign_exists && !r.dispositions_configured) {
    actions.push({
      title: "Configure dispositions",
      description: "Disposition codes drive routing, reporting, and CRM action chains.",
      href: "/admin/dispositions",
    });
  }
  if (r?.campaign_exists && !r.provider_connected) {
    actions.push({
      title: "Connect a legal provider",
      description: "Connect Clio, MyCase, or Smokeball to push leads from dispositions.",
      href: "/admin/legal-connect",
    });
  }
  if (r && r.ready_route_count === 0 && r.route_count > 0) {
    actions.push({
      title: "Run a readiness test",
      description: "Validate your campaign end-to-end with a simulated event.",
      href: "/admin/test",
    });
  }
  if (actions.length === 0) {
    actions.push({
      title: "You're ready",
      description: "All readiness checks pass. Monitor your live campaigns from the dashboard.",
      href: "/admin/campaigns",
    });
  }
  return actions.slice(0, 3);
}
