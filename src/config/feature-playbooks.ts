// Feature Vault testing playbooks. Code-side registry keyed by vault_features.slug.
// No DB schema. Progress is held in component state only.

export type PlaybookCheck = {
  id: string;
  label: string;
  hint?: string;
};

export type PlaybookStep = {
  id: string;
  title: string;
  body?: string;
  checks: PlaybookCheck[];
};

export type PlaybookSection = {
  id: string;
  title: string;
  intro?: string;
  steps?: PlaybookStep[];
  checks?: PlaybookCheck[];
};

export type PlaybookCredential = {
  label: string;
  value: string;
  secret?: boolean;
  href?: string;
};

export type PlaybookCredentialBlock = {
  title: string;
  description?: string;
  warning?: string;
  items: PlaybookCredential[];
};

export type FeaturePlaybook = {
  slug: string;
  objective: string;
  depth: "full" | "baseline";
  credentials?: PlaybookCredentialBlock;
  sections: PlaybookSection[];
};

const legalConnect: FeaturePlaybook = {
  slug: "legal-connect",
  depth: "full",
  objective:
    "Validate that Legal Connect can establish, store, and exercise CRM connections (Clio, MyCase, Smokeball) end-to-end through the unified five9-main dispatcher, with idempotent sync and a working policy matrix.",
  sections: [
    {
      id: "prereqs",
      title: "Prerequisites",
      intro: "Confirm environment, secrets, and tenant scaffolding before exercising flows.",
      checks: [
        { id: "p1", label: "Confirm an active tenant + client row exists for the test org" },
        { id: "p2", label: "Verify Clio OAuth client id/secret are present in edge function secrets" },
        { id: "p3", label: "Verify MyCase API credentials present (or mark as unavailable for the run)" },
        { id: "p4", label: "Smokeball credentials: confirm presence or explicitly skip", hint: "Smokeball coverage is partial. If creds missing, document scope of test." },
        { id: "p5", label: "Confirm pgcrypto is enabled and credential encryption helpers resolve" },
        { id: "p6", label: "Confirm RLS policies still allow the signed-in superadmin to read connection state" },
      ],
    },
    {
      id: "setup",
      title: "Setup",
      steps: [
        {
          id: "s1",
          title: "Connect a Clio account via the wizard",
          body: "Walk the CRM Setup Wizard. Use the Legal CRM preset and complete OAuth.",
          checks: [
            { id: "s1a", label: "Wizard reaches OAuth step without error" },
            { id: "s1b", label: "Callback completes and a connection row is created" },
            { id: "s1c", label: "Stored credentials are encrypted (not plaintext) at rest" },
          ],
        },
        {
          id: "s2",
          title: "Apply a per-client policy",
          body: "Select a policy from the policy matrix and persist it to the client.",
          checks: [
            { id: "s2a", label: "Policy selection saves to integration_configs JSONB on tenants" },
            { id: "s2b", label: "Config merge resolves Client > Partner > Org as expected" },
          ],
        },
      ],
    },
    {
      id: "workflow",
      title: "Core workflow",
      steps: [
        {
          id: "w1",
          title: "Lead push to Clio",
          checks: [
            { id: "w1a", label: "Trigger a synthetic lead through five9-main" },
            { id: "w1b", label: "Outbound payload matches the field mapping for the tenant" },
            { id: "w1c", label: "Clio returns 2xx and an external id is recorded in identity_xrefs" },
          ],
        },
        {
          id: "w2",
          title: "Inbound Clio webhook (fast-ack)",
          checks: [
            { id: "w2a", label: "Webhook returns 200 within fast-ack window before downstream work" },
            { id: "w2b", label: "Sync job is enqueued for the event id" },
            { id: "w2c", label: "Replayed identical webhook is deduped, not double-processed" },
          ],
        },
        {
          id: "w3",
          title: "Sync engine processes the job",
          checks: [
            { id: "w3a", label: "Job transitions queued -> running -> succeeded" },
            { id: "w3b", label: "Job is idempotent on re-run (no duplicate downstream rows)" },
            { id: "w3c", label: "Failure path retries with backoff and surfaces the last error" },
          ],
        },
        {
          id: "w4",
          title: "MyCase fallback path",
          body: "MyCase has known capability gaps. Confirm fallbacks fire instead of silently failing.",
          checks: [
            { id: "w4a", label: "Capability check identifies the missing endpoint" },
            { id: "w4b", label: "Fallback path runs (or no-op is logged with reason)" },
          ],
        },
      ],
    },
    {
      id: "scenarios",
      title: "Scenario checklist",
      checks: [
        { id: "sc1", label: "Happy path Clio create-contact + create-matter" },
        { id: "sc2", label: "Expired OAuth token: reconnect prompt triggers, no silent failure" },
        { id: "sc3", label: "Webhook replay within dedup window is rejected" },
        { id: "sc4", label: "Policy change at client tier overrides org default at next dispatch" },
        { id: "sc5", label: "Disabled connector: dispatch is short-circuited with a clear log" },
      ],
    },
    {
      id: "expected",
      title: "Expected outcomes",
      checks: [
        { id: "e1", label: "identity_xrefs row exists mapping internal lead -> external CRM id" },
        { id: "e2", label: "sync_jobs (or equivalent) row reflects final status and duration" },
        { id: "e3", label: "No duplicate CRM-side records after replay" },
      ],
    },
    {
      id: "failures",
      title: "Failure signals + debugging",
      checks: [
        { id: "f1", label: "Check edge function logs for five9-main on 4xx/5xx" },
        { id: "f2", label: "Confirm correlation id is present on every log line for the run" },
        { id: "f3", label: "Inspect identity_xrefs for orphan rows after a failed push" },
      ],
    },
    {
      id: "notes",
      title: "Notes",
      intro:
        "Smokeball coverage and exact sync_jobs table name should be verified in repo before relying on them. Do not invent capability that is not present.",
    },
  ],
};

