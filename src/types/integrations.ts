// Five9 ↔ CRM behavior rules
export interface Five9ToCrmRules {
  enabled: boolean;
  autoCreateContact: boolean;
  autoCreateMatterOrCase: boolean;
  autoCreateOnlyForQueues: string[];
  attachToLatestOpenOnly: boolean;
  fallbackToContactOnly: boolean;
  createTimeEntryForBillable: boolean;
  perQueueOverrides?: Record<string, Partial<Omit<Five9ToCrmRules, 'enabled' | 'perQueueOverrides' | 'autoCreateOnlyForQueues'>>>;
}

export interface ClioIntegrationConfig {
  enabled: boolean;
  webhookSecret?: string;
  oauthTokenId?: string;
  rules: Five9ToCrmRules;
}

export type MyCaseAuthType = "api_key" | "oauth2";

export interface MyCaseIntegrationConfig {
  enabled: boolean;
  webhookSecret?: string;
  authType?: MyCaseAuthType;
  apiKeyId?: string;
  oauthTokenId?: string;
  rules: Five9ToCrmRules;
}

export interface Five9OutboundConfig {
  enabled: boolean;
  baseUrl: string;
  credentialsRef: string;
}

// ─── Unified integration_configs JSONB structure ─────────────────────────────
// Replaces 20+ individual flat columns on the tenants table.
// All integration credentials are now stored under categorized keys.

export interface WebhookConfigs {
  slack?: string;
  zapier?: string;
  make?: string;
  pabbly?: string;
  n8n?: string;
  teams?: string;
  power_automate?: string;
  general?: string;
}

export interface TwilioConfig {
  account_sid?: string;
  auth_token?: string;
  from_number?: string;
}

export interface SchedulingConfig {
  zoom_api_key?: string;
  google_calendar_id?: string;
  calendly_api_key?: string;
  microsoft365_api_key?: string;
  asana_api_key?: string;
}

export interface BillingConfig {
  stripe_api_key?: string;
  quickbooks_api_key?: string;
}

export interface DocumentsConfig {
  docusign_api_key?: string;
  dropbox_api_key?: string;
}

export interface AiConfig {
  openai_api_key?: string;
}

export interface CrmConfig {
  api_url?: string;
  api_key?: string;
}

export interface IntegrationConfigsUnified {
  webhooks?: WebhookConfigs;
  twilio?: TwilioConfig;
  scheduling?: SchedulingConfig;
  billing?: BillingConfig;
  documents?: DocumentsConfig;
  ai?: AiConfig;
  crm?: CrmConfig;
  // CRM behavior rules (Clio, MyCase, etc.)
  five9OutboundConfig?: Five9OutboundConfig;
  clio?: ClioIntegrationConfig;
  mycase?: MyCaseIntegrationConfig;
  // Room for future integrations
  [key: string]: unknown;
}

// Legacy alias — kept for backward compatibility with useClientIntegrationConfigs
export type IntegrationConfigs = IntegrationConfigsUnified;

// ─── Helper to extract flat-style values from unified config ─────────────────

export function getWebhookUrl(configs: IntegrationConfigsUnified | null | undefined, key: keyof WebhookConfigs): string | null {
  return configs?.webhooks?.[key] ?? null;
}

export function getTwilioConfig(configs: IntegrationConfigsUnified | null | undefined): TwilioConfig {
  return configs?.twilio ?? {};
}

export function getSchedulingConfig(configs: IntegrationConfigsUnified | null | undefined): SchedulingConfig {
  return configs?.scheduling ?? {};
}

export function getBillingConfig(configs: IntegrationConfigsUnified | null | undefined): BillingConfig {
  return configs?.billing ?? {};
}

export function getDocumentsConfig(configs: IntegrationConfigsUnified | null | undefined): DocumentsConfig {
  return configs?.documents ?? {};
}

export function getAiConfig(configs: IntegrationConfigsUnified | null | undefined): AiConfig {
  return configs?.ai ?? {};
}

export function getCrmConfig(configs: IntegrationConfigsUnified | null | undefined): CrmConfig {
  return configs?.crm ?? {};
}
