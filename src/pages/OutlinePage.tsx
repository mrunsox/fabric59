import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Circle, Clock, ShieldAlert } from "lucide-react";
import { GLOBAL_SECTIONS, WORKSPACE_SECTIONS } from "@/config/navigation";

/**
 * /outline — Internal Canonical Build Doc
 *
 * Source of truth: "Fabric59 Canonical Strip + Rebuild Master Spec".
 * This page is gated to master_admin (mounted under MasterProtectedRoute in App.tsx)
 * and reachable from /superadmin/docs as well. It is no longer a public route in IA.
 *
 * Editable structure: keep this file declarative — sections are arrays so phases,
 * checklists, and entities can be tracked centrally.
 */

type Status = "done" | "in_progress" | "todo" | "blocked";

const StatusIcon = ({ s }: { s: Status }) => {
  if (s === "done") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (s === "in_progress") return <Clock className="h-4 w-4 text-primary" />;
  if (s === "blocked") return <ShieldAlert className="h-4 w-4 text-destructive" />;
  return <Circle className="h-4 w-4 text-muted-foreground/60" />;
};

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 space-y-3">
    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    <Separator />
    <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">{children}</div>
  </section>
);

const PHASES: { id: string; name: string; status: Status; objectives: string; exit: string }[] = [
  {
    id: "p0", name: "Phase 0 — Freeze + vault prep", status: "done",
    objectives: "Document current state. Identify duplicates. Mark vault candidates. No deletions.",
    exit: "Every soon-to-be-deleted artifact has a vault record; cleanup matrix exists; regression baseline captured.",
  },
  {
    id: "p1", name: "Phase 1 — Route + nav strip", status: "done",
    objectives: "Collapse primary nav to canonical seven; de-surface duplicates; add safe redirects.",
    exit: "Org-level nav matches spec; no duplicate entry points in nav; all legacy URLs redirect or remain reachable.",
  },
  {
    id: "p2a", name: "Phase 2A — Workspace shell + route scaffolding", status: "done",
    objectives: "Mount canonical /app/workspaces/:workspaceId/* shell with WORKSPACE_SECTIONS, breadcrumbs, switcher; reuse legacy pages where safe; placeholders elsewhere; no DB changes.",
    exit: "Workspace shell renders all 13 canonical sections; breadcrumb Org > Workspace > Section works; legacy /admin/* untouched.",
  },
  {
    id: "p2b", name: "Phase 2B — Real workspace foundation + data binding", status: "done",
    objectives:
      "Real workspaces + workspace_members tables (RLS, default-per-org backfill, auto-create trigger). " +
      "WorkspaceContext rebinds to canonical workspace data. Workspace-aware Clients page lands as the first " +
      "rebinding example. Other reused pages stay org-scoped and rebind incrementally.",
    exit: "workspaces table live with backfill; WorkspaceContext sources from DB; /app/workspaces/:id/clients resolves via workspace context; /admin/* untouched.",
  },
  {
    id: "p3", name: "Phase 3 — Canonical campaigns", status: "done",
    objectives:
      "Introduce canonical workspace-owned `campaigns` table with status enum (draft/ready/live/paused/archived). " +
      "One-way mirror trigger from legacy `campaign_setups` keeps both surfaces in sync. " +
      "Canonical list/detail/new pages live under /app/workspaces/:id/campaigns. " +
      "CampaignIntakePage chosen as the canonical surviving creation flow.",
    exit:
      "campaigns table backfilled and live; canonical list+detail+new routed under workspace; legacy /admin/campaigns* preserved as compatibility writers.",
  },
  {
    id: "p4", name: "Phase 4 — Guides", status: "done",
    objectives:
      "Canonical workspace-owned `guides` table + `guide_versions` (status enum draft/published/archived). " +
      "One-way mirror trigger `mirror_script_to_guide` backfills/syncs from legacy `scripts`. " +
      "Canonical list/detail/edit/preview routes under /app/workspaces/:id/guides. " +
      "ScriptBuilderPage at /admin/scripts/:scriptId/builder is the canonical surviving builder.",
    exit:
      "guides + guide_versions live; canonical routes live; ScriptBuilderPage promoted as survivor; campaign assignment functional under workspace scope.",
  },
  {
    id: "p5", name: "Phase 5 — Templates unification", status: "in_progress",
    objectives:
      "Collapse 7 legacy template tables (script_templates, flow_templates, email_templates, report_templates, " +
      "call_summary_templates, legal_connect_prompt_templates, campaign_blueprints) into one canonical `templates` table " +
      "keyed by scope_type (platform/org/partner/client/workspace) + kind (guide/flow/campaign/email/summary/prompt/report). " +
      "Mirror triggers + backfill from each legacy writer; parent_template_id provides fork lineage; canonical workspace " +
      "routes /app/workspaces/:id/templates{,/:id} expose the unified gallery and fork action.",
    exit:
      "templates + template_versions live with backfill from all 7 legacy tables; canonical workspace template routes live; " +
      "fork-into-workspace flow functional; legacy template pages remain authoritative writers (mirrored, not yet purged).",
  },
  {
    id: "p6", name: "Phase 6 — Forms (new)", status: "todo",
    objectives: "Build canonical Form artifact: schema, conditions, validation, mapping targets, versioning.",
    exit: "Form library + builder live; forms assignable to campaigns/guides; submissions captured.",
  },
  {
    id: "p7", name: "Phase 7 — Integrations canonical layer", status: "todo",
    objectives: "Provider-agnostic adapter contract behind one Integrations UI. Delete stub adapters.",
    exit: "Single integrations surface; capability registry; sync jobs/logs/retry surfaced; no stub providers.",
  },
  {
    id: "p8", name: "Phase 8 — Dashboards, QA, analytics, billing, launch polish", status: "todo",
    objectives: "Operator surfaces: supervisor live ops, QA scoring, workspace analytics, billing.",
    exit: "Mission-control dashboards live; QA queue functional; billing tied to canonical usage.",
  },
  {
    id: "p9", name: "Phase 9 — AI, agent assist, polish, GA", status: "todo",
    objectives: "Workspace-scoped AI: summaries, node suggestions, post-call automations.",
    exit: "AI features versioned, scoped, audited; market-ready checklist green.",
  },
];

