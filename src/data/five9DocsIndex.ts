export type Five9DocTopic = {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  url: string;
  checklist: string[];
  /** route prefixes where this topic is most relevant */
  routes: string[];
};

export const FIVE9_DOCS: Five9DocTopic[] = [
  {
    id: "campaigns",
    title: "Campaigns",
    summary: "A Campaign in Five9 is the operational container that connects calls, agents, dispositions, and call variables.",
    whyItMatters: "Without a properly configured campaign, calls cannot be routed to agents or recorded against the right reporting bucket.",
    url: "https://webapps.five9.com/assets/files/for_customers/documentation/admin/CC_Admin.pdf",
    checklist: [
      "Choose campaign type (Inbound, Outbound, Autodial)",
      "Assign a campaign profile",
      "Attach call variable groups",
      "Define dispositions",
      "Map skills/queues",
    ],
    routes: ["/admin/campaigns", "/admin/five9", "/admin/campaign-blueprints"],
  },
  {
    id: "campaign-profiles",
    title: "Campaign Profiles",
    summary: "Campaign Profiles define the runtime behavior — list selection, filters, dialing parameters, and which call variables agents see.",
    whyItMatters: "Profiles control what fields appear on the agent worksheet and how the system selects records to dial.",
    url: "https://webapps.five9.com/assets/files/for_customers/documentation/admin/CC_Admin.pdf",
    checklist: [
      "Pick which call variables agents view/edit",
      "Set filter criteria for record selection",
      "Configure dialing parameters",
      "Validate against agentMustCompleteWorksheet",
    ],
    routes: ["/admin/campaigns", "/admin/five9/campaign-builder"],
  },
  {
    id: "call-variable-groups",
    title: "Call Variable Groups",
    summary: "Call Variable Groups bundle related call variables (e.g. Intake, Vehicle, Insurance) for reuse across campaigns.",
    whyItMatters: "Grouping keeps the agent worksheet organized and lets you reuse one set of fields across multiple campaigns.",
    url: "https://webapps.five9.com/assets/files/for_customers/documentation/admin/CC_Admin.pdf",
    checklist: [
      "Name the group with intent (e.g. 'Default Intake')",
      "Add 1+ required variables",
      "Set display labels and order",
      "Assign group to campaign profile",
    ],
    routes: ["/admin/five9/campaign-builder", "/admin/dispositions"],
  },
  {
    id: "call-variables",
    title: "Call Variables",
    summary: "Call Variables are typed fields (string, number, date, enum) attached to a call that flow into reports, dispositions, and CRM sync.",
    whyItMatters: "These are the fields that move data between Five9, agent worksheets, and your CRM. Wrong type = broken sync.",
    url: "https://webapps.five9.com/assets/files/for_customers/documentation/admin/CC_Admin.pdf",
    checklist: [
      "Choose data type (string, number, date, enum)",
      "Set default + validation",
      "Mark required where critical",
      "Map to a CRM field via Field Mappings",
    ],
    routes: ["/admin/five9/campaign-builder", "/admin/mappings"],
  },
  {
    id: "dispositions",
    title: "Dispositions",
    summary: "Dispositions are the outcome codes agents select at end of call (Qualified Lead, Wrong Number, Callback, etc).",
    whyItMatters: "Dispositions drive reporting, billable events, automated emails, and CRM action chains in Legal Connect.",
    url: "https://webapps.five9.com/assets/files/for_customers/documentation/admin/CC_Admin.pdf",
    checklist: [
      "Create at least: Qualified Lead, Existing Client, Callback, Wrong Number, Needs Review",
      "Map each to an action profile (create matter / log only / review)",
      "Set agentMustCompleteWorksheet on outcomes that need data",
      "Verify reporting access in disposition_access",
    ],
    routes: ["/admin/dispositions", "/admin/legal-connect"],
  },
  {
    id: "ivr-scripts",
    title: "IVR Scripts",
    summary: "IVR Scripts are the visual call routing flows that pick the right campaign/queue/skill before reaching an agent.",
    whyItMatters: "Wrong IVR routing means calls never hit the right campaign — and your readiness signals stay stuck.",
    url: "https://webapps.five9.com/assets/files/for_customers/documentation/admin/CC_Admin.pdf",
    checklist: [
      "Map DNIS to IVR entry point",
      "Confirm IVR routes to the correct campaign",
      "Test with a live or simulated call",
    ],
    routes: ["/admin/call-flow", "/admin/script-routing"],
  },
  {
    id: "web-connector",
    title: "Web Connectors",
    summary: "Web Connectors are HTTP integrations Five9 calls during/after a call to push data to external systems.",
    whyItMatters: "Fabric59 registers itself as a Web Connector to receive events — without this, dispositions never reach Legal Connect.",
    url: "https://webapps.five9.com/assets/files/for_customers/documentation/admin/CC_Admin.pdf",
    checklist: [
      "Register Fabric59 webhook URL",
      "Set webhook secret",
      "Bind connector to disposition events",
      "Verify with a test call",
    ],
    routes: ["/admin/connectors", "/admin/domains", "/admin/legal-connect"],
  },
];

export function getDocsForRoute(pathname: string): Five9DocTopic[] {
  const matches = FIVE9_DOCS.filter((d) =>
    d.routes.some((r) => pathname === r || pathname.startsWith(r + "/") || pathname.startsWith(r))
  );
  if (matches.length > 0) return matches;
  // default landing set
  return FIVE9_DOCS.slice(0, 4);
}
