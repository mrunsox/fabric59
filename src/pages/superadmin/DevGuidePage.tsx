import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  GitBranch,
  Layers,
  Workflow,
  Plug,
  Target,
  Activity,
  ShieldCheck,
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { ArchitectureFlowchart } from "@/components/dev-guide/ArchitectureFlowchart";

interface Section {
  id: string;
  label: string;
  icon: typeof BookOpen;
}

const SECTIONS: Section[] = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "flowchart", label: "Architecture flowchart", icon: GitBranch },
  { id: "architecture", label: "Core architecture", icon: Layers },
  { id: "flow-types", label: "Flow types", icon: Workflow },
  { id: "connectors", label: "Connector model", icon: Plug },
  { id: "deployments", label: "Deployment model", icon: Target },
  { id: "runs", label: "Runs & reliability", icon: Activity },
  { id: "guardrails", label: "Guardrails", icon: ShieldCheck },
  { id: "clio-grow-mvp", label: "Clio Grow MVP (Phase 1)", icon: Plug },
  { id: "qa-handoff", label: "QA & Handoff (May 2026)", icon: ClipboardCheck },
];

function SectionHeader({ id, title, kicker }: { id: string; title: string; kicker?: string }) {
  return (
    <div className="mb-4">
      {kicker && (
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{kicker}</div>
      )}
      <h2 id={id} className="text-2xl font-semibold text-foreground scroll-mt-24">{title}</h2>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] border border-border/60 bg-secondary/40 text-foreground">
      {children}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border/60 bg-card p-4 sm:p-5">{children}</div>;
}