const ENTITIES = [
  { entity: "Organization", canonical: "Existing — keep", notes: "organizations table survives." },
  { entity: "Workspace", canonical: "Build (Phase 2)", notes: "Currently nominal — must become real entity." },
  { entity: "Client", canonical: "Rename UI of tenants", notes: "DB stays tenants*; UI says Client." },
  { entity: "Campaign", canonical: "Collapse (Phase 3)", notes: "7 fragmented surfaces → one canonical entity." },
  { entity: "Guide", canonical: "Collapse (Phase 4)", notes: "scripter / tree-editor / scriptflow → one Guide." },
  { entity: "Form", canonical: "Build (Phase 6)", notes: "Net-new canonical artifact." },
  { entity: "Template", canonical: "Unify (Phase 5)", notes: "7 legacy template tables → one canonical templates model with scope+kind+lineage." },
  { entity: "Interaction / Session", canonical: "Existing — keep", notes: "call_sessions + session_events retained." },
  { entity: "Outcome / Task / Sync Event", canonical: "Existing — keep", notes: "Outcome engine + sync_jobs retained." },
];

const KEEP_VAULT_DELETE = [
  { area: "Auth + guards", action: "KEEP", notes: "ProtectedRoute, MasterProtectedRoute, AuthContext untouched." },
  { area: "Superadmin shell + governance", action: "KEEP", notes: "Vault, exports, dev-guide, test-cases, call-flow, system docs." },
  { area: "Five9 runtime + edge functions", action: "KEEP", notes: "five9-main, webhooks, SOAP layer." },
  { area: "Legal Connect adapters + sync engine", action: "KEEP", notes: "Connection, sync_jobs, audit, Clio/MyCase adapters." },
  { area: "Mapping builder", action: "KEEP", notes: "React Flow mapping foundation survives." },
  { area: "Notifications + audit infra", action: "KEEP", notes: "Notification routing, error_alerts." },
  { area: "Duplicate dashboards", action: "VAULT", notes: "/admin/agent-dashboard kept routable; de-surfaced from nav." },
  { area: "Duplicate script builders", action: "VAULT", notes: "scripter, tree-editor, scriptflow, script-routing, scripts — kept routable; merge into Guide in Phase 4." },
  { area: "Fragmented campaign surfaces", action: "VAULT", notes: "campaigns/overview, /drafts, /readiness, /event-log, campaign-blueprints — collapse in Phase 3." },
  { area: "Five9 legacy overview", action: "REDIRECT", notes: "/admin/five9/legacy → /admin/five9." },
  { area: "Tenants alias", action: "REDIRECT", notes: "/admin/tenants → /admin/clients." },
  { area: "Integrations alias", action: "REDIRECT", notes: "/admin/integrations → /admin/connectors." },
  { area: "Public /outline", action: "INTERNALIZE", notes: "Now master_admin only; reachable via /superadmin/docs." },
  { area: "Stub integration edge functions", action: "DELETE (Phase 7)", notes: "~50 namespace squatters: Salesforce, HubSpot, Zendesk, etc." },
];

