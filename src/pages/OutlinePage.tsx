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
    id: "p0", name: "Phase 0 — Freeze + vault prep", status: "in_progress",
    objectives: "Document current state. Identify duplicates. Mark vault candidates. No deletions.",
    exit: "Every soon-to-be-deleted artifact has a vault record; cleanup matrix exists; regression baseline captured.",
  },
  {
    id: "p1", name: "Phase 1 — Route + nav strip", status: "in_progress",
    objectives: "Collapse primary nav to canonical seven; de-surface duplicates; add safe redirects.",
    exit: "Org-level nav matches spec; no duplicate entry points in nav; all legacy URLs redirect or remain reachable.",
  },
  {
    id: "p2", name: "Phase 2 — Workspace + client foundations", status: "todo",
    objectives: "Introduce workspaces entity; mount /app/workspaces/:id shell; normalize client noun.",
    exit: "Real workspace table exists; workspace shell renders WORKSPACE_SECTIONS; clients live inside workspaces.",
  },
  {
    id: "p3", name: "Phase 3 — Canonical campaigns", status: "todo",
    objectives: "Collapse all campaign tables/surfaces into one model + one builder + one status machine.",
    exit: "Single campaigns entity; legacy campaign tables vaulted or aliased; campaign list/detail unified.",
  },
  {
    id: "p4", name: "Phase 4 — Guides", status: "todo",
    objectives: "Promote surviving script builder into the canonical Guide artifact. Vault duplicate builders.",
    exit: "One guide builder; tree-editor / scripter / scriptflow vaulted; guides assignable to campaigns.",
  },
  {
    id: "p5", name: "Phase 5 — Forms (new)", status: "todo",
    objectives: "Build canonical Form artifact: schema, conditions, validation, mapping targets, versioning.",
    exit: "Form library + builder live; forms assignable to campaigns/guides; submissions captured.",
  },
  {
    id: "p6", name: "Phase 6 — Templates unification", status: "todo",
    objectives: "Collapse 8 template-like tables into one templates model with kind enum + scope tabs.",
    exit: "One templates table; gallery shows all kinds; inheritance and forking work.",
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
  { entity: "Form", canonical: "Build (Phase 5)", notes: "Net-new canonical artifact." },
  { entity: "Template", canonical: "Unify (Phase 6)", notes: "8 template tables → one templates model." },
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
          <h1 className="text-3xl font-bold tracking-tight">Fabric59 — Canonical Build Doc</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Living implementation document for the Canonical Strip + Rebuild. Derived from the locked master spec.
            This page replaces all prior outline content. Public access is removed.
          </p>
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
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
