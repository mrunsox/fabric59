// Database types for the Five9 Integration Fabric

// Existing enums
export type CrmType = 'clio' | 'workiz' | 'salesforce' | 'generic_rest' | 'other';
export type AppRole = 'master_admin' | 'admin' | 'ops_team' | 'viewer';
export type TenantStatus = 'active' | 'inactive' | 'pending';
export type ApiLogStatus = 'success' | 'error' | 'pending';
export type EntityType = 'contact' | 'matter' | 'job' | 'intake';
export type NotificationChannel = 'slack' | 'email' | 'sms';
export type NotificationStatus = 'sent' | 'failed' | 'pending';
export type NotificationTrigger = 'intake_created' | 'call_ended' | 'contact_updated';

// New SaaS architecture enums
export type OrgRole = 'owner' | 'admin' | 'member';
export type OrgStatus = 'active' | 'suspended' | 'cancelled';
export type OrgPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type Five9DomainStatus = 'active' | 'inactive' | 'pending_verification';

export interface NotificationTriggers {
  intake_created: boolean;
  call_ended: boolean;
  contact_updated: boolean;
}

// SaaS entity interfaces
export interface Organization {
  id: string;
  name: string;
  billing_email: string | null;
  plan: OrgPlan;
  status: OrgStatus;
  created_at: string;
  updated_at: string;
  // White-label branding fields
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_primary_color: string | null;
  brand_from_email: string | null;
  brand_reply_to: string | null;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface Five9Domain {
  id: string;
  organization_id: string;
  domain: string;
  display_name: string;
  api_key_encrypted: string | null;
  five9_username: string | null;
  five9_password_encrypted: string | null;
  api_connection_status: 'pending' | 'connected' | 'failed' | null;
  last_connection_test: string | null;
  workflow_settings: WorkflowSettings;
  status: Five9DomainStatus;
  created_at: string;
  updated_at: string;
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

export interface Tenant {
  id: string;
  name: string;
  organization_id: string | null;
  five9_domain_id: string | null;
  crm_type: CrmType;
  crm_api_url: string | null;
  crm_api_key: string | null;
  custom_mappings: Record<string, unknown>;
  webhook_url: string | null;
  slack_webhook_url: string | null;
  zapier_webhook_url: string | null;
  make_webhook_url: string | null;
  pabbly_webhook_url: string | null;
  n8n_webhook_url: string | null;
  notification_triggers: NotificationTriggers;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  channel: NotificationChannel;
  recipient: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  response: Record<string, unknown> | null;
  trigger_event: NotificationTrigger;
  created_at: string;
}

export interface UnifiedSchema {
  id: string;
  tenant_id: string;
  entity: EntityType;
  fields: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ApiLog {
  id: string;
  tenant_id: string | null;
  endpoint: string;
  method: string;
  request_payload: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  status: ApiLogStatus;
  response_time_ms: number | null;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  key_hash: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

// Form types
export interface OrganizationFormData {
  name: string;
  billing_email: string;
  plan: OrgPlan;
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