const DUPLICATE_CLUSTERS = [
  { cluster: "Overview / dashboard", routes: "/admin (index), /admin/dashboard, /admin/agent-dashboard", target: "Single canonical Overview (Phase 2)" },
  { cluster: "Client / tenant", routes: "/admin/clients, /admin/tenants, /admin/clients/:id/workspace", target: "/admin/clients (now); /app/workspaces/:id/clients (Phase 2)" },
  { cluster: "Five9", routes: "/admin/five9, /admin/five9/legacy", target: "Single /admin/five9 (legacy already redirected)" },
  { cluster: "Campaigns", routes: "/admin/campaigns, /campaigns/overview, /drafts, /readiness, /event-log, /campaign-blueprints, /five9/campaign-builder", target: "Canonical campaigns (Phase 3)" },
  { cluster: "Scripts / guides", routes: "/admin/scripter, /admin/scripts, /admin/tree-editor, /admin/scriptflow, /admin/script-routing", target: "Canonical Guide (Phase 4)" },
  { cluster: "Integrations", routes: "/admin/connectors, /admin/integrations, /admin/legal-connect", target: "/admin/connectors with sub-nav (now)" },
  { cluster: "Docs", routes: "/admin/docs, /admin/kb, /superadmin/docs", target: "/superadmin/docs (Phase 7+)" },
];

const DUPLICATE_BUILDERS = [
  "components/script-builder/ — primary candidate for Guide builder.",
  "components/tree-editor/ — vault after Phase 4.",
  "components/flows/ — keep for Phase 7 integrations orchestration.",
  "components/campaign-builder/ — fold into canonical campaigns (Phase 3).",
  "components/mapping-builder/ — keep, integrations mapping foundation.",
];

const STUB_INTEGRATIONS = [
  "Salesforce, HubSpot, Zendesk, Pipedrive, Zoho, Freshdesk, Intercom, Front, Help Scout — empty edge function stubs (~50 total).",
  "Marked DELETE in Phase 7. Until then, hidden from UI; not exposed in nav.",
];

