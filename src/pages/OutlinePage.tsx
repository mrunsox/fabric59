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
    id: "p5", name: "Phase 5 — Templates unification", status: "done",
    objectives:
      "Collapsed 7 legacy template tables into one canonical `templates` + `template_versions` model keyed by scope + kind, " +
      "with mirror triggers, backfill, parent_template_id lineage, and workspace gallery + fork routes.",
    exit:
      "templates + template_versions live; canonical workspace template routes live; fork-into-workspace functional; legacy template pages remain mirrored writers.",
  },
  {
    id: "p6", name: "Phase 6 — Native guide builder + publish/version", status: "done",
    objectives:
      "Make Guide fully canonical in authoring lifecycle. Native canonical guide editor at " +
      "/app/workspaces/:id/guides/:id/edit (no longer primarily a bridge to ScriptBuilderPage). " +
      "Real publish / rollback workflow over guide_versions with is_current flag and atomic transitions. " +
      "Create-from-template flow that consumes canonical templates(kind=guide) and preserves lineage. " +
      "Legacy script-source guides keep ScriptBuilderPage as compatibility-only deep link.",
    exit:
      "Native guide create + edit live; publish + rollback over guide_versions live; create-from-template live; " +
      "legacy ScriptBuilderPage demoted to compatibility-only for guides whose source_type='script'.",
  },
  {
    id: "p7", name: "Phase 7 — Integrations canonical layer", status: "done",
    objectives:
      "Canonical, workspace-owned integration substrate. New `integration_providers` registry + " +
      "`integration_connections` (workspace+provider scoped, status, config, credentials_ref) + " +
      "`integration_mappings` (provider-keyed identity xrefs replacing fragmented clio_mappings/mycase_mappings). " +
      "Mirror triggers + backfill keep legacy provider-mapping writes flowing into the canonical table. " +
      "Workspace UI at /app/workspaces/:id/integrations replaces the legacy connectors catalog as the primary surface.",
    exit:
      "integration_providers + integration_connections + integration_mappings live; mirror triggers + backfill from " +
      "clio_mappings/mycase_mappings live; canonical workspace integrations list+detail live; legacy ConnectorsCatalogPage " +
      "demoted to /integrations-legacy compatibility surface; stub provider edge functions queued for deletion.",
  },
  {
    id: "p8", name: "Phase 8 — Analytics, QA, billing, launch polish", status: "done",
    objectives:
      "Make the canonical workspace product operationally launch-ready. Canonical workspace analytics, QA/review, " +
      "and billing surfaces under /app/workspaces/:id/{analytics,qa,billing}. Shared polish primitives (KpiCard, " +
      "EmptyState, status badges) standardized across workspace pages. Legacy admin analytics/QA pages preserved as " +
      "/analytics-legacy and /qa-legacy compatibility surfaces. AI knowledge layer is explicitly deferred to Phase 10.",
    exit:
      "Canonical analytics + QA + billing pages live; shared empty-state/KPI primitives in use; legacy analytics/QA " +
      "remain reachable as compatibility-only; honest billing shell exposes real invoice + usage data without faking " +
      "subscription primitives; launch polish checklist green.",
  },
  {
    id: "p9", name: "Phase 9 — Marketing site + onboarding + workspace bootstrap", status: "in_progress",
    objectives:
      "Rebuild the public-facing entry and first-run path so Fabric59 moves from internally coherent product to " +
      "market-ready product. Canonical marketing IA (personas, solutions, pricing, integrations, customers), " +
      "onboarding that bootstraps a canonical workspace, invite-accept landing, and role-aware first-run routing.",
    exit:
      "Marketing surface and onboarding boot a new user into a working canonical workspace end-to-end; no new user " +
      "lands in legacy /admin/* sprawl as the primary path; AI knowledge remains explicitly deferred to Phase 10.",
  },
  {
    id: "p10", name: "Phase 10 — AI knowledge layer + agent assist + GA polish", status: "todo",
    objectives:
      "Workspace-scoped AI: grounded chat, doc/URL ingestion, embeddings, editable prompts in UI, summaries, " +
      "post-call automations. Explicitly deferred from Phase 8.",
    exit: "AI features versioned, scoped, audited; market-ready checklist green.",
  },
];