const five9Domain: FeaturePlaybook = {
  slug: "five9-domain-management",
  depth: "full",
  objective:
    "Validate that a Five9 domain can be connected, synced, modified, and safely disconnected, with the Pabbly auth bridge, Web Connector registration, Users/Skills sync, and SOAP schema alignment all functioning.",
  credentials: {
    title: "Five9 test domain credentials",
    description:
      "Shared sandbox login for the dev team to exercise domain connect, sync, and SOAP flows end-to-end.",
    warning:
      "Sandbox use only. Do not run destructive operations against production data. Rotate credentials when testing concludes.",
    items: [
      { label: "Login URL", value: "https://login.five9.com/", href: "https://login.five9.com/" },
      { label: "Username", value: "Fabric59" },
      { label: "Password", value: "DD@KFH666UxhiF%i3oIX", secret: true },
    ],
  },
  sections: [
    {
      id: "prereqs",
      title: "Prerequisites",
      checks: [
        { id: "p1", label: "Pabbly bridge URL + secret configured in edge function env" },
        { id: "p2", label: "Five9 admin credentials available for the test domain" },
        { id: "p3", label: "Service role key available to sync edge functions (not exposed to client)" },
        { id: "p4", label: "Confirm derived domain identifier rule produces expected slug" },
      ],
    },
    {
      id: "setup",
      title: "Setup",
      steps: [
        {
          id: "s1",
          title: "Connect a domain via the wizard",
          checks: [
            { id: "s1a", label: "Wizard accepts admin credentials and authenticates via Pabbly" },
            { id: "s1b", label: "Domain identifier auto-derives from response and is shown to user" },
            { id: "s1c", label: "Credentials are encrypted at rest" },
          ],
        },
        {
          id: "s2",
          title: "Web Connector auto-registration",
          checks: [
            { id: "s2a", label: "Web Connector entry is registered in Five9 (verify via SOAP read-back)" },
            { id: "s2b", label: "Re-running registration is idempotent" },
          ],
        },
      ],
    },
    {
      id: "workflow",
      title: "Core workflow",
      steps: [
        {
          id: "w1",
          title: "Users + Skills sync",
          checks: [
            { id: "w1a", label: "Initial sync populates Users and Skills tables for the domain" },
            { id: "w1b", label: "Last-sync timestamp updates on completion" },
            { id: "w1c", label: "Re-running sync does not duplicate records" },
          ],
        },
        {
          id: "w2",
          title: "SOAP schema alignment",
          body: "WsAdminService v13 alignment. Confirm typed request/response shape.",
          checks: [
            { id: "w2a", label: "Outbound SOAP request validates against expected envelope" },
            { id: "w2b", label: "Unexpected fields are tolerated, not crash the parser" },
          ],
        },
        {
          id: "w3",
          title: "ANI block list via ModifyCampaignProfile",
          checks: [
            { id: "w3a", label: "Adding an ANI updates the campaign profile via SOAP" },
            { id: "w3b", label: "Removing an ANI restores prior state" },
          ],
        },
        {
          id: "w4",
          title: "Disconnect domain safely",
          checks: [
            { id: "w4a", label: "Disconnect runs credential-lifecycle safeguards before tearing down" },
            { id: "w4b", label: "Stored credentials are removed; row state reflects disconnected" },
            { id: "w4c", label: "Subsequent dispatch attempts are short-circuited" },
          ],
        },
      ],
    },
    {
      id: "scenarios",
      title: "Scenario checklist",
      checks: [
        { id: "sc1", label: "Fresh connect on a never-seen domain" },
        { id: "sc2", label: "Re-connect on an existing domain (no duplicate row)" },
        { id: "sc3", label: "Sync drift: external change reflected on next sync" },
        { id: "sc4", label: "Credential rotation: old creds invalidated, new creds accepted" },
        { id: "sc5", label: "Pabbly outage: surfaced as bridge error, not a generic 500" },
      ],
    },
    {
      id: "expected",
      title: "Expected outcomes",
      checks: [
        { id: "e1", label: "five9_domains row reflects connected state and last-sync timestamp" },
        { id: "e2", label: "Users + Skills tables are populated and scoped by domain" },
        { id: "e3", label: "Web Connector is registered and visible in Five9 admin" },
      ],
    },
    {
      id: "failures",
      title: "Failure signals + debugging",
      checks: [
        { id: "f1", label: "SOAP 4xx with reason in fault string surfaced in API logs" },
        { id: "f2", label: "Pabbly proxy errors include upstream status" },
        { id: "f3", label: "Sync edge function falls back cleanly when service role key is missing" },
      ],
    },
    {
      id: "notes",
      title: "Notes",
      intro:
        "Exact table name (five9_domains vs equivalent) and the Web Connector read-back endpoint should be verified in the codebase before scripting automated checks.",
    },
  ],
};