const FREEZE_CHECKLIST: { id: string; label: string; status: Status }[] = [
  { id: "route-freeze", label: "Route freeze — full route inventory captured", status: "done" },
  { id: "component-freeze", label: "Component freeze — duplicate builders identified", status: "done" },
  { id: "entity-freeze", label: "Entity freeze — canonical entity table locked", status: "done" },
  { id: "integration-freeze", label: "Integration freeze — stub providers listed", status: "done" },
  { id: "vault-candidates", label: "Vault candidates documented", status: "done" },
  { id: "redirect-candidates", label: "Redirect candidates documented + safe redirects added", status: "done" },
  { id: "ws-shell", label: "Phase 2A — canonical workspace shell mounted at /app/workspaces/:workspaceId/*", status: "done" },
  { id: "ws-context-adapter", label: "Phase 2A — temporary URL-level workspace=organization adapter", status: "done" },
  { id: "ws-bridging", label: "Phase 2A — legacy admin pages reused under canonical shell where safe", status: "done" },
  { id: "ws-entity", label: "Phase 2B — real workspaces + workspace_members tables (RLS, backfill, auto-create trigger)", status: "done" },
  { id: "ws-context-real", label: "Phase 2B — WorkspaceContext sources from canonical workspaces table", status: "done" },
  { id: "ws-clients-bound", label: "Phase 2B — workspace-scoped clients listing live at /app/workspaces/:id/clients", status: "done" },
  { id: "ws-roles-scaffold", label: "Phase 2B — WORKSPACE_ROLES constants + workspace_role enum (no auth rewrite)", status: "done" },
  { id: "ws-rebind-rest", label: "Phase 2B follow-ups — rebind agents/supervisor/qa/analytics/integrations/settings to workspace context", status: "in_progress" },
  { id: "ws-client-fk", label: "Phase 2B follow-up — add workspace_id to clients (tenants) and switch hook predicate", status: "todo" },
  { id: "p3-campaigns-table", label: "Phase 3 — canonical campaigns table (workspace-owned, RLS, status enum)", status: "done" },
  { id: "p3-mirror-trigger", label: "Phase 3 — one-way mirror trigger campaign_setups → campaigns", status: "done" },
  { id: "p3-backfill", label: "Phase 3 — backfill canonical campaigns from existing campaign_setups", status: "done" },
  { id: "p3-routes", label: "Phase 3 — canonical /app/workspaces/:id/campaigns list+detail+new live", status: "done" },
  { id: "p3-canonical-create", label: "Phase 3 — CampaignIntakePage chosen as the canonical surviving creation flow", status: "done" },
  { id: "p3-other-tables", label: "Phase 3 follow-up — fold campaign_archives/blueprints/builder_drafts/scripts/legal_connect_campaigns/five9_campaign_routes into canonical model", status: "todo" },
  { id: "p3-write-canonical", label: "Phase 3 follow-up — canonical write path (insert into campaigns directly, deprecate campaign_setups writes)", status: "todo" },
  { id: "p4-guides-table", label: "Phase 4 — canonical guides + guide_versions tables (workspace-owned, RLS, status enum)", status: "done" },
  { id: "p4-mirror-trigger", label: "Phase 4 — one-way mirror trigger scripts → guides + backfill", status: "done" },
  { id: "p4-routes", label: "Phase 4 — /app/workspaces/:id/guides list+detail+edit+preview live", status: "done" },
  { id: "p4-survivor", label: "Phase 4 — ScriptBuilderPage promoted as canonical builder survivor", status: "done" },
  { id: "p4-assignment", label: "Phase 4 — guide-to-campaign assignment via guides.campaign_id", status: "done" },
  { id: "p4-write-canonical", label: "Phase 4 follow-up — native canonical guide create + edit (no script bridge)", status: "todo" },
  { id: "p4-vault-legacy", label: "Phase 4 follow-up — vault TreeEditor / Scripter / ScriptFlowHub / ScriptRouting once canonical builder is feature-complete", status: "todo" },
  { id: "p4-version-publish", label: "Phase 4 follow-up — canonical publish path writes guide_versions (current-version flag, rollback)", status: "todo" },
  { id: "p5-templates-table", label: "Phase 5 — canonical templates + template_versions tables (scope+kind enums, parent lineage, RLS)", status: "done" },
  { id: "p5-mirror-triggers", label: "Phase 5 — mirror triggers from 7 legacy template tables + backfill", status: "done" },
  { id: "p5-routes", label: "Phase 5 — /app/workspaces/:id/templates list+detail live with kind+scope filters", status: "done" },
  { id: "p5-fork", label: "Phase 5 — fork-into-workspace flow with parent_template_id lineage", status: "done" },
  { id: "p5-consume-campaigns", label: "Phase 5 follow-up — campaigns can be created from canonical campaign templates", status: "todo" },
  { id: "p5-consume-guides", label: "Phase 5 follow-up — guides can be created from canonical guide templates", status: "todo" },
  { id: "p5-write-canonical", label: "Phase 5 follow-up — canonical native template create + edit (no legacy bridge)", status: "todo" },
  { id: "p5-vault-legacy", label: "Phase 5 follow-up — vault legacy template editors once canonical UI is feature-complete", status: "todo" },
];

