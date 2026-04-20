// Canonical normalized entity types used across all legal CRM adapters.
// Each provider adapter must translate between provider-native shape and these.

export interface NormalizedContact {
  provider_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  alt_phone?: string;
  organization_name?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedMatter {
  provider_id?: string;
  display_number?: string;
  description?: string;
  status?: "open" | "closed" | "pending" | string;
  contact_id?: string;
  practice_area?: string;
  opened_at?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedLead {
  provider_id?: string;
  source?: string;
  intake_type?: string;
  status?: string;
  contact?: NormalizedContact;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedTask {
  provider_id?: string;
  subject: string;
  description?: string;
  due_date?: string;
  assigned_to?: string;
  matter_id?: string;
  contact_id?: string;
  lead_id?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  metadata?: Record<string, unknown>;
}

export interface NormalizedNote {
  provider_id?: string;
  subject?: string;
  content: string;
  matter_id?: string;
  contact_id?: string;
  lead_id?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedActivity {
  provider_id?: string;
  type: "call" | "email" | "meeting" | "communication" | "other";
  subject?: string;
  description?: string;
  duration_seconds?: number;
  matter_id?: string;
  contact_id?: string;
  occurred_at?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderEvent {
  event_id: string;
  event_type: string;
  resource_type: string;
  resource_id: string;
  occurred_at: string;
  raw: Record<string, unknown>;
}

export interface SyncAction {
  action: "lookup_contact" | "create_contact" | "update_contact" | "lookup_matter" | "create_matter" | "create_lead" | "create_note" | "create_task" | "create_activity";
  payload: Record<string, unknown>;
  required_capability: string;
}

export interface ReviewItem {
  reason: string;
  payload: Record<string, unknown>;
  suggested_resolution?: string;
}

export interface AdapterResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  retryable?: boolean;
}