const baseline = (
  slug: string,
  objective: string,
  setup: string[],
  workflow: string[],
  scenarios: string[],
  notes?: string,
): FeaturePlaybook => ({
  slug,
  depth: "baseline",
  objective,
  sections: [
    {
      id: "setup",
      title: "Setup",
      checks: setup.map((label, i) => ({ id: `s${i + 1}`, label })),
    },
    {
      id: "workflow",
      title: "Core workflow",
      checks: workflow.map((label, i) => ({ id: `w${i + 1}`, label })),
    },
    {
      id: "scenarios",
      title: "Scenario checklist",
      checks: scenarios.map((label, i) => ({ id: `sc${i + 1}`, label })),
    },
    ...(notes
      ? [{ id: "notes", title: "Notes", intro: notes } as PlaybookSection]
      : []),
  ],
});

const agentLifecycle = baseline(
  "agent-lifecycle",
  "Validate provisioning and deprovisioning of agents, including naming convention, Slack workspace add, and hard-delete on deprovision.",
  [
    "Confirm Slack connector is connected for the test org",
    "Confirm Five9 admin credentials exist for the target domain",
    "Confirm naming rule produces firstlastinitial@ format",
  ],
  [
    "Quick Provision creates the agent in Five9",
    "Slack workspace add fires and is observable in Slack admin",
    "Deprovision performs hard-delete (no soft-delete row left behind)",
  ],
  [
    "Duplicate name collision is resolved deterministically",
    "Deprovision is idempotent (second call is a no-op)",
  ],
  "Slack workspace add behavior depends on the connector being live; if not connected, mark explicitly as not-tested.",
);

