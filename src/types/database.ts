// Database types for the Five9 Integration Fabric

export type CrmType = 'clio' | 'workiz' | 'salesforce' | 'generic_rest' | 'other';
export type AppRole = 'admin' | 'ops_team' | 'viewer';
export type TenantStatus = 'active' | 'inactive' | 'pending';
export type ApiLogStatus = 'success' | 'error' | 'pending';
export type EntityType = 'contact' | 'matter' | 'job' | 'intake';

export interface Tenant {
  id: string;
  name: string;
  crm_type: CrmType;
  crm_api_url: string | null;
  crm_api_key: string | null;
  custom_mappings: Record<string, unknown>;
  webhook_url: string | null;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
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
export interface TenantFormData {
  name: string;
  crm_type: CrmType;
  crm_api_url: string;
  crm_api_key: string;
  webhook_url: string;
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
