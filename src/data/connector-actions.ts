// Connector catalog: actions + capabilities.
// Capabilities drive which templates can use which connectors and which
// builder options surface. Actions drive the Action step's target schema.

export type ConnectorKey = "clio" | "mycase" | "smokeball" | "webhook" | "custom-http";

export type TemplateKey =
  | "disposition_webhook"
  | "crm_action"
  | "inbound_lookup"
  | "callback_task"
  | "custom_relay";

export interface ConnectorCapabilities {
  supportsActionFlows: boolean;
  supportsLookupFlows: boolean;
  supportsWebhookRelay: boolean;
  supportsCallbackTaskFlows: boolean;
  supportsTwoWaySync: boolean;
  authType: "oauth" | "api_key" | "basic" | "none";
  healthCheckType: "ping" | "test_action" | "none";
}

export interface TargetField {
  path: string;
  label: string;
  type: "string" | "number" | "boolean" | "date" | "object";
  required?: boolean;
}

export interface ConnectorAction {
  key: string;
  label: string;
  description?: string;
  appliesToTemplates: TemplateKey[];
  targetSchema: TargetField[];
}

export interface ConnectorDef {
  key: ConnectorKey;
  name: string;
  capabilities: ConnectorCapabilities;
  actions: ConnectorAction[];
}

const CRM_CAPS: ConnectorCapabilities = {
  supportsActionFlows: true,
  supportsLookupFlows: true,
  supportsWebhookRelay: false,
  supportsCallbackTaskFlows: true,
  supportsTwoWaySync: false,
  authType: "oauth",
  healthCheckType: "test_action",
};

export const CONNECTORS: ConnectorDef[] = [
  {
    key: "clio",
    name: "Clio",
    capabilities: CRM_CAPS,
    actions: [
      {
        key: "create_matter",
        label: "Create matter",
        appliesToTemplates: ["crm_action"],
        targetSchema: [
          { path: "matter.description", label: "Description", type: "string", required: true },
          { path: "matter.client_id", label: "Client id", type: "string", required: true },
          { path: "matter.practice_area", label: "Practice area", type: "string" },
        ],
      },
      {
        key: "upsert_contact",
        label: "Upsert contact",
        appliesToTemplates: ["crm_action", "inbound_lookup"],
        targetSchema: [
          { path: "contact.first_name", label: "First name", type: "string" },
          { path: "contact.last_name", label: "Last name", type: "string" },
          { path: "contact.phone", label: "Phone", type: "string", required: true },
          { path: "contact.email", label: "Email", type: "string" },
        ],
      },
      {
        key: "create_task",
        label: "Create task",
        appliesToTemplates: ["callback_task"],
        targetSchema: [
          { path: "task.name", label: "Task name", type: "string", required: true },
          { path: "task.due_at", label: "Due at", type: "date" },
          { path: "task.assignee_id", label: "Assignee id", type: "string" },
        ],
      },
    ],
  },
  {
    key: "mycase",
    name: "MyCase",
    capabilities: CRM_CAPS,
    actions: [
      {
        key: "upsert_contact",
        label: "Upsert contact",
        appliesToTemplates: ["crm_action", "inbound_lookup"],
        targetSchema: [
          { path: "contact.first_name", label: "First name", type: "string" },
          { path: "contact.last_name", label: "Last name", type: "string" },
          { path: "contact.phone", label: "Phone", type: "string", required: true },
        ],
      },
      {
        key: "create_case",
        label: "Create case",
        appliesToTemplates: ["crm_action"],
        targetSchema: [
          { path: "case.name", label: "Case name", type: "string", required: true },
          { path: "case.client_id", label: "Client id", type: "string", required: true },
        ],
      },
      {
        key: "create_task",
        label: "Create task",
        appliesToTemplates: ["callback_task"],
        targetSchema: [
          { path: "task.name", label: "Task name", type: "string", required: true },
          { path: "task.due_at", label: "Due at", type: "date" },
        ],
      },
    ],
  },
  {
    key: "smokeball",
    name: "Smokeball",
    capabilities: { ...CRM_CAPS, supportsLookupFlows: false },
    actions: [
      {
        key: "create_matter",
        label: "Create matter",
        appliesToTemplates: ["crm_action"],
        targetSchema: [
          { path: "matter.description", label: "Description", type: "string", required: true },
          { path: "matter.contact_id", label: "Contact id", type: "string" },
        ],
      },
      {
        key: "log_activity",
        label: "Log activity",
        appliesToTemplates: ["crm_action"],
        targetSchema: [
          { path: "activity.note", label: "Note", type: "string" },
          { path: "activity.duration_seconds", label: "Duration (s)", type: "number" },
        ],
      },
    ],
  },
  {
    key: "webhook",
    name: "Webhook",
    capabilities: {
      supportsActionFlows: false,
      supportsLookupFlows: false,
      supportsWebhookRelay: true,
      supportsCallbackTaskFlows: false,
      supportsTwoWaySync: false,
      authType: "none",
      healthCheckType: "ping",
    },
    actions: [
      {
        key: "post_webhook",
        label: "POST webhook",
        appliesToTemplates: ["disposition_webhook", "custom_relay"],
        targetSchema: [
          { path: "url", label: "URL", type: "string", required: true },
          { path: "headers", label: "Headers", type: "object" },
          { path: "body", label: "Body", type: "object" },
        ],
      },
    ],
  },
  {
    key: "custom-http",
    name: "Custom HTTP",
    capabilities: {
      supportsActionFlows: true,
      supportsLookupFlows: true,
      supportsWebhookRelay: true,
      supportsCallbackTaskFlows: false,
      supportsTwoWaySync: false,
      authType: "api_key",
      healthCheckType: "ping",
    },
    actions: [
      {
        key: "http_request",
        label: "HTTP request",
        appliesToTemplates: ["custom_relay", "crm_action", "inbound_lookup"],
        targetSchema: [
          { path: "method", label: "Method", type: "string", required: true },
          { path: "url", label: "URL", type: "string", required: true },
          { path: "headers", label: "Headers", type: "object" },
          { path: "body", label: "Body", type: "object" },
        ],
      },
    ],
  },
];

export function getConnector(key: string | undefined | null): ConnectorDef | undefined {
  if (!key) return undefined;
  return CONNECTORS.find((c) => c.key === key);
}

export function getConnectorAction(connectorKey: string, actionKey: string): ConnectorAction | undefined {
  return getConnector(connectorKey)?.actions.find((a) => a.key === actionKey);
}

/** Connectors compatible with a given template, derived from capabilities. */
export function connectorsForTemplate(template: TemplateKey): ConnectorDef[] {
  return CONNECTORS.filter((c) => {
    switch (template) {
      case "disposition_webhook":
      case "custom_relay":
        return c.capabilities.supportsWebhookRelay;
      case "crm_action":
        return c.capabilities.supportsActionFlows;
      case "inbound_lookup":
        return c.capabilities.supportsLookupFlows;
      case "callback_task":
        return c.capabilities.supportsCallbackTaskFlows;
    }
  });
}
