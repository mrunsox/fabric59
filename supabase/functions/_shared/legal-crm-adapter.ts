// Abstract adapter interface every legal CRM provider must implement.
// Phase 1 of the Legal Connect master build.

import type {
  AdapterResult,
  NormalizedActivity,
  NormalizedContact,
  NormalizedLead,
  NormalizedMatter,
  NormalizedNote,
  NormalizedTask,
  ProviderEvent,
} from "./normalized-entities.ts";

export interface AdapterConnectionContext {
  connection_id: string;
  client_id: string;
  organization_id: string;
  provider: "clio" | "mycase" | "smokeball";
  access_token?: string;
  refresh_token?: string;
  base_url?: string;
  region?: string;
  metadata?: Record<string, unknown>;
}

export interface ContactSearchQuery {
  email?: string;
  phone?: string;
  full_name?: string;
  provider_id?: string;
}

export interface MatterSearchQuery {
  contact_id?: string;
  status?: "open" | "closed" | string;
  display_number?: string;
  provider_id?: string;
}

export interface LegalCrmAdapter {
  readonly provider: "clio" | "mycase" | "smokeball";

  // Auth & lifecycle
  whoAmI(ctx: AdapterConnectionContext): Promise<AdapterResult<{ user_id?: string; account_name?: string }>>;
  refreshToken?(ctx: AdapterConnectionContext): Promise<AdapterResult<{ access_token: string; refresh_token?: string; expires_at: string }>>;
  deauthorize?(ctx: AdapterConnectionContext): Promise<AdapterResult<void>>;

  // Read
  searchContact(ctx: AdapterConnectionContext, query: ContactSearchQuery): Promise<AdapterResult<NormalizedContact[]>>;
  searchMatter(ctx: AdapterConnectionContext, query: MatterSearchQuery): Promise<AdapterResult<NormalizedMatter[]>>;

  // Write — required
  createContact(ctx: AdapterConnectionContext, contact: NormalizedContact): Promise<AdapterResult<NormalizedContact>>;
  updateContact?(ctx: AdapterConnectionContext, contact_id: string, patch: Partial<NormalizedContact>): Promise<AdapterResult<NormalizedContact>>;
  createNote(ctx: AdapterConnectionContext, note: NormalizedNote): Promise<AdapterResult<NormalizedNote>>;

  // Write — capability-gated (may throw `unsupported` and route to review queue)
  createMatter?(ctx: AdapterConnectionContext, matter: NormalizedMatter): Promise<AdapterResult<NormalizedMatter>>;
  createLead?(ctx: AdapterConnectionContext, lead: NormalizedLead): Promise<AdapterResult<NormalizedLead>>;
  createTask?(ctx: AdapterConnectionContext, task: NormalizedTask): Promise<AdapterResult<NormalizedTask>>;
  createActivity?(ctx: AdapterConnectionContext, activity: NormalizedActivity): Promise<AdapterResult<NormalizedActivity>>;

  // Webhooks
  subscribeWebhooks?(ctx: AdapterConnectionContext, callback_url: string, secret: string): Promise<AdapterResult<{ subscription_id: string; expires_at?: string }>>;
  verifyWebhookSignature?(rawBody: string, signature: string, secret: string): Promise<boolean>;
  normalizeEvent?(rawEvent: Record<string, unknown>): Promise<ProviderEvent>;
}

// Standard error helper shared by all adapters
export function unsupported(action: string): AdapterResult {
  return { ok: false, status: 501, error: `unsupported: ${action}`, retryable: false };
}