/**
 * Phase 8 — Analytics, QA, billing, and launch polish decisions
 *
 * Gaps this phase closes:
 *  - No canonical workspace analytics surface (was buried in /admin/reports).
 *  - QA/review surfaces lived in /admin/qa, not unified around workspace outcomes.
 *  - Billing UI was partial / org-only; no honest workspace shell.
 *  - Inconsistent empty states, status badges, and KPI cards across workspace pages.
 *  - Desktop-first builder/admin UX debt; weak current-context cues in nav.
 *
 * Plan executed:
 *  - IA: workspace owns three new canonical routes — analytics, qa, billing —
 *    each rendered under WorkspaceShell with the workspace breadcrumb.
 *  - Analytics model: KPI overview (calls, outcomes, QA, campaigns, guides),
 *    7-day rollups, top-10 dispositions over 30d, drill-down cards into QA,
 *    campaigns, and guides.
 *  - QA model: pending/completed/all tabs over canonical qa_reviews; status
 *    transitions (pending → in_review → completed) inline; KPIs (pending,
 *    completed, avg score). Detailed scoring rubrics deferred to Phase 9.
 *  - Billing scope: honest shell — real invoices listing + usage snapshot
 *    derived from canonical KPIs. Plan management, payment methods, and
 *    self-serve checkout deferred until billing backend lands.
 *  - Polish primitives: shared <KpiCard /> and <EmptyState /> primitives in
 *    src/components/common/ standardize KPI tiles and empty states across
 *    workspace pages; status badge pattern reused across QA and integrations.
 *  - Compatibility: legacy /admin/reports and /admin/qa pages still mounted;
 *    workspace versions are now authoritative. Legacy variants reachable at
 *    /app/workspaces/:id/analytics-legacy and /qa-legacy.
 *
 * Out of scope this phase (deferred):
 *  - Strict workspace_id columns on call_sessions / qa_reviews / invoices
 *    (analytics still reads at organization_id today; tracked as P8 follow-up).
 *  - Subscription / plan / payment-method UI (needs billing backend).
 *  - Detailed QA scoring rubrics, calibration, reviewer assignment (Phase 9).
 *  - AI knowledge layer (workspace-scoped chat, ingestion, embeddings,
 *    editable prompts) — explicitly Phase 10.
 *  - Marketing site rebuild, onboarding flow, workspace bootstrap (Phase 9).
 */

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
  { id: "p4-write-canonical", label: "Phase 4 follow-up — native canonical guide create + edit (no script bridge)", status: "done" },
  { id: "p4-vault-legacy", label: "Phase 4 follow-up — vault TreeEditor / Scripter / ScriptFlowHub / ScriptRouting once canonical builder is feature-complete", status: "todo" },
  { id: "p4-version-publish", label: "Phase 4 follow-up — canonical publish path writes guide_versions (current-version flag, rollback)", status: "done" },
  { id: "p5-templates-table", label: "Phase 5 — canonical templates + template_versions tables (scope+kind enums, parent lineage, RLS)", status: "done" },
  { id: "p5-mirror-triggers", label: "Phase 5 — mirror triggers from 7 legacy template tables + backfill", status: "done" },
  { id: "p5-routes", label: "Phase 5 — /app/workspaces/:id/templates list+detail live with kind+scope filters", status: "done" },
  { id: "p5-fork", label: "Phase 5 — fork-into-workspace flow with parent_template_id lineage", status: "done" },
  { id: "p5-consume-campaigns", label: "Phase 5 follow-up — campaigns can be created from canonical campaign templates", status: "todo" },
  { id: "p5-consume-guides", label: "Phase 5 follow-up — guides can be created from canonical guide templates", status: "done" },
  { id: "p5-write-canonical", label: "Phase 5 follow-up — canonical native template create + edit (no legacy bridge)", status: "todo" },
  { id: "p5-vault-legacy", label: "Phase 5 follow-up — vault legacy template editors once canonical UI is feature-complete", status: "todo" },
  { id: "p6-native-builder", label: "Phase 6 — native canonical guide editor at /app/workspaces/:id/guides/:id/edit (writes guides + guide_versions directly)", status: "done" },
  { id: "p6-new-page", label: "Phase 6 — /app/workspaces/:id/guides/new with blank + from-template paths", status: "done" },
  { id: "p6-publish-rollback", label: "Phase 6 — publish + rollback over guide_versions with is_current flip + status transition", status: "done" },
  { id: "p6-from-template", label: "Phase 6 — create-guide-from-template flow consumes canonical templates(kind=guide) and stores lineage", status: "done" },
  { id: "p6-bridge-demoted", label: "Phase 6 — ScriptBuilderPage demoted to compatibility-only deep link for source_type='script' guides", status: "done" },
  { id: "p6-visual-editor", label: "Phase 6 follow-up — visual node editor for native guide content (currently raw JSON surface)", status: "todo" },
  { id: "p6-vault-legacy", label: "Phase 6 follow-up — vault Scripter / TreeEditor / ScriptFlowHub / ScriptRouting once visual editor lands", status: "todo" },
  { id: "p7-providers", label: "Phase 7 — integration_providers registry seeded (clio, mycase, five9, slack, zapier, make)", status: "done" },
  { id: "p7-connections", label: "Phase 7 — integration_connections table (workspace-owned, RLS, status enum, config JSONB)", status: "done" },
  { id: "p7-mappings", label: "Phase 7 — canonical integration_mappings (provider-keyed identity xrefs in JSONB)", status: "done" },
  { id: "p7-mirror", label: "Phase 7 — mirror triggers + backfill from clio_mappings + mycase_mappings → integration_mappings", status: "done" },
  { id: "p7-routes", label: "Phase 7 — /app/workspaces/:id/integrations list+detail live; legacy connectors catalog moved to /integrations-legacy", status: "done" },
  { id: "p7-credentials", label: "Phase 7 follow-up — provider OAuth/API key wiring via credentials_ref to vault secrets", status: "todo" },
  { id: "p7-sync-jobs", label: "Phase 7 follow-up — surface sync_jobs/logs/retry under canonical connection detail", status: "todo" },
  { id: "p7-stub-deletion", label: "Phase 7 follow-up — delete ~50 stub integration edge functions (Salesforce/HubSpot/Zendesk/etc.)", status: "todo" },
  { id: "p8-analytics", label: "Phase 8 — canonical /app/workspaces/:id/analytics with KPI overview + dispositions + drill-downs", status: "done" },
  { id: "p8-qa", label: "Phase 8 — canonical /app/workspaces/:id/qa review queue (pending/in_review/completed transitions)", status: "done" },
  { id: "p8-billing", label: "Phase 8 — honest /app/workspaces/:id/billing shell (real invoices + usage snapshot)", status: "done" },
  { id: "p8-primitives", label: "Phase 8 — shared KpiCard + EmptyState primitives in src/components/common/", status: "done" },
  { id: "p8-compat", label: "Phase 8 — legacy analytics/QA preserved at /analytics-legacy and /qa-legacy under workspace shell", status: "done" },
  { id: "p8-workspace-fk", label: "Phase 8 follow-up — strict workspace_id columns on call_sessions/qa_reviews/invoices", status: "todo" },
  { id: "p8-billing-backend", label: "Phase 8 follow-up — billing backend: subscription/plan/payment-method primitives", status: "todo" },
  { id: "p8-qa-rubrics", label: "Phase 8 follow-up — detailed QA scoring rubrics, calibration, reviewer assignment", status: "todo" },
  { id: "p8-mobile", label: "Phase 8 follow-up — responsive/mobile pass on heavy workspace flows (builders, tables)", status: "todo" },
  { id: "p9-marketing-ia", label: "Phase 9 — canonical public marketing IA: /personas, /solutions, /pricing, /integrations, /customers", status: "done" },
  { id: "p9-marketing-layout", label: "Phase 9 — shared MarketingLayout (mega header + footer + SEO) used by every new public page", status: "done" },
  { id: "p9-bootstrap", label: "Phase 9 — workspace bootstrap at /onboarding/workspace (creates or selects canonical workspace)", status: "done" },
  { id: "p9-onboarding-route", label: "Phase 9 — onboarding completion routes into /onboarding/workspace, never directly into /admin/*", status: "done" },
  { id: "p9-invite-landing", label: "Phase 9 — /accept-invite landing forwards authenticated users into workspace bootstrap", status: "done" },
  { id: "p9-protected-onboarding", label: "Phase 9 — ProtectedRoute allows /onboarding/* through for users without an org", status: "done" },
  { id: "p9-role-routing", label: "Phase 9 — role-aware first-run: master-admin → /superadmin, member → /admin/dashboard, default → /onboarding/workspace → /app/workspaces/:id/home", status: "done" },
  { id: "p9-billing-backend", label: "Phase 9 follow-up — real billing backend (subscription/plan/payment-method) — DEFERRED", status: "todo" },
  { id: "p9-tokenized-invites", label: "Phase 9 follow-up — tokenized self-serve invite link backend (today: admin invites in-app)", status: "todo" },
  { id: "p9-customer-stories", label: "Phase 9 follow-up — real published customer stories once design partners go GA", status: "todo" },
  { id: "p10-deferred", label: "AI knowledge layer (grounded chat, ingestion, embeddings, editable prompts) — DEFERRED to Phase 10", status: "blocked" },
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

            <Section id="phase-5-decisions" title="13. Phase 5 — Template system decisions">
              <h3 className="text-sm font-semibold text-foreground">Current template fragmentation</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs font-mono">
                <li>script_templates</li>
                <li>flow_templates</li>
                <li>email_templates</li>
                <li>report_templates</li>
                <li>call_summary_templates</li>
                <li>legal_connect_prompt_templates</li>
                <li>campaign_blueprints</li>
                <li>admin/templates + admin/templates/:id (generic shell over flow_templates)</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Canonical model chosen</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><span className="font-mono">templates</span> + <span className="font-mono">template_versions</span> tables.</li>
                <li>Scope enum: <span className="font-mono">platform | org | partner | client | workspace</span>.</li>
                <li>Kind enum: <span className="font-mono">guide | flow | campaign | email | summary | prompt | report</span>.</li>
                <li>Status enum: <span className="font-mono">draft | published | archived</span>.</li>
                <li>Inheritance: lower scopes can read higher-scope templates; UI shows <span className="font-mono">scope_type</span> badge and lineage.</li>
                <li>Forking: <span className="font-mono">parent_template_id</span> records lineage; forks land workspace-scoped under the current org.</li>
                <li>Versioning: <span className="font-mono">templates.current_version</span> + immutable snapshots in <span className="font-mono">template_versions</span> (publish/rollback path is a Phase 5 follow-up).</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Legacy disposition</h3>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="text-left p-2">Surface / table</th><th className="text-left p-2">Status</th><th className="text-left p-2">Notes</th></tr></thead>
                <tbody>
                  {[
                    { s: "templates + template_versions", k: "Canonical (new)", n: "Workspace-readable; org-admin manageable; master-admin platform writes." },
                    { s: "/app/workspaces/:id/templates{,/:id}", k: "Canonical", n: "Phase 5 routes — gallery + detail + fork." },
                    { s: "script_templates", k: "Mirrored (compat writer)", n: "trg_mirror_script_template → templates(kind=guide). Legacy SaveAsTemplateDialog/TemplateGallery still authoritative." },
                    { s: "flow_templates", k: "Mirrored (compat writer)", n: "trg_mirror_flow_template → templates(kind=flow). /admin/templates editor still authoritative." },
                    { s: "email_templates", k: "Mirrored (compat writer)", n: "trg_mirror_email_template → templates(kind=email). /admin/email-templates still authoritative." },
                    { s: "report_templates", k: "Mirrored (compat writer)", n: "trg_mirror_report_template → templates(kind=report)." },
                    { s: "call_summary_templates", k: "Mirrored (compat writer)", n: "trg_mirror_call_summary_template → templates(kind=summary). Scope picked from tenant_id/partner_id/org_id." },
                    { s: "legal_connect_prompt_templates", k: "Mirrored (compat writer)", n: "trg_mirror_lc_prompt_template → templates(kind=prompt). Full row stored as content via to_jsonb." },
                    { s: "campaign_blueprints", k: "Mirrored (compat writer)", n: "trg_mirror_campaign_blueprint → templates(kind=campaign). Replicate/reverse-engineer flows continue against blueprints for now." },
                    { s: "Native canonical template editor", k: "Deferred", n: "Detail page is read-only this phase; edit/create-from-scratch lands in Phase 5 follow-up." },
                  ].map((r) => (
                    <tr key={r.s} className="border-b border-border/40">
                      <td className="p-2 font-mono text-[11px] text-muted-foreground">{r.s}</td>
                      <td className="p-2">{r.k}</td>
                      <td className="p-2">{r.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="text-sm font-semibold text-foreground mt-6">Downstream consumption (this phase)</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Campaigns, guides, flows, emails, summaries, prompts, reports are all represented in the canonical model via mirroring.</li>
                <li>Native "create campaign from template" + "create guide from template" flows are wired in Phase 5 follow-ups; legacy create paths remain in place.</li>
                <li>Forking already produces a real canonical, workspace-owned, native (non-mirrored) row that downstream entities can target.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Phase 6 prerequisites</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Decide canonical Form storage shape (likely as a new entity, not a template kind).</li>
                <li>Native canonical template create + edit so Forms can both consume templates and be templated themselves.</li>
                <li>Stable template versioning + rollback before Forms attach to a specific version.</li>
              </ul>
            </Section>

            <Section id="phase-6-decisions" title="14. Phase 6 — Native guide builder and publish/version decisions">
              <h3 className="text-sm font-semibold text-foreground">Authoring debt cleared</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Edit route <span className="font-mono">/app/workspaces/:id/guides/:id/edit</span> is now the real owner for canonical native guides — no longer primarily a bridge.</li>
                <li>ScriptBuilderPage remains a compatibility-only deep link, used solely for guides whose <span className="font-mono">source_type='script'</span>.</li>
                <li><span className="font-mono">guide_versions</span> is now operational: every save produces a new version row; publish flips <span className="font-mono">is_current</span> and updates <span className="font-mono">guides.current_version</span> + <span className="font-mono">status</span>.</li>
                <li>Rollback republishes a prior version atomically without discarding newer drafts.</li>
                <li>Create-from-template consumes canonical <span className="font-mono">templates(kind=guide)</span> and stores <span className="font-mono">metadata.from_template_id</span> for lineage.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Lifecycle model</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Status enum unchanged: <span className="font-mono">draft | published | archived</span>.</li>
                <li>Save draft: insert new <span className="font-mono">guide_versions</span> row with <span className="font-mono">is_current=false</span>, version = max+1.</li>
                <li>Publish: clear all <span className="font-mono">is_current</span> for the guide, set on target version, update <span className="font-mono">guides.status='published'</span> + <span className="font-mono">current_version</span>.</li>
                <li>Rollback: same as publish but targets a prior version; newer drafts are preserved.</li>
                <li>Native content surface today: raw JSON in <span className="font-mono">guide_versions.content</span>. Visual node editor is a documented Phase 6 follow-up.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Surface disposition after Phase 6</h3>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="text-left p-2">Surface</th><th className="text-left p-2">Status</th><th className="text-left p-2">Notes</th></tr></thead>
                <tbody>
                  {[
                    { s: "/app/workspaces/:id/guides/new", k: "Canonical (new)", n: "Blank or seed-from-template flow." },
                    { s: "/app/workspaces/:id/guides/:id/edit", k: "Canonical (native)", n: "Real authoring surface; deep-links to ScriptBuilderPage only when source_type='script'." },
                    { s: "/app/workspaces/:id/guides/:id (detail)", k: "Canonical", n: "Now exposes version history with publish + rollback actions." },
                    { s: "/admin/scripts/:id/builder (ScriptBuilderPage)", k: "Compatibility-only", n: "Authoritative writer for legacy script-source guides. Re-mirrors via trigger." },
                    { s: "/admin/scripter, /admin/tree-editor, /admin/scriptflow, /admin/script-routing", k: "Deferred / vault candidate", n: "Routable but not part of canonical lifecycle. Vault target after visual editor lands." },
                    { s: "guides + guide_versions", k: "Canonical authoring path", n: "Now both read AND write surface for native canonical guides." },
                  ].map((r) => (
                    <tr key={r.s} className="border-b border-border/40">
                      <td className="p-2 font-mono text-[11px] text-muted-foreground">{r.s}</td>
                      <td className="p-2">{r.k}</td>
                      <td className="p-2">{r.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="text-sm font-semibold text-foreground mt-6">Phase 7 prerequisites</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Visual node editor over <span className="font-mono">guide_versions.content</span> so legacy ScriptBuilderPage can be vaulted.</li>
                <li>Decide whether canonical templates need a native edit surface before mappings/provider normalization begins.</li>
                <li>Mappings + provider normalization (Clio / MyCase) is the next product-critical move once authoring is canonical end-to-end.</li>
              </ul>
            </Section>

            <Section id="phase-9-decisions" title="15. Phase 9 — Marketing, onboarding, and workspace bootstrap decisions">
              <h3 className="text-sm font-semibold text-foreground">Gaps this phase closes</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Marketing site was off-message / generic SaaS — no canonical positioning around workspace + Five9 + legal CRM.</li>
                <li>Missing persona pages, solution pages, pricing page, integrations index, and customer proof pages.</li>
                <li>Onboarding stopped at "go to /admin" and dropped users into legacy admin sprawl.</li>
                <li>No invite-accept landing target — tokenized invite links would land on a 404.</li>
                <li>Signup/first-run flow was not aligned to the canonical workspace model.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Public route map (canonical)</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs font-mono">
                <li>/ — landing (already canonical, kept)</li>
                <li>/personas — persona index (new)</li>
                <li>/solutions — solution index (new)</li>
                <li>/pricing — Pilot / Operator / Platform tiers (new)</li>
                <li>/integrations — provider index w/ status badges (new)</li>
                <li>/customers — design-partner stories (new)</li>
                <li>/product, /demo, /faq, /contact — kept</li>
                <li>/trust, /security, /privacy, /terms, /responsible-disclosure — kept (compatibility intact)</li>
                <li>/login, /signup, /forgot-password, /reset-password, /system-access — auth (kept)</li>
                <li>/accept-invite — new invite landing target</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Onboarding + bootstrap IA</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><span className="font-mono">/onboarding</span> — existing wizard (org → ownership → domain → intent → tenant → complete). Skip and Complete now both route into the canonical bootstrap step instead of <span className="font-mono">/admin</span>.</li>
                <li><span className="font-mono">/onboarding/workspace</span> — new canonical bootstrap. Detects the auto-created default workspace from the Phase 2B trigger and lets the user enter it; if missing, creates a workspace against their org and lands them in <span className="font-mono">/app/workspaces/:id/home</span>.</li>
                <li><span className="font-mono">ProtectedRoute</span> now allows any <span className="font-mono">/onboarding/*</span> path through for users without an organization (was strict-equal <span className="font-mono">/onboarding</span>).</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Role-aware first-run routing</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Master admin without an org → <span className="font-mono">/superadmin</span> (existing redirect, preserved).</li>
                <li>Limited member landing on <span className="font-mono">/admin</span> → <span className="font-mono">/admin/dashboard</span> (existing ProtectedRoute behavior, preserved).</li>
                <li>Authenticated user accepting an invite → <span className="font-mono">/onboarding/workspace</span> → workspace home.</li>
                <li>Unauthenticated user on <span className="font-mono">/accept-invite</span> → <span className="font-mono">/signup?invite=…</span> (token preserved through signup).</li>
                <li>Default post-onboarding landing → <span className="font-mono">/app/workspaces/:id/home</span> (canonical workspace shell), never <span className="font-mono">/admin/*</span>.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Workspace bootstrap defaults</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Default workspace name: <span className="font-mono">{`{Org name} workspace`}</span>.</li>
                <li><span className="font-mono">is_default = true</span> when this is the first workspace under the org.</li>
                <li>Surfaces unlocked on entry: clients, campaigns, guides, templates, integrations, analytics, qa, billing, settings.</li>
                <li>No fake demo data is seeded. The bootstrap page advertises what the user gets, not invented placeholder content.</li>
                <li>The Phase 2B auto-create trigger remains the primary path; this page is the secondary safety net + UX surface.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Compatibility disposition</h3>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="text-left p-2">Surface</th><th className="text-left p-2">Status</th><th className="text-left p-2">Notes</th></tr></thead>
                <tbody>
                  {[
                    { s: "/personas, /solutions, /pricing, /integrations, /customers", k: "Canonical (new)", n: "Built on shared MarketingLayout (MegaMenuHeader + MegaFooter + SEOHead)." },
                    { s: "/", k: "Canonical", n: "LandingPage already aligned to canonical product story; unchanged this phase." },
                    { s: "/product, /demo, /faq, /contact", k: "Compatibility (kept)", n: "Reachable; not part of new IA but linked from header/footer." },
                    { s: "/trust, /security, /privacy, /terms, /responsible-disclosure", k: "Authoritative", n: "Legal/trust pages preserved verbatim." },
                    { s: "/onboarding", k: "Authoritative (rewired)", n: "Skip and Complete now route into /onboarding/workspace; no direct /admin landings." },
                    { s: "/onboarding/workspace", k: "Canonical (new)", n: "Workspace bootstrap step. Reads canonical workspaces table; inserts when none exist." },
                    { s: "/accept-invite", k: "Canonical (new)", n: "Invite-landing target; preserves invite token through signup/login." },
                    { s: "/admin/*", k: "Compatibility (de-surfaced from primary path)", n: "Still routable for org-level workflows that have not yet rebound to the workspace shell. Not the default first-run destination." },
                  ].map((r) => (
                    <tr key={r.s} className="border-b border-border/40">
                      <td className="p-2 font-mono text-[11px] text-muted-foreground">{r.s}</td>
                      <td className="p-2">{r.k}</td>
                      <td className="p-2">{r.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="text-sm font-semibold text-foreground mt-6">Explicit deferrals</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>AI knowledge layer (grounded chat, ingestion, embeddings, editable prompts) — Phase 10.</li>
                <li>Real billing backend (subscriptions, plans, payment methods, self-serve checkout). Pricing page promises quote/invoice flow.</li>
                <li>Tokenized self-serve invite link backend. Today invites go through the in-app InviteMemberDialog; <span className="font-mono">/accept-invite</span> is the landing target ready for the future wiring.</li>
                <li>Strict <span className="font-mono">workspace_id</span> columns on call_sessions / qa_reviews / invoices (Phase 8 follow-up, not blocking Phase 9).</li>
                <li>Vaulting of legacy script/template editors and stub integration edge functions — tracked in Phases 4/5/7 follow-ups.</li>
                <li>Real published customer logos / stories — held until design partners go GA.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Phase 10 prerequisites</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Stable canonical workspace landing for every new user (this phase).</li>
                <li>Workspace-scoped RBAC clear enough to scope AI prompts and ingestion.</li>
                <li>Canonical templates(kind=prompt) already in place from Phase 5 — AI prompts can ride that surface.</li>
              </ul>
            </Section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
