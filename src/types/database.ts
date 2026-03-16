/**
 * Thin re-export layer over auto-generated Supabase types.
 * Row types are derived from Database["public"]["Tables"][T]["Row"].
 * Custom form types and enum aliases are kept here for convenience.
 *
 * Canonical source of truth: src/integrations/supabase/types.ts (auto-generated)
 */

import type { Database } from "@/integrations/supabase/types";

// ─── Row type aliases ────────────────────────────────────────────────────────
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"];
export type Partner = Database["public"]["Tables"]["partners"]["Row"];
export type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
export type Five9Domain = Database["public"]["Tables"]["five9_domains"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type ApiLog = Database["public"]["Tables"]["api_logs"]["Row"];
export type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"];

// ─── Enum aliases ────────────────────────────────────────────────────────────
export type CrmType = 'clio' | 'workiz' | 'salesforce' | 'hubspot' | 'zendesk' | 'generic_rest' | 'other';
export type AppRole = 'master_admin' | 'admin' | 'ops_team' | 'viewer';
export type TenantStatus = 'active' | 'inactive' | 'pending';
export type ApiLogStatus = 'success' | 'error' | 'pending';
export type EntityType = 'contact' | 'matter' | 'job' | 'intake';
export type NotificationChannel = Database["public"]["Enums"]["notification_channel"];
export type NotificationStatus = Database["public"]["Enums"]["notification_status"];
export type NotificationTrigger = 'intake_created' | 'call_ended' | 'contact_updated';

export type OrgRole = 'owner' | 'admin' | 'member';
export type OrgStatus = 'active' | 'suspended' | 'cancelled';
export type OrgPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type Five9DomainStatus = Database["public"]["Enums"]["five9_domain_status"];
export type PartnerStatus = 'active' | 'suspended';

// ─── Custom interfaces (not in auto-gen) ─────────────────────────────────────

export interface NotificationTriggers {
  intake_created: boolean;
  call_ended: boolean;
  contact_updated: boolean;
}

export interface WorkflowSettings {
  scripts?: Record<string, unknown>;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    company_name?: string;
  };
  custom_fields?: Array<{
    name: string;
    type: 'text' | 'select' | 'boolean';
    options?: string[];
    required?: boolean;
  }>;
  call_handling?: {
    greeting?: string;
    transfer_rules?: Record<string, unknown>;
  };
}

// ─── Form types ──────────────────────────────────────────────────────────────

export interface OrganizationFormData {
  name: string;
  billing_email: string;
  plan: OrgPlan;
}

export interface PartnerFormData {
  name: string;
  slug: string;
  status: PartnerStatus;
  integration_configs?: Record<string, unknown>;
  brand_logo_url?: string;
  brand_primary_color?: string;
  brand_from_email?: string;
  portal_domain?: string;
}

export interface Five9DomainFormData {
  domain: string;
  display_name: string;
  api_key?: string;
  five9_username?: string;
  five9_password?: string;
  workflow_settings?: WorkflowSettings;
}

export interface TenantFormData {
  name: string;
  organization_id?: string;
  partner_id?: string;
  five9_domain_id?: string;
  crm_type: CrmType;
  crm_api_url: string;
  crm_api_key: string;
  webhook_url: string;
  slack_webhook_url: string;
  zapier_webhook_url: string;
  make_webhook_url: string;
  pabbly_webhook_url: string;
  n8n_webhook_url: string;
  teams_webhook_url: string;
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_from_number: string;
  zoom_api_key: string;
  google_calendar_id: string;
  stripe_api_key: string;
  quickbooks_api_key: string;
  calendly_api_key: string;
  docusign_api_key: string;
  dropbox_api_key: string;
  microsoft365_api_key: string;
  asana_api_key: string;
  openai_api_key: string;
  power_automate_webhook_url: string;
  integration_configs: Record<string, string>;
  notification_triggers: NotificationTriggers;
  status: TenantStatus;
}

// Unified intake payload
export interface UnifiedIntakePayload {
  contact: {
    name: string;
    phone?: string;
    email?: string;
  };
  intake: {
    type?: string;
    service?: string;
    urgency?: 'low' | 'medium' | 'high';
    custom?: Record<string, unknown>;
  };
}