export default function DevGuidePage() {
  const [active, setActive] = useState<string>("overview");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current?.disconnect();
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    observerRef.current = obs;
    return () => obs.disconnect();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Internal · Superadmin</div>
        <h1 className="text-3xl font-semibold text-foreground">Dev Guide</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Working reference for the team finishing the Five9-native legal integration platform inside Fabric59.
          Terminology mirrors what the FlowBuilder uses today: <Chip>Trigger</Chip> · <Chip>Filters</Chip> ·
          {" "}<Chip>Mapping</Chip> · <Chip>Action</Chip> · <Chip>Failure Policy</Chip> · <Chip>Test</Chip> ·
          {" "}<Chip>Review</Chip>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
        {/* Sticky section nav */}
        <nav className="hidden lg:block">
          <div className="sticky top-20 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 mb-2">
              On this page
            </div>
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : ""}`} />
                  {s.label}
                </a>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-3xl space-y-12">
          {/* Overview */}
          <section>
            <SectionHeader id="overview" title="Overview" kicker="What we're building" />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <p>
                Fabric59 is being built as a <strong>Five9-native integration configurator</strong> for legal
                operations. Five9 is the event spine and call engine. Legal systems such as Clio, MyCase,
                Lawmatics, Litify, CosmoLex, PracticePanther, and Smokeball are downstream or bi-directional
                systems of record.
              </p>
              <p>
                The chain we're building, end to end, is:{" "}
                <Chip>Five9</Chip> → <Chip>Flow Templates</Chip> → <Chip>Flows</Chip> →{" "}
                <Chip>Deployments</Chip> → <Chip>Connectors</Chip> → <Chip>Runs</Chip>.
              </p>
              <p>
                Every other surface in the admin (FlowBuilder, Connectors catalog, Deployments page, Runs page)
                is just a view onto one of those entities. This guide explains each link in that chain using the
                same names the UI already uses.
              </p>
            </div>
          </section>

          {/* Architecture flowchart */}
          <section>
            <SectionHeader id="flowchart" title="Architecture flowchart" kicker="Visual reference" />
            <ArchitectureFlowchart />
            <div className="mt-4 space-y-3 text-sm text-foreground/90 leading-relaxed">
              <p>
                Fabric59 uses Five9 as the event source and orchestration entry point. Admins choose a flow
                template, configure logic and mappings, scope where the flow is deployed, and route actions
                through reusable connectors such as Clio, MyCase, Smokeball, or generic webhook/HTTP targets.
                Every execution is tracked as a run so the system can support monitoring, retry, replay, and
                safe connector behavior over time.
              </p>
              <p className="text-muted-foreground italic">
                Fabric59 is a reusable Five9-native integration hub, not a one-off Clio connector.
              </p>
            </div>
          </section>

          {/* Core architecture */}
          <section>
            <SectionHeader id="architecture" title="Core architecture" kicker="Hierarchy and entities" />
            <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Tenant hierarchy</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Fabric59 has four logical layers. <code className="text-xs bg-secondary/60 px-1 py-0.5 rounded">organizations</code> is the real tenant boundary; everything below it is scoped by <code className="text-xs">organization_id</code>.
                </p>
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  <li><Chip>Platform</Chip> Superadmin, backed by <code className="text-xs">user_roles.role = 'master_admin'</code>. Cross-workspace tools live under <code className="text-xs">/superadmin</code>.</li>
                  <li><Chip>Workspace</Chip> backed by <code className="text-xs">organizations</code>. Tenant boundary for all flows, deployments, runs, templates, partners, and clients.</li>
                  <li><Chip>Partner</Chip> backed by <code className="text-xs">partners</code>. Middle layer inside a Workspace; groups Clients for branding, reporting, and config inheritance.</li>
                  <li><Chip>Client</Chip> backed by <code className="text-xs">tenants</code>. End customer under a Partner / Workspace; holds CRM credentials and integration configs.</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Config merge order: <strong>Client &gt; Partner &gt; Workspace</strong>.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Roles</div>
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  <li><Chip>Superadmin</Chip> <code className="text-xs">user_roles.role = 'master_admin'</code>. Platform-wide. Only role that can read across workspaces.</li>
                  <li><Chip>Workspace Admin</Chip> <code className="text-xs">organization_members.role IN ('owner','admin')</code>. Full control inside one workspace. <code className="text-xs">owner</code> is reserved for billing, deletion, and ownership transfer once those flows ship; today identical to <code className="text-xs">admin</code>.</li>
                  <li><Chip>Workspace Member</Chip> <code className="text-xs">organization_members.role = 'member'</code>. Standard workspace user; gated by <code className="text-xs">user_permissions</code>.</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Source of truth: <code className="text-xs bg-secondary/60 px-1 py-0.5 rounded">src/config/hierarchy.ts</code>.
                </p>
              </Card>

              <p>
                There are six first-class entities. Each one maps to a route in the admin and a table in the
                backend. Read this list top-down — every row depends on the rows above it.
              </p>
              <div className="grid gap-3">
                {[
                  {
                    name: "Flow Template",
                    route: "/admin/templates",
                    desc:
                      "Reusable blueprint with a default Trigger, suggested Filters, baseline Mappings, an Action shape, and a Failure Policy. Templates do not run on their own.",
                  },
                  {
                    name: "Flow",
                    route: "/admin/flows",
                    desc:
                      "A Flow Template instantiated and configured by an admin in the FlowBuilder (Trigger → Filters → Mapping → Action → Failure Policy → Test → Review). A flow is the unit of versioned, testable logic.",
                  },
                  {
                    name: "Connector",
                    route: "/admin/connectors",
                    desc:
                      "A reusable integration to an external system (Clio, MyCase, Smokeball, generic Webhook, Custom HTTP). Declares its capabilities and the actions it exposes.",
                  },
                  {
                    name: "Connector Action",
                    route: "—",
                    desc:
                      "A single capability the connector exposes (e.g. upsert_contact, create_matter, post_webhook). Each action declares its target schema, which drives the Mapping step.",
                  },
                  {
                    name: "Deployment",
                    route: "/admin/deployments",
                    desc:
                      "Binds a Flow to a scope (Workspace, Client, Five9 Domain, Campaign, Queue, and disposition conditions) using a specific Connector instance. A flow without an active deployment never fires.",
                  },
                  {
                    name: "Run",
                    route: "/admin/runs",
                    desc:
                      "One execution of a deployed flow against one Five9 event. Stores request/response payloads, status, idempotency_key, retry chain, and the resolved external record.",
                  },
                ].map((row) => (
                  <Card key={row.name}>
                    <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                      <div className="font-semibold text-foreground">{row.name}</div>
                      {row.route !== "—" ? (
                        <Link to={row.route} className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                          {row.route} <ChevronRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">{row.route}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{row.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Flow types */}
          <section>
            <SectionHeader id="flow-types" title="Flow types" kicker="The five Flow Templates we ship" />
            <p className="text-sm text-muted-foreground mb-4">
              These are the seed templates in <code className="text-xs bg-secondary/60 px-1 py-0.5 rounded">src/data/flow-templates.ts</code>.
              Every flow in Fabric59 starts as one of these and is configured through the FlowBuilder steps.
            </p>
            <div className="grid gap-3">
              {[
                {
                  name: "Disposition Webhook Flow",
                  trigger: "On Call Dispositioned",
                  use: "Fire a webhook to any HTTPS endpoint when a call ends with a chosen disposition.",
                  connectors: ["Webhook", "Custom HTTP"],
                },
                {
                  name: "CRM Action Flow",
                  trigger: "On Call Ended",
                  use: "Run a connector action (create matter, upsert contact, log activity) when a call event matches.",
                  connectors: ["Clio", "MyCase", "Smokeball", "Custom HTTP"],
                },
                {
                  name: "Inbound Lookup Flow",
                  trigger: "Inbound ANI Lookup",
                  use: "On inbound call, look up the caller in a connected system and surface a screen pop.",
                  connectors: ["Clio", "MyCase", "Custom HTTP"],
                },
                {
                  name: "Callback / Task Flow",
                  trigger: "Callback Requested",
                  use: "Create a follow-up task or callback record in the CRM when an agent requests one.",
                  connectors: ["Clio", "MyCase"],
                },
                {
                  name: "Custom Relay Flow",
                  trigger: "Webhook / arbitrary event",
                  use: "Forward any Five9 event to an arbitrary HTTP endpoint with a custom payload.",
                  connectors: ["Webhook", "Custom HTTP"],
                },
              ].map((f) => (
                <Card key={f.name}>
                  <div className="font-semibold text-foreground mb-1">{f.name}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Trigger: <Chip>{f.trigger}</Chip>
                  </div>
                  <p className="text-sm text-foreground/90 mb-2">{f.use}</p>
                  <div className="flex flex-wrap gap-1">
                    {f.connectors.map((c) => (
                      <Chip key={c}>{c}</Chip>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Connector model */}
          <section>
            <SectionHeader id="connectors" title="Connector model" kicker="Reusable integration surfaces" />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <p>
                A Connector is a reusable adapter to an external system. Each connector declares two things
                that the rest of the platform consumes:
              </p>
              <Card>
                <div className="font-semibold mb-1">Capabilities</div>
                <p className="text-sm text-muted-foreground mb-2">
                  Boolean flags that tell the FlowBuilder which Flow Templates this connector can be used with,
                  and what auth / health-check pattern it follows.
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    "supportsActionFlows",
                    "supportsLookupFlows",
                    "supportsWebhookRelay",
                    "supportsCallbackTaskFlows",
                    "supportsTwoWaySync",
                    "authType",
                    "healthCheckType",
                  ].map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                </div>
              </Card>
              <Card>
                <div className="font-semibold mb-1">Actions</div>
                <p className="text-sm text-muted-foreground mb-2">
                  Each connector exposes a set of actions (e.g. <code className="text-xs">upsert_contact</code>,
                  {" "}<code className="text-xs">create_matter</code>, <code className="text-xs">create_task</code>,
                  {" "}<code className="text-xs">post_webhook</code>, <code className="text-xs">http_request</code>).
                  Each action declares <strong>which templates it applies to</strong> and a <strong>target
                  schema</strong>. The Mapping step in the FlowBuilder is generated from that target schema.
                </p>
              </Card>
              <p>
                Source of truth: <code className="text-xs bg-secondary/60 px-1 py-0.5 rounded">src/data/connector-actions.ts</code>.
                Use <code className="text-xs">connectorsForTemplate(templateKey)</code> to filter the connector
                picker; never hard-code lists in the UI.
              </p>
              <p className="text-muted-foreground">
                Adding a new system (e.g. Lawmatics, Litify, CosmoLex, PracticePanther) means: add a{" "}
                <Chip>ConnectorDef</Chip>, declare its capabilities, declare its actions and target schemas.
                No FlowBuilder changes are required.
              </p>
            </div>
          </section>

          {/* Deployment model */}
          <section>
            <SectionHeader id="deployments" title="Deployment model" kicker="Where and when a flow runs" />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <p>
                A Flow is just a definition. A <strong>Deployment</strong> is what actually subscribes that flow
                to a real Five9 event in a real environment. Deployments are scoped to a <strong>Workspace</strong>{" "}
                (<code className="text-xs">organization_id</code>) and may optionally relate to a <strong>Client</strong>{" "}
                (<code className="text-xs">tenant_id</code> / <code className="text-xs">client_id</code>). A deployment binds:
              </p>
              <div className="grid gap-3">
                <Card>
                  <div className="font-semibold mb-1">Scope</div>
                  <div className="flex flex-wrap gap-1">
                    {["Workspace", "Client", "Five9 Domain", "Campaign", "Queue"].map((c) => (
                      <Chip key={c}>{c}</Chip>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Scope follows the SaaS hierarchy: Workspace &gt; Client. Configs merge Client &gt; Partner &gt; Org.
                  </p>
                </Card>
                <Card>
                  <div className="font-semibold mb-1">Conditions</div>
                  <p className="text-sm text-muted-foreground">
                    Disposition conditions, ANI patterns, time windows. Evaluated <em>after</em> the Flow's
                    own Filters step — deployment conditions are an outer guard, Filters are inner business rules.
                  </p>
                </Card>
                <Card>
                  <div className="font-semibold mb-1">Connector instance</div>
                  <p className="text-sm text-muted-foreground">
                    The specific configured connector (with credentials) the flow's Action will run against.
                    The same Flow can be deployed twice — once against client A's Clio, once against client B's MyCase.
                  </p>
                </Card>
                <Card>
                  <div className="font-semibold mb-1">State</div>
                  <div className="flex flex-wrap gap-1">
                    {["draft", "active", "paused", "archived"].map((c) => (
                      <Chip key={c}>{c}</Chip>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Only <Chip>active</Chip> deployments can produce Runs. Pausing a deployment is the safe kill switch.
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* Runs & reliability */}
          <section>
            <SectionHeader id="runs" title="Runs & reliability" kicker="What happens per Five9 event" />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <p>
                When a Five9 event arrives, the dispatcher resolves the matching active deployments, runs the
                configured Flow against the event, and writes one <strong>Run</strong> row per deployment per
                event. The Run row is the single source of truth for what happened.
              </p>
              <Card>
                <div className="font-semibold mb-2">Run row anatomy</div>
                <div className="flex flex-wrap gap-1">
                  {[
                    "id",
                    "flow_id",
                    "deployment_id",
                    "connector_id",
                    "trigger_event",
                    "request_payload",
                    "response_payload",
                    "status",
                    "idempotency_key",
                    "retry_chain",
                    "external_record_id",
                    "created_at",
                  ].map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                </div>
              </Card>
              <Card>
                <div className="font-semibold mb-1">Failure Policy (per flow)</div>
                <p className="text-sm text-muted-foreground">
                  Defined in the FlowBuilder's Failure step. Controls retries, backoff, dead-letter behavior,
                  and whether the run is flagged for human review on failure. The runner is responsible for
                  honoring this — UI just configures it.
                </p>
              </Card>
              <Card>
                <div className="font-semibold mb-1">Idempotency</div>
                <p className="text-sm text-muted-foreground">
                  Every dispatch carries an <Chip>idempotency_key</Chip> derived from
                  {" "}<code className="text-xs">callId + tenantId + disposition</code>. Connectors must treat
                  it as a dedupe token. The TestStep, dispatch preview, and Run Report all surface this key
                  so engineers can verify how it's sent.
                </p>
              </Card>
              <Card>
                <div className="font-semibold mb-1">Retry & replay</div>
                <p className="text-sm text-muted-foreground">
                  The retry chain is appended to the same Run row, never written as a new Run. Manual replay
                  from the Run detail page reuses the original request payload and idempotency key so the
                  downstream system sees the same operation.
                </p>
              </Card>
            </div>
          </section>

          {/* Guardrails */}
          <section>
            <SectionHeader id="guardrails" title="Guardrails" kicker="Things to keep true as we finish the build" />
            <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
              {[
                {
                  t: "Reuse FlowBuilder terminology everywhere",
                  d: "Trigger, Filters, Mapping, Action, Failure Policy, Test, Review. Don't invent synonyms in docs, errors, or analytics events.",
                },
                {
                  t: "Connectors are reusable, not bespoke",
                  d: "Never branch logic per client inside a connector. Per-client behavior lives in the Flow's Mappings/Filters and in the Deployment's connector instance + conditions.",
                },
                {
                  t: "Templates drive the catalog, not the UI",
                  d: "Connector pickers and template choices come from the data layer (flow-templates.ts, connector-actions.ts via connectorsForTemplate). No hard-coded lists in pages.",
                },
                {
                  t: "Every dispatch produces a Run",
                  d: "If a Five9 event hit a matching active deployment, a Run row exists — even on validation failure. Silent drops are bugs.",
                },
                {
                  t: "Idempotency is non-negotiable",
                  d: "callId + tenantId + disposition. Same key + same payload = same downstream record. The platform must guarantee this regardless of connector.",
                },
                {
                  t: "Multi-tenant isolation",
                  d: "All reads filtered by org_id via RLS plus an explicit org_id filter in queries. Views use security_invoker=true. Use SECURITY DEFINER only for org membership checks.",
                },
                {
                  t: "Five9 stays the spine",
                  d: "Agents do not log into CRMs directly. All call-time context flows through the Five9 Desktop, fed by Inbound Lookup flows and post-call CRM Action flows.",
                },
              ].map((g) => (
                <Card key={g.t}>
                  <div className="font-semibold text-foreground mb-1">{g.t}</div>
                  <p className="text-sm text-muted-foreground">{g.d}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Clio Grow MVP — Phase 1.1 hardened */}
          <section>
            <SectionHeader
              id="clio-grow-mvp"
              title="Clio Grow MVP (Phase 1)"
              kicker="Native Five9 → Clio Grow Lead Inbox"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Why these decisions</div>
                <ul className="space-y-1.5 text-sm">
                  <li>
                    <Chip>Auth</Chip> Phase 1 uses the Clio Grow <strong>Lead Inbox token</strong>
                    {" "}(per-inbox value pasted in the wizard) — Grow does not expose an OAuth
                    refresh flow for inbound lead creation.
                  </li>
                  <li>
                    <Chip>Mapping</Chip> The canonical mapping store is{" "}
                    <code className="text-xs">legal_connect_call_variable_mappings</code> + the{" "}
                    <code className="text-xs">legal_connect_disposition_mappings.metadata.create_lead</code>
                    {" "}flag. <code className="text-xs">field_mappings</code> + the visual builder
                    remain a parallel UI to be reconciled later.
                  </li>
                  <li>
                    <Chip>Inline dispatch</Chip> Existing inline Clio Manage / MyCase paths in{" "}
                    <code className="text-xs">five9-main</code> are intentionally untouched. Clio
                    Grow runs alongside them through the adapter + sync-job path only.
                  </li>
                  <li>
                    <Chip>Idempotency</Chip> Producer key is{" "}
                    <code className="text-xs">clio_grow:lead.create:&lt;correlation_id&gt;</code>. A
                    duplicate Five9 event for the same correlation id is rejected at insert time
                    and recorded as <code className="text-xs">producer_skip_reason = duplicate_event</code>.
                  </li>
                </ul>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Runtime path</div>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li>Five9 ESS posts the disposition event to <Chip>five9-main</Chip>.</li>
                  <li><Chip>normalizer</Chip> shapes the payload, <Chip>router</Chip> resolves tenant + provider_target.</li>
                  <li><Chip>disposition engine</Chip> evaluates capability-driven actions (capability <code className="text-xs">create_lead</code>).</li>
                  <li>Producer enqueues a row in <Chip>legal_connect_sync_jobs</Chip> (provider <code className="text-xs">clio_grow</code>, type <code className="text-xs">lead.create</code>).</li>
                  <li><Chip>five9_event_log</Chip> row records correlation id, mapped actions, sync_jobs_created and any <code className="text-xs">producer_skip_reason</code>.</li>
                  <li><Chip>legal-connect-jobs</Chip> picks up the queued job, calls the <Chip>clio-grow</Chip> adapter.</li>
                  <li>Adapter POSTs to <code className="text-xs">https://grow.clio.com/inbox_leads</code> with the inbox_lead_token from the connection.</li>
                  <li>Result + connection health pointers are written back to <Chip>legal_connect_connections</Chip>.</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-3">
                  Failures bypassing job creation (no connection / missing required field) open a
                  <code className="mx-1 px-1 rounded bg-secondary/60">legal_connect_review_queue</code>
                  item with <code className="text-xs">review_type = no_connection | validation_failure</code>.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Failure classification</div>
                <ul className="space-y-1 text-sm">
                  <li><Chip>validation</Chip> 400/422 or local pre-flight failure — non-retryable.</li>
                  <li><Chip>auth</Chip> 401/403 from Grow — non-retryable, surface "bad token".</li>
                  <li><Chip>rate_limited</Chip> 429 — retryable with backoff.</li>
                  <li><Chip>upstream_5xx</Chip> 5xx from Grow — retryable.</li>
                  <li><Chip>timeout</Chip> 15s adapter cutoff — retryable.</li>
                  <li><Chip>network</Chip> fetch failure — retryable.</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  The wizard maps these <code className="text-xs">failure_kind</code> values to
                  human copy. The token is never echoed in logs or errors.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">End-to-end test flow</div>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  <li>Connect Grow token via the client-level wizard at{" "}
                    <code className="text-xs">/admin/clients/:id/legal-connect/setup/clio_grow</code>.
                  </li>
                  <li>Run the wizard's <strong>Send test lead</strong> step and confirm a
                    <code className="mx-1 px-1 rounded bg-secondary/60">fabric59:test</code> lead appears in Grow.
                  </li>
                  <li>Configure a route with <code className="text-xs">provider_target = clio_grow</code> in{" "}
                    <code className="text-xs">five9_campaign_routes</code> (or via the UI).</li>
                  <li>Add a disposition mapping with{" "}
                    <code className="text-xs">metadata.create_lead = true</code> in{" "}
                    <code className="text-xs">legal_connect_disposition_mappings</code>.</li>
                  <li>Trigger or replay an ESS-style <code className="text-xs">disposition</code>
                    event against <Chip>five9-main</Chip>.</li>
                  <li>Inspect the <strong>Clio Grow delivery</strong> panel on{" "}
                    <code className="text-xs">/admin/legal-connect/overview</code>: the job row,
                    matched event, review queue items and skip reasons all join by{" "}
                    <code className="text-xs">correlation_id</code>.</li>
                  <li>Verify the lead lands in the Grow inbox.</li>
                </ol>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Call lifecycle reminder</div>
                <p className="text-sm">
                  In the MVP, lead creation runs from the <strong>post-disposition</strong> phase
                  only — not pre-call, during-call, or ACW. This matches the Lead Inbox use case
                  (final outcome → lead) and keeps the producer idempotent against
                  <code className="mx-1 px-1 rounded bg-secondary/60">correlation_id</code>.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                  <li><Chip>Pre-call</Chip> ANI lookup / screen-pop (untouched in this phase).</li>
                  <li><Chip>During call</Chip> agent script + call variables.</li>
                  <li><Chip>ACW</Chip> agent finalises disposition + notes.</li>
                  <li><Chip>Post disposition</Chip> Five9 emits ESS event → producer fires.</li>
                </ul>
              </Card>
            </div>
          </section>


          <section>
            <SectionHeader
              id="qa-handoff"
              title="QA & Implementation Handoff – Fabric59 (May 2026)"
              kicker="Baseline · PR #1 · Remaining work"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Baseline status</div>
                <p className="text-sm text-muted-foreground">
                  As of <strong>May 5, 2026</strong>, Fabric59 is wired end-to-end for: the 8 Feature
                  Vault entries and their playbooks, the export pipeline, the Five9 Test Connection
                  edge function, the superadmin route directory, and the multi-step onboarding
                  wizard. <strong>PR #1 — "QA handoff fixes"</strong> (merged into <code className="text-xs bg-secondary/60 px-1 py-0.5 rounded">main</code>) is the
                  baseline this Dev Guide assumes. Build on top of that commit; do not reintroduce
                  the dead-ends listed below.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">What was fixed in the QA pass</div>
                <ul className="space-y-2 text-sm text-foreground/90">
                  {[
                    <>Top-level routes (<code className="text-xs">/vault</code>, <code className="text-xs">/five9</code>, <code className="text-xs">/legal-connect</code>, <code className="text-xs">/settings</code>, <code className="text-xs">/master/vault/:id</code>) now redirect to their canonical destinations instead of 404.</>,
                    <>Legal Connect: <Chip>Connect</Chip> <Chip>Refresh</Chip> <Chip>View</Chip> buttons are wired to real navigation and react-query invalidation (no longer inert).</>,
                    <>Five9 Overview &amp; Legal Connect Overview: webhook/health badges reflect real 24h health from <code className="text-xs">five9_event_log</code> and <code className="text-xs">legal_sync_jobs</code>, not hardcoded "OK".</>,
                    <>Vault Export <Chip>Download</Chip> now forces a real file download instead of opening a crashing tab.</>,
                    <>Settings → <Chip>Export Compliance Report</Chip> returns an honest client-side JSON snapshot (no secrets), instead of a toast-only stub.</>,
                    <><code className="text-xs">/admin/domains/:id</code> surfaces <Chip>Test Connection</Chip> on the locked state for already-connected domains.</>,
                    <>Feature Vault experimental items (Legal Connect, Five9 Domain Management) show status-aware cards and deep links to live pages instead of misleading "Why archived —".</>,
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-1">Still to do</div>
                <p className="text-xs text-muted-foreground mb-3">
                  Future product/engineering work — not gaps in core routing or wiring.
                </p>
                <ul className="space-y-2 text-sm text-foreground/90">
                  {[
                    "Implement real Clio / MyCase OAuth and Five9 credential save on the Legal Connect Connections tab (replace fake \"connected\" rows).",
                    "Implement real Test behavior for the Mapping Builder instead of a toast-only stub.",
                    "Author reason_archived / Status & risks content for Legal Connect and Five9 Domain Management vault entries.",
                    "Build an audit-grade server-side compliance export (logs, RLS snapshot, etc.) to replace the client-only JSON snapshot.",
                    "Reduce bundle size via code-splitting (current bundle ~4.3 MB / 1.0 MB gz).",
                    "Polish Legal Connect empty states across tabs.",
                    "Move .env Supabase URL/anon-key configuration into the secret store while keeping public client exposure behavior intact.",
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Quick QA playbook summary</div>
                <p className="text-sm text-muted-foreground">
                  The QA pass validated the full navigation surface — admin, superadmin, Feature
                  Vault, Legal Connect's 11 tabs, Five9 domain detail, Settings tabs, onboarding,
                  and more. All dead-ends and toast-only actions identified at that time are either
                  fixed in PR #1 or explicitly listed in the "Still to do" checklist above.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">References</div>
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  <li>· Merged PR: <strong>PR #1 — "QA handoff fixes"</strong> (baseline on <code className="text-xs">main</code>).</li>
                  <li>· Merge commit SHA on <code className="text-xs">main</code> is the canonical baseline for this guide.</li>
                  <li>· Detailed QA report and Lovable prompts file live in the repo/workspace for deep dives — this Dev Guide section is the canonical day-to-day summary.</li>
                </ul>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
