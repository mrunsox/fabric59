// Integration Types - Software-level vs Client-level distinction

/**
 * Software-level integrations are core platform features configured at the system level.
 * They are available to all clients and scripts.
 */
export type SoftwareIntegrationType = 'crm' | 'sms' | 'calendar' | 'payment' | 'telephony' | 'email';

/**
 * Client-level integrations are configurations specific to a client or campaign.
 * Each client can have their own API keys, endpoints, and settings.
 */
export interface SoftwareIntegration {
  id: string;
  type: SoftwareIntegrationType;
  name: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  isConfigured: boolean;
  configuredAt?: string;
}

export interface ClientIntegration {
  id: string;
  clientId: string;
  scriptId?: string;
  integrationType: SoftwareIntegrationType;
  providerName: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// SMS specific types
export type SMSSendScenario = 
  | 'on_transfer_warm'
  | 'on_transfer_cold'
  | 'after_disposition'
  | 'after_call_end'
  | 'manual_trigger'
  | 'on_schedule';

export type SMSDeliveryStatus = 
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'undelivered';

export interface SMSWebhookEvent {
  id: string;
  smsId: string;
  status: SMSDeliveryStatus;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface SMSSendConfig {
  scenario: SMSSendScenario;
  delaySeconds?: number;
  condition?: string;
  retryOnFailure: boolean;
  maxRetries: number;
  webhookUrl?: string;
}

// Calendar specific types
export interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'calendly' | 'custom';
  apiEndpoint: string;
  authType: 'oauth' | 'apikey';
}

export interface CalendarAvailability {
  date: string;
  slots: {
    start: string;
    end: string;
    available: boolean;
  }[];
}

// Integration mapping for scripts/clients
export interface ScriptIntegrationMapping {
  id: string;
  scriptId: string;
  scriptName: string;
  clientId: string;
  clientName: string;
  integrations: {
    type: SoftwareIntegrationType;
    clientIntegrationId: string;
    providerName: string;
    isActive: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

// For display in Client Settings
export interface ClientActiveIntegrations {
  clientId: string;
  clientName: string;
  scriptMappings: {
    scriptId: string;
    scriptName: string;
    activeIntegrations: {
      type: SoftwareIntegrationType;
      providerName: string;
      lastUsed?: string;
      status: 'active' | 'error' | 'unconfigured';
    }[];
  }[];
}