const NON_GOALS = [
  "No new workspaces DB entity this phase.",
  "No campaign / guide / form / template consolidation this phase.",
  "No edge-function changes, no provider work.",
  "No marketing site rebuild.",
  "No hard route deletions — only redirects + de-surfacing.",
  "No DB migrations.",
  "No renaming of tenant* tables in DB.",
];

const LAUNCH_REQUIREMENTS = [
  "Public marketing narrative aligned to canonical product.",
  "Clean login / signup / onboarding.",
  "Real workspace model with workspace-scoped RBAC.",
  "Real client model inside workspaces.",
  "One canonical campaign entity + builder.",
  "One canonical guide builder.",
  "Forms artifact live and assignable.",
  "Unified templates system.",
  "Integrations: Five9 + Clio + MyCase live; no stub providers.",
  "Supervisor live-ops + QA scoring + workspace analytics.",
  "Billing tied to canonical usage signals.",
  "Audit, vault, and rollback support across all destructive moves.",
];

export default function OutlinePage() {
  useEffect(() => {
    document.title = "Canonical build doc | Fabric59 internal";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="space-y-3 mb-10">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary">Internal</Badge>
            <Badge variant="outline">Master admin only</Badge>
            <Badge variant="outline" className="border-accent/40 text-accent">Source of truth</Badge>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Fabric59 — Canonical Build Doc</h1>
              <p className="text-sm text-muted-foreground max-w-3xl mt-2">
                Living implementation document for the Canonical Strip + Rebuild. Derived from the locked master spec.
                This page replaces all prior outline content. Public access is removed.
              </p>
            </div>
            <a
              href="/superadmin"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline whitespace-nowrap"
            >
              ← Back to Platform Admin
            </a>
          </div>
        </header>

        <ScrollArea className="pr-4">
          <div className="space-y-12 pb-24">
            <Section id="product" title="1. Canonical product statement">
              <p>
                Fabric59 is a multi-tenant operational intelligence platform for service organizations, beginning with
                legal intake and call-center assisted workflows.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Five9</strong> = telephony / session / event layer.</li>
                <li><strong>Fabric59</strong> = live intelligence workspace, workflow engine, templates, guides, forms, QA, agent assist, monitoring, integration orchestration.</li>
                <li><strong>Downstream legal CRM</strong> = adapter-driven system of record. Clio first, MyCase next, provider-agnostic by design.</li>
              </ul>
            </Section>

            <Section id="hierarchy" title="2. Locked hierarchy">
              <pre className="rounded-md bg-muted/40 p-4 text-xs font-mono leading-relaxed">{`Platform
  └─ Organization
       └─ Workspace
            └─ Client
                 └─ Campaign
                      ├─ Guide
                      └─ Form
                           └─ Interaction / Session
                                └─ Outcome / Task / Sync Event`}</pre>
            </Section>

            <Section id="rbac" title="3. Locked RBAC">
              <div className="grid sm:grid-cols-3 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Platform</CardTitle></CardHeader><CardContent className="text-xs space-y-1"><div>Superadmin</div><div>Platform Ops</div><div>Platform Viewer</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Organization</CardTitle></CardHeader><CardContent className="text-xs space-y-1"><div>Owner</div><div>Admin</div><div>Member</div><div>Billing Admin</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Workspace</CardTitle></CardHeader><CardContent className="text-xs space-y-1"><div>Owner</div><div>Admin</div><div>Supervisor</div><div>Agent</div><div>Analyst / QA</div><div>Viewer</div></CardContent></Card>
              </div>
            </Section>

            <Section id="ia" title="4. Target information architecture">
              <h3 className="text-sm font-semibold text-foreground">Org-level primary nav (live now)</h3>
              <ul className="list-disc pl-5 space-y-1">
                {GLOBAL_SECTIONS.map((s) => <li key={s.key}>{s.label} — <code className="text-xs">{s.href}</code></li>)}
              </ul>
              <h3 className="text-sm font-semibold text-foreground mt-4">Workspace-level secondary nav (Phase 2 target)</h3>
              <ul className="list-disc pl-5 space-y-1">
                {WORKSPACE_SECTIONS.map((s) => <li key={s.key}>{s.label}</li>)}
              </ul>
            </Section>

            <Section id="routes" title="5. Final route structure (target)">
              <p className="text-xs">Superadmin routes mounted under <code>/superadmin</code> are canonical today.</p>
              <p className="text-xs">Org/workspace app routes will move under <code>/app/workspaces/:workspaceId/...</code> in Phase 2.</p>
              <p className="text-xs">Current <code>/admin/*</code> routes remain reachable until Phase 2 completes the move.</p>
            </Section>

            <Section id="entities" title="6. Canonical entities">
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="text-left p-2">Entity</th><th className="text-left p-2">Status</th><th className="text-left p-2">Notes</th></tr></thead>
                <tbody>
                  {ENTITIES.map((e) => (
                    <tr key={e.entity} className="border-b border-border/40">
                      <td className="p-2 font-medium text-foreground">{e.entity}</td>
                      <td className="p-2">{e.canonical}</td>
                      <td className="p-2 text-muted-foreground">{e.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section id="kvd" title="7. Keep / Vault / Delete matrix">
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="text-left p-2">Area</th><th className="text-left p-2">Action</th><th className="text-left p-2">Notes</th></tr></thead>
                <tbody>
                  {KEEP_VAULT_DELETE.map((r) => (
                    <tr key={r.area} className="border-b border-border/40">
                      <td className="p-2 font-medium text-foreground">{r.area}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.action}</Badge></td>
                      <td className="p-2 text-muted-foreground">{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section id="phases" title="8. Phased plan">
              <div className="space-y-2">
                {PHASES.map((p) => (
                  <Card key={p.id} className={p.status === "in_progress" ? "border-primary/40" : ""}>
                    <CardContent className="p-4 flex gap-3">
                      <div className="pt-0.5"><StatusIcon s={p.status} /></div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">{p.name}</h4>
                          {p.status === "in_progress" && <Badge className="text-[10px]">current</Badge>}
                        </div>
                        <p className="text-xs"><strong>Objectives:</strong> {p.objectives}</p>
                        <p className="text-xs"><strong>Exit:</strong> {p.exit}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Section>

            <Section id="launch" title="9. Launch / market-ready requirements">
              <ul className="list-disc pl-5 space-y-1">
                {LAUNCH_REQUIREMENTS.map((l) => <li key={l}>{l}</li>)}
              </ul>
            </Section>

            <Section id="non-goals" title="10. Explicit non-goals (this phase)">
              <ul className="list-disc pl-5 space-y-1">
                {NON_GOALS.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </Section>

            <Section id="execution" title="11. Canonical Rebuild Execution Status">
              <h3 className="text-sm font-semibold text-foreground">Phase 0 freeze checklist</h3>
              <ul className="space-y-1.5">
                {FREEZE_CHECKLIST.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-xs">
                    <StatusIcon s={c.status} /> <span className="text-foreground">{c.label}</span>
                  </li>
                ))}
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Identified duplicate route clusters</h3>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="text-left p-2">Cluster</th><th className="text-left p-2">Routes</th><th className="text-left p-2">Canonical target</th></tr></thead>
                <tbody>
                  {DUPLICATE_CLUSTERS.map((d) => (
                    <tr key={d.cluster} className="border-b border-border/40">
                      <td className="p-2 font-medium text-foreground">{d.cluster}</td>
                      <td className="p-2 font-mono text-[11px] text-muted-foreground">{d.routes}</td>
                      <td className="p-2">{d.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="text-sm font-semibold text-foreground mt-6">Duplicate builders</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                {DUPLICATE_BUILDERS.map((b) => <li key={b}>{b}</li>)}
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Stub integration surfaces</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                {STUB_INTEGRATIONS.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </Section>

            <Section id="phase-4-decisions" title="12. Phase 4 — Guide consolidation decisions">
              <h3 className="text-sm font-semibold text-foreground">Current guide / script fragmentation</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs font-mono">
                <li>/admin/scripts</li>
                <li>/admin/scripts/:id</li>
                <li>/admin/scripts/:scriptId/builder ← <span className="not-italic font-sans text-primary">canonical builder survivor</span></li>
                <li>/admin/scripter</li>
                <li>/admin/tree-editor</li>
                <li>/admin/tree-editor/:scriptId</li>
                <li>/admin/scriptflow</li>
                <li>/admin/script-routing</li>
                <li>tables: scripts, script_versions, script_node_links, script_sessions, script_templates, campaign_scripts</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Canonical disposition</h3>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="text-left p-2">Surface / table</th><th className="text-left p-2">Status</th><th className="text-left p-2">Notes</th></tr></thead>
                <tbody>
                  {[
                    { s: "guides + guide_versions", k: "Canonical (new)", n: "Workspace-owned. RLS via is_workspace_member / is_org_owner_or_admin." },
                    { s: "/app/workspaces/:id/guides{,/:id,/edit,/preview}", k: "Canonical", n: "Phase 4 routes." },
                    { s: "/admin/scripts/:scriptId/builder (ScriptBuilderPage)", k: "Canonical builder survivor", n: "Edit route deep-links here for guides sourced from legacy scripts." },
                    { s: "scripts table", k: "Compatibility writer", n: "Mirror trigger mirror_script_to_guide → guides; backfill ran in Phase 4 migration." },
                    { s: "/admin/scripts, /admin/scripts/:id", k: "Compatibility (routable, de-surfaced)", n: "Used by ScriptBuilderPage navigation." },
                    { s: "/admin/scripter", k: "Deferred", n: "Routable; merge target into canonical builder; vault later." },
                    { s: "/admin/tree-editor{,/:scriptId}", k: "Deferred", n: "Routable; vault after canonical builder is feature-complete." },
                    { s: "/admin/scriptflow", k: "Deferred", n: "Routable; merge target." },
                    { s: "/admin/script-routing", k: "Deferred", n: "Routable; campaign↔guide assignment now lives on canonical guide detail." },
                    { s: "script_node_links / script_sessions / script_templates", k: "Untouched", n: "Phase 5+ template unification will revisit." },
                  ].map((r) => (
                    <tr key={r.s} className="border-b border-border/40">
                      <td className="p-2 font-mono text-[11px] text-muted-foreground">{r.s}</td>
                      <td className="p-2">{r.k}</td>
                      <td className="p-2">{r.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="text-sm font-semibold text-foreground mt-6">Guide ↔ Campaign assignment</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Field: <span className="font-mono">guides.campaign_id</span> (nullable FK → campaigns).</li>
                <li>Cardinality: 0..1 campaign per guide; many guides per campaign.</li>
                <li>Surface: <span className="font-mono">/app/workspaces/:id/guides/:guideId</span> exposes a campaign select.</li>
                <li>Workspace scoping enforced by RLS on both <span className="font-mono">guides</span> and <span className="font-mono">campaigns</span>.</li>
                <li>Long-term: if richer assignment metadata (priority, conditions, A/B) is needed, promote to a <span className="font-mono">campaign_guides</span> join table; for Phase 4 the inline FK is sufficient.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Versioning foundation</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Status enum: <span className="font-mono">draft | published | archived</span>.</li>
                <li><span className="font-mono">guides.current_version</span> tracks the live version number.</li>
                <li><span className="font-mono">guide_versions</span> stores immutable content snapshots with <span className="font-mono">is_current</span> flag.</li>
                <li>Canonical publish path that writes <span className="font-mono">guide_versions</span> + flips <span className="font-mono">is_current</span> is a Phase 4 follow-up; legacy publish via ScriptBuilderPage continues for now and re-mirrors via the trigger.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Phase 5 prerequisites</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Native canonical guide create/edit (no script bridge) so Forms can attach to canonical guides directly.</li>
                <li>Stable <span className="font-mono">guide_versions</span> publish/rollback path so Forms can target a version.</li>
                <li>Decision on whether <span className="font-mono">script_templates</span> folds into the unified Templates phase or stays guide-local.</li>
              </ul>
            </Section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
