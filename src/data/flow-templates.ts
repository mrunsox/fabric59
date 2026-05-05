// Static flow template catalog (v1). Shape mirrors the future flow_templates
// table so it can be swapped via the adapter without rewriting the builder.
//
// Do NOT import this array directly from pages — go through
// `src/lib/flow-templates/adapter.ts`.

import type { ConnectorKey, TemplateKey } from "./connector-actions";

export interface FlowDefinition {
  trigger: { type: string; [k: string]: unknown };
  filters: Array<{ field: string; op: string; value: unknown }>;
  mappings: Array<{ source: string; target: string; transform?: string }>;
  action:
    | { connector: ConnectorKey | ""; action: string; config: Record<string, unknown> }
    | null;
  failure: {
    retries: number;
    backoff_ms?: number;
    fallback?: string;
    dead_letter?: boolean;
    mark_for_review?: boolean;
  };
  test?: { sample_payload?: Record<string, unknown> };
}

export interface FlowTemplate {
  key: TemplateKey;
  name: string;
  description: string;
  category: "disposition" | "crm" | "inbound" | "callback" | "custom";
  icon: string; // lucide icon name
  supportedConnectors: ConnectorKey[];
  defaultDefinition: FlowDefinition;
}

const SAMPLE_CALL_PAYLOAD = {
  call_id: "five9-call-abc-123",
  campaign_name: "Intake - California",
  queue_name: "Intake-General",
  disposition: "Qualified Lead",
  agent: { id: "agt_123", username: "alex.j" },
  customer: { phone: "+15551234567", first_name: "Jane", last_name: "Doe", email: "jane@example.com" },
  variables: { practice_area: "Personal Injury", referral_source: "Google" },
};

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    key: "disposition_webhook",
    name: "Disposition Webhook Flow",
    description:
      "Fire a webhook to any HTTPS endpoint when a call ends with a chosen disposition.",
    category: "disposition",
    icon: "Webhook",
    supportedConnectors: ["webhook", "custom-http"],
    defaultDefinition: {
      trigger: { type: "disposition" },
      filters: [{ field: "disposition", op: "in", value: ["Qualified Lead"] }],
      mappings: [
        { source: "call_id", target: "call_id" },
        { source: "campaign_name", target: "campaign" },
        { source: "disposition", target: "disposition" },
        { source: "customer.phone", target: "phone" },
        { source: "customer.first_name", target: "first_name" },
        { source: "customer.last_name", target: "last_name" },
        { source: "agent.username", target: "agent" },
      ],
      action: {
        connector: "webhook",
        action: "post_webhook",
        config: { method: "POST", url: "", headers: { "Content-Type": "application/json" } },
      },
      failure: { retries: 3, backoff_ms: 2000, dead_letter: true },
      test: { sample_payload: SAMPLE_CALL_PAYLOAD },
    },
  },
  {
    key: "crm_action",
    name: "CRM Action Flow",
    description:
      "Run a connector action (create matter, upsert contact, log activity) when a call event matches.",
    category: "crm",
    icon: "Briefcase",
    supportedConnectors: ["clio", "mycase", "smokeball", "custom-http"],
    defaultDefinition: {
      trigger: { type: "call_end" },
      filters: [],
      mappings: [
        { source: "customer.first_name", target: "contact.first_name" },
        { source: "customer.last_name", target: "contact.last_name" },
        { source: "customer.phone", target: "contact.phone" },
        { source: "customer.email", target: "contact.email" },
      ],
      action: { connector: "clio", action: "upsert_contact", config: {} },
      failure: { retries: 3, backoff_ms: 2000, mark_for_review: true },
      test: { sample_payload: SAMPLE_CALL_PAYLOAD },
    },
  },
  {
    key: "inbound_lookup",
    name: "Inbound Lookup Flow",
    description:
      "On inbound call, look up the caller in a connected system and surface a screen pop.",
    category: "inbound",
    icon: "PhoneIncoming",
    supportedConnectors: ["clio", "mycase", "custom-http"],
    defaultDefinition: {
      trigger: { type: "inbound_call" },
      filters: [],
      mappings: [{ source: "ani", target: "contact.phone" }],
      action: { connector: "clio", action: "upsert_contact", config: { lookup_only: true } },
      failure: { retries: 1, backoff_ms: 500 },
      test: { sample_payload: { ani: "+15551234567", campaign_name: "Inbound" } },
    },
  },
  {
    key: "callback_task",
    name: "Callback / Task Flow",
    description:
      "Create a follow-up task or callback record in your CRM when an agent requests one.",
    category: "callback",
    icon: "CalendarClock",
    supportedConnectors: ["clio", "mycase"],
    defaultDefinition: {
      trigger: { type: "callback_request" },
      filters: [],
      mappings: [
        { source: "callback.notes", target: "task.name" },
        { source: "callback.due_at", target: "task.due_at" },
        { source: "agent.id", target: "task.assignee_id" },
      ],
      action: { connector: "clio", action: "create_task", config: {} },
      failure: { retries: 2, backoff_ms: 1000, mark_for_review: true },
      test: {
        sample_payload: {
          callback: { notes: "Follow up re intake", due_at: "2026-05-10T15:00:00Z" },
          agent: { id: "agt_123" },
        },
      },
    },
  },
  {
    key: "custom_relay",
    name: "Custom Relay Flow",
    description: "Forward any Five9 event to an arbitrary HTTP endpoint with a custom payload.",
    category: "custom",
    icon: "Code2",
    supportedConnectors: ["webhook", "custom-http"],
    defaultDefinition: {
      trigger: { type: "webhook" },
      filters: [],
      mappings: [],
      action: {
        connector: "custom-http",
        action: "http_request",
        config: { method: "POST", url: "", headers: {} },
      },
      failure: { retries: 3, backoff_ms: 2000, dead_letter: true },
      test: { sample_payload: SAMPLE_CALL_PAYLOAD },
    },
  },
];