const aiCallFlow = baseline(
  "ai-call-flow-builder",
  "Validate Alex AI persona generates a usable call flow for a chosen CRM preset and the result can be saved as a script.",
  [
    "Confirm AI gateway access (Lovable AI) is available",
    "Pick a CRM preset that has known mappings",
  ],
  [
    "Persona prompt produces a flow with no schema errors",
    "Generated flow renders in the React Flow builder",
    "Save persists a script version row",
  ],
  [
    "Empty preset: surfaces a clear no-template warning",
    "Re-generate produces a new version, not overwrite",
  ],
);

const campaignAutomation = baseline(
  "campaign-automation",
  "Validate the intake form drives the SOAP setup sequence, supports blueprint replicate/reverse, and respects mandatory worksheet completion.",
  [
    "Confirm Five9 admin creds are connected",
    "Confirm at least one blueprint exists",
  ],
  [
    "Intake submission triggers the SOAP setup sequence",
    "Replicate produces a structurally identical campaign",
    "Reverse engineer reads back an existing campaign into a blueprint",
    "agentMustCompleteWorksheet is enforced when set",
  ],
  [
    "Stop campaign from dashboard transitions state correctly",
    "Restart resumes without losing intake data",
  ],
  "Verify the exact intake-to-SOAP edge function name in the repo before scripting any automation.",
);

const crmFieldMapping = baseline(
  "crm-field-mapping",
  "Validate the visual mapping builder can author and persist tenant-specific field maps consumed at dispatch time.",
  [
    "Pick a target CRM with a known schema",
    "Open the visual mapping builder for the test tenant",
  ],
  [
    "Map source -> target fields via React Flow nodes",
    "Save persists the mapping to integration_configs JSONB",
    "Dispatch picks up the mapping on next push",
  ],
  [
    "Removing a mapping reverts to default behavior",
    "Invalid mapping surfaces validation, not a runtime crash",
  ],
);

const decisionTreeScripting = baseline(
  "decision-tree-scripting",
  "Validate the Q&A branching script builder authors, versions, and runs a script in the agent workspace.",
  [
    "Open the script builder for a test campaign",
  ],
  [
    "Add Q&A branch nodes and connect them",
    "Save creates a new script_versions row",
    "Agent workspace runs the script with debounced call notes",
  ],
  [
    "Branching path produces the expected next node",
    "Versioning rollback restores prior script content",
  ],
);

const dispositionEngine = baseline(
  "disposition-engine",
  "Validate disposition-driven branded emails route correctly and gated reporting respects disposition_access.",
  [
    "Confirm at least one disposition is configured with email template",
    "Confirm partner branding overrides exist for the test org",
  ],
  [
    "Trigger a disposition that maps to an email template",
    "Branded email sends with partner overrides applied",
    "Reporting view filters by disposition_access for non-admin role",
  ],
  [
    "Disposition with no template: no email sent, log records skip",
    "Partner without overrides falls back to org defaults",
  ],
);

export const FEATURE_PLAYBOOKS: Record<string, FeaturePlaybook> = {
  "legal-connect": legalConnect,
  "five9-domain-management": five9Domain,
  "agent-lifecycle": agentLifecycle,
  "ai-call-flow-builder": aiCallFlow,
  "campaign-automation": campaignAutomation,
  "crm-field-mapping": crmFieldMapping,
  "decision-tree-scripting": decisionTreeScripting,
  "disposition-engine": dispositionEngine,
};

export function countChecks(p: FeaturePlaybook): number {
  let n = 0;
  for (const s of p.sections) {
    if (s.checks) n += s.checks.length;
    if (s.steps) for (const st of s.steps) n += st.checks.length;
  }
  return n;
}

export function collectCheckIds(p: FeaturePlaybook): string[] {
  const ids: string[] = [];
  for (const s of p.sections) {
    if (s.checks) for (const c of s.checks) ids.push(`${s.id}:${c.id}`);
    if (s.steps)
      for (const st of s.steps)
        for (const c of st.checks) ids.push(`${s.id}:${st.id}:${c.id}`);
  }
  return ids;
}
