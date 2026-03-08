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

// Top-level container stored in tenants.integration_configs
export interface IntegrationConfigs {
  five9OutboundConfig?: Five9OutboundConfig;
  clio?: ClioIntegrationConfig;
  mycase?: MyCaseIntegrationConfig;
  // Room for future CRMs
  [key: string]: unknown;
}
