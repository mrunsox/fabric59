import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Circle, Clock, ShieldAlert } from "lucide-react";
import { GLOBAL_SECTIONS } from "@/config/navigation";
import { WORKSPACE_NAV } from "@/config/canonicalNav";
import {
  SURFACE_INVENTORY, LINGERING_ITEMS, COPY_INCONSISTENCIES,
  CTA_ALIGNMENT, REDIRECT_TABLE, SLICE_SEQUENCE, summarizeAudit,
} from "@/data/surfaceAudit";

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
    id: "p9", name: "Phase 9 — Marketing site + onboarding + workspace bootstrap", status: "done",
    objectives:
      "Rebuild the public-facing entry and first-run path so Fabric59 moves from internally coherent product to " +
      "market-ready product. Canonical marketing IA (personas, solutions, pricing, integrations, customers), " +
      "onboarding that bootstraps a canonical workspace, invite-accept landing, and role-aware first-run routing.",
    exit:
      "Marketing surface and onboarding boot a new user into a working canonical workspace end-to-end; no new user " +
      "lands in legacy /admin/* sprawl as the primary path; AI knowledge remains explicitly deferred to Phase 10.",
  },
  {
    id: "p10", name: "Phase 10 — AI knowledge layer + workspace intelligence", status: "done",
    objectives:
      "Three-layer canonical AI: (1) live assist in builders/agents, (2) workspace-scoped knowledge + grounded chat, " +
      "(3) post-call intelligence. Workspace knowledge page, workspace assistant page, prompt + behavior configuration " +
      "for admins, and guardrails (scope, logging, explainability, no silent writes).",
    exit:
      "Workspace knowledge + assistant routes live and reachable from workspace nav; grounded chat scoped to workspace " +
      "with KB + guides + templates + call summaries; admin-controlled AI configuration (tone, industry, jurisdiction, " +
      "knowledge-only); audit log of AI interactions; all writes user-initiated.",
  },
  {
    id: "p11", name: "Phase 11 — Canonical convergence, legacy strip, and route cleanup", status: "done",
    objectives:
      "Reconcile the running app with canonical scope. Collapse legacy admin/dashboards into the workspace-first model, " +
      "consolidate duplicate routes, converge marketing chrome, and standardize tables, empty states, and status badges " +
      "behind shared primitives. Convergence and deletion only — no new product areas.",
    exit:
      "One canonical org overview and one canonical workspace home (no orphan dashboards); duplicate campaign/builder " +
      "routes merged or redirected; integrations/connectors single catalog + instance; marketing IA singular; shared " +
      "DataTable/EmptyState/StatusBadge primitives in use; legacy routes either redirected within grace window or removed.",
  },
  {
    id: "p12", name: "Phase 12 — Canonical convergence v2: terminology + data honesty", status: "done",
    objectives:
      "Second canonical pass focused on (1) user-facing terminology drift (Tenant → Client in non-architectural labels: " +
      "table headers, select placeholders, filters, dialog labels, hint copy, marketing outcomes), and (2) data honesty " +
      "on preview surfaces. Backend tables, RLS, and architectural descriptions retain 'tenant' terminology — DB stays " +
      "tenant*. No new product areas, no auth/RLS rewrites, no fake data added.",
    exit:
      "No user-facing 'Tenant' labels remain in operational pages (ApiLogs, Notifications, Mappings, Settings, DataPlane, " +
      "DesignSystem, IdentityResolution, marketing personas/outcomes). Preview surfaces with illustrative data " +
      "(/admin/abandon-rate, /admin/ani-blocklist, /admin/callback-queue) carry an explicit warning banner stating actions " +
      "don't persist. Stale /admin/tenants navigate() call inside CallFlowBuilder retargeted to canonical /admin/clients.",
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
  { id: "g1-forms-builder", label: "G1 — first-class Form builder: field types + conditional visibility + required + versioning + preview + submission payload mapping", status: "done" },
  { id: "g1-forms-versions", label: "G1 — form_versions table (snapshot per publish, current pointer)", status: "done" },
  { id: "g1-forms-submissions", label: "G1 — form_submissions table (workspace-scoped, raw + mapped payload, source, version)", status: "done" },
  { id: "g1-forms-campaign", label: "G1 — form-to-campaign assignment via form_campaign_assignments (workspace-scoped)", status: "done" },
  { id: "p7-providers", label: "Phase 7 — integration_providers registry seeded (clio, mycase, five9, slack, zapier, make)", status: "done" },
  { id: "p7-connections", label: "Phase 7 — integration_connections table (workspace-owned, RLS, status enum, config JSONB)", status: "done" },
  { id: "p7-mappings", label: "Phase 7 — canonical integration_mappings (provider-keyed identity xrefs in JSONB)", status: "done" },
  { id: "p7-mirror", label: "Phase 7 — mirror triggers + backfill from clio_mappings + mycase_mappings → integration_mappings", status: "done" },
  { id: "p7-routes", label: "Phase 7 — /app/workspaces/:id/integrations list+detail live; legacy connectors catalog moved to /integrations-legacy", status: "done" },
  { id: "p7-credentials", label: "Phase 7 follow-up — provider OAuth/API key wiring via credentials_ref to vault secrets", status: "todo" },
  { id: "p7-sync-jobs", label: "Phase 7 follow-up — surface sync_jobs/logs/retry under canonical connection detail", status: "todo" },
  { id: "p7-stub-deletion", label: "Phase 7 follow-up — deleted stub integration edge functions (crm-push, teams-notify, twilio-sms, stripe-payments, openai) and dead admin IntegrationsPage + integrations-catalog + IntegrationCard/Detail/Wizard/ClientSelectDialog/ConnectionTestButton", status: "done" },
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
  { id: "p9-role-routing", label: "Phase 9 — role-aware first-run: master-admin → /superadmin, member → /admin (canonical), default → /onboarding/workspace → /app/workspaces/:id/home", status: "done" },
  { id: "p9-billing-backend", label: "Phase 9 follow-up — real billing backend (subscription/plan/payment-method) — DEFERRED", status: "todo" },
  { id: "p9-tokenized-invites", label: "Phase 9 follow-up — tokenized self-serve invite link backend (today: admin invites in-app)", status: "todo" },
  { id: "p9-customer-stories", label: "Phase 9 follow-up — real published customer stories once design partners go GA", status: "todo" },
  { id: "p10-knowledge-route", label: "Phase 10 — /app/workspaces/:id/knowledge live (Overview / Sources / AI Configuration)", status: "done" },
  { id: "p10-assistant-route", label: "Phase 10 — /app/workspaces/:id/assistant live (workspace-scoped grounded chat with grounding indicator)", status: "done" },
  { id: "p10-ai-config", label: "Phase 10 — workspace_ai_configs (tone, industry, jurisdiction, knowledge_only) editable by org admins, RLS-scoped", status: "done" },
  { id: "p10-knowledge-sources", label: "Phase 10 — workspace_knowledge_sources registry seeded per workspace (kb/guides/templates/call_summaries/outcomes/uploads/urls)", status: "done" },
  { id: "p10-assistant-fn", label: "Phase 10 — workspace-assistant edge function: grounded responses via Lovable AI Gateway, returns grounding metadata", status: "done" },
  { id: "p10-conversations", label: "Phase 10 — workspace_ai_conversations + workspace_ai_messages persisted per workspace, RLS-scoped", status: "done" },
  { id: "p10-audit", label: "Phase 10 — workspace_ai_logs audit trail for every AI interaction (org-admin readable)", status: "done" },
  { id: "p10-nav", label: "Phase 10 — Knowledge + Assistant added to canonical workspace secondary nav", status: "done" },
  { id: "p10-builder-assist", label: "Phase 10 follow-up — guide builder AI assist wired to shared knowledge model (currently uses generate-script edge fn)", status: "in_progress" },
  { id: "p10-postcall", label: "Phase 10 follow-up — post-call intelligence (suggested QA notes, summaries, follow-ups) tied to workspace assistant", status: "todo" },
  { id: "p10-uploads", label: "Phase 10 follow-up — uploaded docs + URL ingestion sources (currently disabled by default)", status: "todo" },
  { id: "p10-embeddings", label: "Phase 10 follow-up — vector embeddings + retrieval (current grounding is bounded keyword/recent fetch)", status: "todo" },
  { id: "p11-overview-collapse", label: "Phase 11 — single canonical org overview at /admin index; /admin/dashboard redirects in", status: "done" },
  { id: "p11-dashboard-redirect", label: "Phase 11 — friendly /dashboard alias points directly at canonical /admin overview", status: "done" },
  { id: "p11-status-badge", label: "Phase 11 — shared StatusBadge primitive in src/components/common/ (canonical tones success/warning/danger/info/neutral)", status: "done" },
  { id: "p11-status-badge-rollout", label: "Phase 11 — adopt shared StatusBadge across workspace campaigns, guides, QA, integrations, billing, clients (Phase F)", status: "done" },
  { id: "p11-data-table-rollout", label: "Phase 11 — DataTable adopted on workspace campaigns table; remaining card-based grids kept by design (low-risk surfaces)", status: "done" },
  { id: "p11-empty-state-rollout", label: "Phase 11 — adopt shared EmptyState across workspace campaigns, guides, integrations, billing, QA, analytics, clients (Phase F)", status: "done" },
  { id: "p11-campaign-collapse", label: "Phase 11 follow-up — fold /admin/campaigns/{overview,drafts,readiness,event-log,archived} + /admin/campaign-blueprints into canonical campaigns list+detail (tabs/filters), then redirect", status: "done" },
  { id: "p11-builder-vault", label: "Phase 11 follow-up — legacy ScripterPage / ScriptFlowHubPage / TreeEditorPage / CallFlowBuilderPage source files retired (Phase 1 Fabric59 reposition); routes still redirect", status: "done" },
  { id: "pc-canonical-four", label: "QA Phase C — canonical builder set locked to four families: Guide (/admin/scripts/:scriptId/builder + /app/workspaces/:workspaceId/guides/:guideId/edit), Campaign (/admin/campaigns/new), Mapping (/admin/mappings/builder), Flow (/admin/flows/:id)", status: "done" },
  { id: "pc-redirects", label: "QA Phase C — legacy builder bases redirect: /admin/scripter→/admin/scripts, /admin/scriptflow→/admin/scripts, /admin/tree-editor→/admin/scripts, /admin/call-flow→/admin/flows", status: "done" },
  { id: "pc-compat", label: "QA Phase C — compatibility-only (reachable, de-surfaced from primary nav/CTAs): /admin/script-routing, /admin/tree-editor/:scriptId; primary CTAs scrubbed (ScriptBuilderPage Back→/admin/scripts, ScriptEditorPage Preview→/admin/scripts/:id/builder)", status: "done" },
  { id: "p11-marketing-converge", label: "Phase 11 follow-up — audit /product, /demo, /faq, /contact for legacy story; redirect or refactor into canonical IA", status: "todo" },
  { id: "p11-breadcrumbs", label: "Phase 11 follow-up — breadcrumb pattern Org > Workspace > Campaign > Guide on nested pages", status: "todo" },
  { id: "pa-overview-href", label: "QA Phase A — primary nav 'Overview' href points at canonical /admin (was /admin/dashboard)", status: "done" },
  { id: "pa-shell-logo", label: "QA Phase A — AdminShell + WorkspaceShell logo/breadcrumb/back-button targets collapsed onto /admin", status: "done" },
  { id: "pa-protectedroute-loop", label: "QA Phase A — removed ProtectedRoute member→/admin/dashboard hop (was a redirect loop after Phase 11 collapse)", status: "done" },
  { id: "pa-redirects-verified", label: "QA Phase A — /dashboard, /admin/dashboard both redirect to /admin; /admin/agent-dashboard reachable but de-surfaced", status: "done" },
  { id: "pa-workspace-home", label: "QA Phase A — /app/workspaces/:workspaceId/home confirmed as canonical workspace cockpit (index also resolves to it)", status: "done" },
  { id: "pb-canonical-list", label: "QA Phase B — /admin/campaigns is the single canonical org-level list with status tabs (all/draft/submitted/provisioning/live/archived) driven by ?status=", status: "done" },
  { id: "pb-workspace-list", label: "QA Phase B — /app/workspaces/:workspaceId/campaigns is the single canonical workspace-scoped list (legacy-view CTA removed)", status: "done" },
  { id: "pb-builder", label: "QA Phase B — /admin/campaigns/new (CampaignIntakePage) is the single canonical campaign builder; /admin/campaigns/edit/:id reuses it", status: "done" },
  { id: "pb-redirects", label: "QA Phase B — campaigns/overview→/admin/campaigns, campaigns/drafts→?status=draft, campaigns/archived→?status=archived, campaign-blueprints→/admin/templates", status: "done" },
  { id: "pb-compat", label: "QA Phase B — /admin/campaigns/readiness + /admin/campaigns/event-log kept as compatibility-only (de-surfaced from primary nav, still linked from Five9/Monitoring/Legal Connect operational hubs)", status: "done" },
  { id: "pb-imports-vault", label: "QA Phase B — legacy CampaignsOverviewPage / CampaignDraftsPage / ArchivedCampaignsPage / CampaignBlueprintsPage source files retired (Phase 1 Fabric59 reposition); routes still redirect", status: "done" },
  { id: "pd-org-catalog", label: "QA Phase D — /admin/connectors is the canonical org-level integrations catalog (label 'Connectors' in primary nav)", status: "done" },
  { id: "pd-org-detail", label: "QA Phase D — /admin/connectors/:slug (ConnectorInstancePage; LegalConnectPage for clio/mycase/smokeball) is the single canonical org-level connector detail/instance route", status: "done" },
  { id: "pd-workspace-canonical", label: "QA Phase D — /app/workspaces/:workspaceId/integrations + /:connectionId remain the canonical workspace-level integrations surface (provider-agnostic, Phase 7)", status: "done" },
  { id: "pd-redirects", label: "QA Phase D — /admin/integrations → /admin/connectors (alias-only, no longer renders IntegrationsPage); legacy IntegrationsPage import removed from App.tsx", status: "done" },
  { id: "pd-compat", label: "QA Phase D — compatibility-only: /app/workspaces/:workspaceId/integrations-legacy (ConnectorsCatalogPage, de-surfaced from primary nav, removal queued post-grace-window)", status: "done" },
  { id: "pd-cta-cleanup", label: "QA Phase D — stale CTAs scrubbed: LegalConnectOverviewPage 'Open integrations' → /admin/connectors; five9DocsIndex routes ref updated; nav label org-level = 'Connectors', workspace-level = 'Integrations'", status: "done" },
  { id: "pe-canonical-ia", label: "QA Phase E — public primary IA enforced in MegaMenuHeader: Solutions, Personas, Pricing, Integrations, Customers, Trust (no 'Product' label as primary; legacy /product, /demo, /faq, /contact retained as compatibility/secondary surfaces)", status: "done" },
  { id: "pe-footer-ia", label: "QA Phase E — MegaFooter restructured into Product (canonical IA) + Platform (feature highlights) + Company (Trust/Security/Privacy/Terms/Responsible Disclosure/Contact/FAQ) columns; product tour kept under Product column", status: "done" },
  { id: "pe-shared-chrome", label: "QA Phase E — every public page (/ /personas /solutions /pricing /integrations /customers /product /demo /faq /contact /trust /security /privacy /terms /responsible-disclosure) verified to use shared marketing chrome (MegaMenuHeader + MegaFooter via MarketingLayout or direct mount)", status: "done" },
  { id: "pe-cta-routing", label: "QA Phase E — public CTAs verified: 'Request a walkthrough' → /contact, 'Sign In' → /login; no public CTA dumps users into legacy /admin or /master as first-run destination", status: "done" },
  { id: "pe-compat-public", label: "QA Phase E — compatibility-only public routes: /product (refactored in place, on-message product tour), /demo (sandbox), /faq (refactored in place); kept reachable via footer Product/Company columns and mobile menu, de-surfaced from desktop primary nav", status: "done" },
  { id: "pe-trust-authoritative", label: "QA Phase E — legal/trust surfaces preserved as authoritative (not rewritten into marketing): /trust, /security, /privacy, /terms, /responsible-disclosure", status: "done" },
  { id: "p11-legacy-route-sweep", label: "Phase 11 follow-up — final pass to delete redirects past their grace window (one release after Phase 11)", status: "todo" },
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
            <Section id="route-family-correction" title="0. Route-family editorial correction (May 14)">
              <Card className="border-primary/40">
                <CardContent className="pt-5 space-y-3 text-sm">
                  <p>
                    Earlier sections of this doc reference <code className="px-1 rounded bg-muted">/app/workspaces/:workspaceId/*</code>
                    {" "}as the canonical workspace route family. Live code converged on <code className="px-1 rounded bg-muted">/w/:workspaceId/*</code>{" "}
                    in the workspace-shell rebuild. This correction is the controlling statement; older route strings below are
                    retained for traceability and should be read as historical.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Canonical workspace route family:</strong> <code className="px-1 rounded bg-muted">/w/:workspaceId/*</code>
                      {" "}rendered by <code>CanonicalWorkspaceShell</code>. All canonical workspace nav targets live here.
                    </li>
                    <li>
                      <strong>Compatibility alias:</strong> <code className="px-1 rounded bg-muted">/app/workspaces/:workspaceId/*</code>{" "}
                      is a single-hop redirect to the canonical family. No nav link or CTA targets it directly.
                    </li>
                    <li>
                      <strong>Org / admin shell relationship (RESOLVED — Phase E shell convergence):</strong>{" "}
                      <code className="px-1 rounded bg-muted">/admin/*</code> (AdminShell) is the single canonical
                      organization-level surface. The previously scaffolded <code className="px-1 rounded bg-muted">/org/*</code>{" "}
                      OrgShell has been retired; every <code>/org/*</code> path single-hop redirects to its{" "}
                      <code>/admin/*</code> equivalent (params preserved via <code>OrgParamRedirect</code>) so external
                      bookmarks and cross-links keep resolving.
                    </li>
                    <li>
                      <strong>Workspace data scoping:</strong> <code>deployment_runs</code> and <code>agents</code> now carry a
                      <code> workspace_id</code> column. Workspace pages for Runs and Agents filter strictly by it; org-level
                      pages remain compatibility surfaces.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </Section>

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
                {WORKSPACE_NAV.map((s) => <li key={s.key}>{s.label}</li>)}
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

            <Section id="phase-11-decisions" title="16. Phase 11 — Canonical convergence, legacy strip, and route cleanup decisions">
              <h3 className="text-sm font-semibold text-foreground">Phase definition</h3>
              <p className="text-xs">
                Reconciles the running app with canonical scope by (1) collapsing legacy admin and dashboard surfaces
                into the workspace-first model, (2) consolidating duplicate routes, (3) converging marketing chrome
                onto the canonical story, and (4) standardizing tables, empty states, and status badges behind shared
                primitives. Convergence and deletion only — no new product areas this phase.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-6">In-scope</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Admin / dashboard consolidation onto a single canonical org overview.</li>
                <li>Legacy route cleanup with safe redirects and a one-release grace window before deletion.</li>
                <li>Navigation + chrome alignment to the canonical hierarchy (org-level + workspace-level).</li>
                <li>Marketing convergence to the canonical IA — no second, older story alive underneath.</li>
                <li>Table, empty-state, and status-badge convergence onto shared primitives.</li>
                <li>Safe removal of dead code already replaced by canonical surfaces.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Out of scope / deferred</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>New integrations or providers.</li>
                <li>New runtime domains (additional CRMs / telephony providers).</li>
                <li>New product areas (training/LMS, deep agentic flows).</li>
                <li>Large schema refactors beyond what Phases 0–10 already planned.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Canonical hierarchy &amp; nav truth table</h3>
              <pre className="rounded-md bg-muted/40 p-4 text-xs font-mono leading-relaxed">{`Conceptual:
  Platform → Organization → Workspace → Campaign → Guide → Call/Interaction

Org / admin shell:
  Overview · Workspaces · Integrations · Reports · Notifications · Settings · Billing

Workspace shell (canonical 15):
  Home · Clients · Campaigns · Guides · Forms · Templates · Runs · Agents ·
  Supervisor · QA · Analytics · Integrations · Knowledge · Assistant · Settings`}</pre>

              <h3 className="text-sm font-semibold text-foreground mt-6">Dashboard convergence</h3>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="text-left p-2">Surface</th><th className="text-left p-2">Canonical replacement</th><th className="text-left p-2">Action</th></tr></thead>
                <tbody>
                  {[
                    { s: "/admin (index)", c: "OverviewPage (org overview)", a: "Canonical — kept" },
                    { s: "/admin/dashboard", c: "/admin", a: "Redirect (Phase 11)" },
                    { s: "/dashboard", c: "/admin", a: "Redirect (collapsed double-hop)" },
                    { s: "/admin/agent-dashboard", c: "/app/workspaces/:id/agents", a: "Compatibility-only; de-surfaced from nav" },
                    { s: "/app/workspaces/:id/home", c: "WorkspaceHomePage", a: "Canonical workspace home" },
                  ].map((r) => (
                    <tr key={r.s} className="border-b border-border/40">
                      <td className="p-2 font-mono text-[11px] text-muted-foreground">{r.s}</td>
                      <td className="p-2 font-mono text-[11px]">{r.c}</td>
                      <td className="p-2">{r.a}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="text-sm font-semibold text-foreground mt-6">Campaign cluster convergence (planned)</h3>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="text-left p-2">Legacy route</th><th className="text-left p-2">Canonical replacement</th><th className="text-left p-2">Action</th></tr></thead>
                <tbody>
                  {[
                    { s: "/admin/campaigns/overview", c: "/admin/campaigns (or workspace campaigns)", a: "merge → redirect" },
                    { s: "/admin/campaigns/drafts", c: "canonical campaigns list, status=draft filter", a: "merge → redirect" },
                    { s: "/admin/campaigns/readiness", c: "canonical campaigns list, readiness tab", a: "merge → redirect" },
                    { s: "/admin/campaigns/event-log", c: "canonical campaign detail → events tab", a: "merge → redirect" },
                    { s: "/admin/campaigns/archived", c: "canonical campaigns list, status=archived filter", a: "merge → redirect" },
                    { s: "/admin/campaign-blueprints", c: "canonical Templates(kind=campaign)", a: "merge → redirect" },
                    { s: "/admin/five9/campaign-builder", c: "canonical campaign builder under workspace", a: "demote to compat-only" },
                  ].map((r) => (
                    <tr key={r.s} className="border-b border-border/40">
                      <td className="p-2 font-mono text-[11px] text-muted-foreground">{r.s}</td>
                      <td className="p-2 font-mono text-[11px]">{r.c}</td>
                      <td className="p-2">{r.a}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="text-sm font-semibold text-foreground mt-6">Builder set after Phase 11 (target)</h3>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="border-b"><th className="text-left p-2">Builder</th><th className="text-left p-2">Canonical route</th><th className="text-left p-2">Notes</th></tr></thead>
                <tbody>
                  {[
                    { b: "Guide", r: "/app/workspaces/:id/guides/:id/edit", n: "ScriptBuilderPage compat-only for source_type='script'." },
                    { b: "Campaign", r: "/app/workspaces/:id/campaigns/new + /:id", n: "CampaignIntakePage canonical creator." },
                    { b: "Mapping", r: "/admin/mappings/builder/:id", n: "Single mapping foundation." },
                    { b: "Flow", r: "/admin/flows/:id", n: "Kept for integrations orchestration; one only." },
                  ].map((r) => (
                    <tr key={r.b} className="border-b border-border/40">
                      <td className="p-2 font-medium">{r.b}</td>
                      <td className="p-2 font-mono text-[11px]">{r.r}</td>
                      <td className="p-2 text-muted-foreground">{r.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="text-sm font-semibold text-foreground mt-6">Integrations &amp; connectors</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><span className="font-mono">/admin/connectors</span> — single org-level catalog.</li>
                <li><span className="font-mono">/admin/connectors/:slug</span> — single connector instance route.</li>
                <li><span className="font-mono">/admin/integrations</span> — already redirects to <span className="font-mono">/admin/connectors</span>.</li>
                <li><span className="font-mono">/app/workspaces/:id/integrations</span> + <span className="font-mono">/:connectionId</span> — canonical workspace surface (Phase 7).</li>
                <li><span className="font-mono">/app/workspaces/:id/integrations-legacy</span> — compat-only ConnectorsCatalogPage; removal queued post-grace-window.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Marketing convergence</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Canonical IA: <span className="font-mono">/, /personas, /solutions, /pricing, /integrations, /customers</span>.</li>
                <li>Legal/trust: <span className="font-mono">/trust, /security, /privacy, /terms, /responsible-disclosure</span> (kept verbatim).</li>
                <li>Compatibility (audit + refactor or redirect): <span className="font-mono">/product, /demo, /faq, /contact</span>.</li>
                <li>No legacy generic-SaaS hero/feature blocks contradicting canonical positioning may remain after this phase.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">UI primitive convergence</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><span className="font-mono">DataTable</span> (<span className="font-mono">src/components/ui/data-table.tsx</span>) — canonical table; ad-hoc tables to be migrated.</li>
                <li><span className="font-mono">EmptyState</span> (<span className="font-mono">src/components/common/EmptyState.tsx</span>) — canonical empty-state shell with primary action + optional docs link.</li>
                <li><span className="font-mono">StatusBadge</span> (<span className="font-mono">src/components/common/StatusBadge.tsx</span>) — canonical status badge; tones <span className="font-mono">success | warning | danger | info | neutral</span>; auto-maps common backend statuses.</li>
                <li><span className="font-mono">KpiCard</span> (<span className="font-mono">src/components/common/KpiCard.tsx</span>) — canonical KPI tile (Phase 8).</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Guardrails</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Do not modify auth role definitions, ProtectedRoute / MasterProtectedRoute, or core RLS beyond what cleanup strictly requires.</li>
                <li>Do not modify Phase 10 AI tables, edge function, or assistant behaviors except for display/layout integration.</li>
                <li>Every public/bookmark-likely route deletion must keep a redirect for at least one release before removal.</li>
                <li>DB drops must follow vault/snapshot pattern: snapshot, confirm no active callers, dual-read window if renaming.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Exit checklist</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Admin + workspace nav match canonical hierarchy with no stray entries.</li>
                <li>One canonical org overview, one canonical workspace home, no orphan dashboards.</li>
                <li>Campaign surfaces collapsed to canonical list/detail/builder; legacy routes merged or redirected.</li>
                <li>Builder set reduced to canonical four (Guide, Campaign, Mapping, Flow).</li>
                <li>Integrations have one catalog + one instance route; duplicates removed.</li>
                <li>Marketing routes converged to canonical IA; no conflicting legacy story.</li>
                <li>Breadcrumbs / context indicators present on nested pages.</li>
                <li>Tables, empty states, and status badges standardized via shared primitives.</li>
                <li>Legacy routes either redirect (within grace window) or are removed.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Phase 11 — Remaining work checklist</h3>
              <p className="text-xs text-muted-foreground">
                Tracking the closeout slices still in flight before Phase 11 is marked done.
              </p>

              <h4 className="text-xs font-semibold text-foreground mt-4">1. Campaign cluster merge</h4>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Confirm canonical campaign surfaces: one list, one detail, one builder.</li>
                <li>Merge <span className="font-mono">/admin/campaigns/{`{overview,drafts,readiness,event-log,archived}`}</span> into the canonical list (tabs/filters) and detail tabs.</li>
                <li>Fold <span className="font-mono">/admin/campaign-blueprints</span> into Templates(kind=campaign) if still in scope.</li>
                <li>Ensure one canonical campaign entity in the data model (compatibility views only where needed).</li>
                <li>Add/verify redirects for merged routes with planned deletion release in the redirect matrix.</li>
              </ul>

              <h4 className="text-xs font-semibold text-foreground mt-4">2. Builder vault + consolidation</h4>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Lock canonical builders: Guide, Campaign, Mapping, Flow (kept or explicitly frozen + documented).</li>
                <li>Vault and delete legacy/duplicate builders: <span className="font-mono">/admin/scripter</span>, <span className="font-mono">/admin/scripts</span> (+ <span className="font-mono">:id</span>), <span className="font-mono">/admin/tree-editor</span> (+ <span className="font-mono">:scriptId</span>), residual scriptflow/script-routing surfaces.</li>
                <li>Confirm sidebar/nav has no references to deleted builders and no hooks/components import them.</li>
                <li>Vault entries exist for any non-trivial deleted builder.</li>
              </ul>

              <h4 className="text-xs font-semibold text-foreground mt-4">3. Table + EmptyState rollout</h4>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Canonical DataTable: <span className="font-mono">src/components/ui/data-table.tsx</span>.</li>
                <li>Migrate major surfaces: Workspaces/Clients, Campaigns, Guides, Integrations, Analytics &amp; QA, Billing.</li>
                <li>Replace ad-hoc empty states with shared <span className="font-mono">EmptyState</span> — clear copy, primary CTA, optional docs link.</li>
                <li>Document canonical table &amp; EmptyState patterns in the UI primitives policy and tick them off.</li>
              </ul>

              <h4 className="text-xs font-semibold text-foreground mt-4">4. Integrations nav convergence</h4>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Lock canonical routes: <span className="font-mono">/admin/connectors</span> (catalog) and <span className="font-mono">/admin/connectors/:slug</span> (instance config).</li>
                <li>Remove/redirect legacy <span className="font-mono">/admin/integrations</span> and any other overlaps per cleanup plan.</li>
                <li>Update sidebar nav and route map so only canonical integrations routes show.</li>
                <li>Add entries to the redirect matrix (legacy → canonical → release to delete).</li>
              </ul>

              <h4 className="text-xs font-semibold text-foreground mt-4">5. Marketing convergence sanity check</h4>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Confirm public IA: <span className="font-mono">/, /personas/*, /solutions/*, /integrations, /pricing, /customers, /faq, /contact, /trust, /security, /privacy, /terms, /responsible-disclosure</span>.</li>
                <li>Identify legacy marketing routes/components in code and decide refactor vs. redirect vs. delete.</li>
                <li>Ensure no second, conflicting product story is reachable from public nav.</li>
                <li>Update the marketing table in /outline to reflect the final live vs. deprecated set.</li>
              </ul>

              <h4 className="text-xs font-semibold text-foreground mt-4">6. Legacy route redirect matrix</h4>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Complete the matrix: legacy route · canonical target · status (redirected/removed) · release after which delete is safe.</li>
                <li>Implement redirects for legacy Five9 aliases, legacy call-flow routes, legacy integrations lists, stray internal routes.</li>
                <li>After one release window, delete routes whose redirects have expired per plan.</li>
              </ul>

              <h4 className="text-xs font-semibold text-foreground mt-4">7. Phase 11 close-out</h4>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Admin &amp; workspace nav match canonical hierarchy (no dead/orphan entries).</li>
                <li>Campaign cluster fully merged; no stray campaign pages.</li>
                <li>Builder set reduced to canonical list, with vault coverage for deletions.</li>
                <li>Tables and EmptyState standardized on shared primitives across major surfaces.</li>
                <li>Integrations nav converged; no duplicate/legacy routes.</li>
                <li>Marketing routes aligned to canonical IA; no off-message flows.</li>
                <li>Redirect matrix implemented; agreed legacy routes redirected or removed.</li>
                <li>/outline updated with final route + nav map, convergence decisions, UI primitive notes, and removed/redirected route timing — Phase 11 status flipped to <span className="font-mono">done</span>.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-8">Phase F — UI primitive convergence (rollout coverage)</h3>
              <p className="text-xs text-muted-foreground">
                Final convergence pass: shared <span className="font-mono">DataTable</span>, <span className="font-mono">EmptyState</span>, and <span className="font-mono">StatusBadge</span> adopted across the major workspace surfaces while preserving behavior.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><b>StatusBadge</b> — adopted on Workspace Campaigns, Workspace Guides, Workspace QA, Workspace Integrations, Workspace Billing, Workspace Clients (replaces local one-off pills).</li>
                <li><b>EmptyState</b> — adopted on Workspace Campaigns, Workspace Guides, Workspace Integrations (connections), Workspace Billing (already), Workspace QA (already), Workspace Analytics (already), Workspace Clients.</li>
                <li><b>DataTable</b> — Workspace Campaigns retains its shadcn Table inside a Card (column rendering + linked rows preserved); fragile/highly-custom builder tables left untouched intentionally to avoid regression.</li>
                <li><b>KpiCard</b> — already canonical across Analytics, Billing, QA from Phase 8.</li>
                <li>Local one-off <span className="font-mono">StatusBadge</span> components inside QA and Integrations pages removed in favor of <span className="font-mono">@/components/common/StatusBadge</span>.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">Phase F — Final legacy route redirect matrix</h3>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Legacy route</th>
                      <th className="px-3 py-2 font-medium">Canonical target</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                      <th className="px-3 py-2 font-medium">Reason</th>
                      <th className="px-3 py-2 font-medium">Safe to delete after</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:px-3 [&_td]:py-1.5 [&_td]:align-top">
                    <tr><td className="font-mono">/admin/dashboard</td><td className="font-mono">/admin</td><td>Redirect</td><td>Single canonical org overview</td><td>Next release after Phase 11 (one grace cycle)</td></tr>
                    <tr><td className="font-mono">/dashboard</td><td className="font-mono">/admin</td><td>Redirect alias</td><td>Friendly alias from auth/landing</td><td>Keep indefinitely (bookmark-likely)</td></tr>
                    <tr><td className="font-mono">/admin/campaigns/{`{overview,drafts,readiness,event-log,archived}`}</td><td className="font-mono">/admin/campaigns</td><td>Redirect (tabs/filters)</td><td>Single canonical list</td><td>Next release</td></tr>
                    <tr><td className="font-mono">/admin/campaign-blueprints</td><td className="font-mono">/admin/campaigns</td><td>Redirect</td><td>Folded into Templates(kind=campaign)</td><td>Next release</td></tr>
                    <tr><td className="font-mono">/admin/scripter</td><td className="font-mono">/admin/scripts</td><td>Redirect</td><td>Builder consolidation (Phase C)</td><td>Next release</td></tr>
                    <tr><td className="font-mono">/admin/scriptflow</td><td className="font-mono">/admin/scripts</td><td>Redirect</td><td>Builder consolidation</td><td>Next release</td></tr>
                    <tr><td className="font-mono">/admin/tree-editor</td><td className="font-mono">/admin/scripts</td><td>Redirect</td><td>Builder consolidation</td><td>Next release</td></tr>
                    <tr><td className="font-mono">/admin/tree-editor/:scriptId</td><td className="font-mono">/admin/scripts/:id/builder</td><td>Compatibility-only</td><td>Bookmarked deep links</td><td>One release after deep-link audit</td></tr>
                    <tr><td className="font-mono">/admin/script-routing</td><td className="font-mono">/admin/scripts</td><td>Compatibility-only</td><td>Operationally referenced</td><td>One release after dependency removal</td></tr>
                    <tr><td className="font-mono">/admin/call-flow</td><td className="font-mono">/admin/flows</td><td>Redirect</td><td>Builder consolidation</td><td>Next release</td></tr>
                    <tr><td className="font-mono">/admin/integrations</td><td className="font-mono">/admin/connectors</td><td>Redirect</td><td>Single canonical catalog (Phase D)</td><td>Next release</td></tr>
                    <tr><td className="font-mono">/app/workspaces/:id/integrations-legacy</td><td className="font-mono">/app/workspaces/:id/integrations</td><td>Compatibility-only</td><td>Pre-Phase 7 catalog</td><td>One release after pilot sign-off</td></tr>
                    <tr><td className="font-mono">/product, /demo, /faq</td><td className="font-mono">/solutions, /personas, /pricing, /integrations, /customers, /trust</td><td>De-surfaced from primary nav</td><td>Reachable via footer/mobile (Phase E)</td><td>Keep one release; revisit after marketing audit</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-6">Phase 11 — Status</h3>
              <p className="text-xs">
                <Badge variant="outline" className="mr-1.5 text-[10px] bg-success/10 text-success border-success/30">Done</Badge>
                Phases A–F complete: dashboard convergence, campaign cluster merge, builder consolidation, integrations
                convergence, marketing IA convergence, and shared UI-primitive rollout. Remaining cleanup
                (legacy redirect deletions past grace window, builder source-file vaulting) is tracked under
                <span className="font-mono"> p11-legacy-route-sweep</span> and <span className="font-mono">p11-builder-vault</span>
                follow-ups and intentionally deferred to one release after Phase 11.
              </p>
            </Section>

            <Section id="qa-release-readiness" title="17. QA Release Readiness — post-Phase 11 regression pass">
              <p className="text-xs text-muted-foreground">
                Source of truth for the release-candidate QA cycle. Phase 11 convergence is locked; this section
                governs regression validation, redirect verification, compatibility-route smoke testing, and the
                post-release grace-window deletion plan. Update statuses inline as cycles complete.
              </p>

              <h3 className="text-sm font-semibold text-foreground mt-6">17.1 Route-family regression checklist</h3>
              <p className="text-xs text-muted-foreground">
                For every family: happy path, empty state, StatusBadge tones, desktop @ 1280, mobile @ 390, deep-link
                refresh, redirect dependencies, compatibility-route dependencies, known follow-up risks.
              </p>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Family</th>
                      <th className="px-3 py-2 font-medium">Canonical route</th>
                      <th className="px-3 py-2 font-medium">Owner</th>
                      <th className="px-3 py-2 font-medium">Key checks</th>
                      <th className="px-3 py-2 font-medium">Compat / redirect deps</th>
                      <th className="px-3 py-2 font-medium">Follow-up risks</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:px-3 [&_td]:py-1.5 [&_td]:align-top">
                    <tr><td>Org overview</td><td className="font-mono">/admin</td><td>Admin shell</td><td>KPIs render; quick actions; system health strip; readiness checklist</td><td>/admin/dashboard, /dashboard aliases</td><td>Master-admin gating; org-switch reload</td></tr>
                    <tr><td>Workspace home</td><td className="font-mono">/app/workspaces/:id</td><td>Workspace shell</td><td>Workspace resolves; sub-nav present; breadcrumb correct</td><td>None</td><td>Workspace switch flicker on slow auth</td></tr>
                    <tr><td>Clients</td><td className="font-mono">/app/workspaces/:id/clients</td><td>Workspace shell</td><td>List renders; EmptyState; StatusBadge active/inactive; row link → /admin/clients/:id</td><td>Legacy /admin/clients (compat link in header)</td><td>Workspace_id rebinding still TODO; currently org-scoped</td></tr>
                    <tr><td>Campaigns</td><td className="font-mono">/app/workspaces/:id/campaigns</td><td>Workspace shell</td><td>List + detail + new; StatusBadge draft/ready/live/paused; EmptyState CTA → new</td><td>Legacy /admin/campaigns/* tabs redirect</td><td>Source mirroring from campaign_setups</td></tr>
                    <tr><td>Guides</td><td className="font-mono">/app/workspaces/:id/guides</td><td>Workspace shell</td><td>Card grid; StatusBadge published/draft/archived; version chip; EmptyState → new</td><td>Legacy /admin/scripts (compat header link)</td><td>Mirror from scripts; AI assist on edit</td></tr>
                    <tr><td>Templates</td><td className="font-mono">/app/workspaces/:id/templates</td><td>Workspace shell</td><td>Tabs by kind; detail page resolves</td><td>None</td><td>Campaign-blueprints fold-in</td></tr>
                    <tr><td>Integrations (workspace)</td><td className="font-mono">/app/workspaces/:id/integrations</td><td>Workspace shell</td><td>Provider list; new-connection dialog; StatusBadge connected/error/disabled; EmptyState; detail route resolves</td><td>/app/workspaces/:id/integrations-legacy (compat)</td><td>OAuth round-trip not yet tested per provider</td></tr>
                    <tr><td>Connectors (org)</td><td className="font-mono">/admin/connectors</td><td>Admin shell</td><td>Catalog grid; instance route; LegalConnect for clio/mycase/smokeball</td><td>/admin/integrations → redirect</td><td>Provider config wizard regressions</td></tr>
                    <tr><td>Analytics</td><td className="font-mono">/app/workspaces/:id/analytics</td><td>Workspace shell</td><td>KpiCards; dispositions chart; EmptyState; drill-down links</td><td>None</td><td>Org-scoped data until workspace_id plumbing lands</td></tr>
                    <tr><td>QA</td><td className="font-mono">/app/workspaces/:id/qa</td><td>Workspace shell</td><td>Tabs pending/completed/all; StatusBadge; start/complete actions; EmptyState</td><td>None</td><td>Calibration/rubric scope deferred</td></tr>
                    <tr><td>Billing</td><td className="font-mono">/app/workspaces/:id/billing</td><td>Workspace shell</td><td>Invoice list; KpiCards; StatusBadge paid/overdue/unpaid; EmptyState</td><td>None</td><td>Subscription plumbing deferred</td></tr>
                    <tr><td>Public marketing IA</td><td className="font-mono">/, /solutions, /personas, /pricing, /integrations, /customers, /trust</td><td>Marketing chrome</td><td>Header + footer canonical; CTAs route to /contact, /login; no /admin or /master leak</td><td>/product, /demo, /faq (compat, footer-only)</td><td>SEO/meta drift</td></tr>
                    <tr><td>Auth + onboarding</td><td className="font-mono">/login, /signup, /forgot-password, /reset-password, /accept-invite, /onboarding, /workspace-bootstrap</td><td>Auth shell</td><td>Email/password works; invite token; redirect to /admin or /app on success</td><td>/dashboard alias post-login</td><td>RLS membership race on first login</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-6">17.2 Redirect smoke matrix</h3>
              <p className="text-xs text-muted-foreground">
                Verify each legacy URL hits the canonical target within one client navigation. No 404, no infinite redirect, no auth bounce loop.
              </p>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Test #</th>
                      <th className="px-3 py-2 font-medium">Visit</th>
                      <th className="px-3 py-2 font-medium">Expect to land on</th>
                      <th className="px-3 py-2 font-medium">Auth required</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:px-3 [&_td]:py-1.5 [&_td]:align-top">
                    <tr><td>R-01</td><td className="font-mono">/admin/dashboard</td><td className="font-mono">/admin</td><td>Yes (admin)</td></tr>
                    <tr><td>R-02</td><td className="font-mono">/dashboard</td><td className="font-mono">/admin</td><td>Yes (any role)</td></tr>
                    <tr><td>R-03</td><td className="font-mono">/admin/campaigns/overview</td><td className="font-mono">/admin/campaigns</td><td>Yes</td></tr>
                    <tr><td>R-04</td><td className="font-mono">/admin/campaigns/drafts</td><td className="font-mono">/admin/campaigns</td><td>Yes</td></tr>
                    <tr><td>R-05</td><td className="font-mono">/admin/campaigns/readiness</td><td className="font-mono">/admin/campaigns</td><td>Yes</td></tr>
                    <tr><td>R-06</td><td className="font-mono">/admin/campaigns/event-log</td><td className="font-mono">/admin/campaigns</td><td>Yes</td></tr>
                    <tr><td>R-07</td><td className="font-mono">/admin/campaigns/archived</td><td className="font-mono">/admin/campaigns</td><td>Yes</td></tr>
                    <tr><td>R-08</td><td className="font-mono">/admin/campaign-blueprints</td><td className="font-mono">/admin/campaigns</td><td>Yes</td></tr>
                    <tr><td>R-09</td><td className="font-mono">/admin/scripter</td><td className="font-mono">/admin/scripts</td><td>Yes</td></tr>
                    <tr><td>R-10</td><td className="font-mono">/admin/scriptflow</td><td className="font-mono">/admin/scripts</td><td>Yes</td></tr>
                    <tr><td>R-11</td><td className="font-mono">/admin/tree-editor</td><td className="font-mono">/admin/scripts</td><td>Yes</td></tr>
                    <tr><td>R-12</td><td className="font-mono">/admin/call-flow</td><td className="font-mono">/admin/flows</td><td>Yes</td></tr>
                    <tr><td>R-13</td><td className="font-mono">/admin/integrations</td><td className="font-mono">/admin/connectors</td><td>Yes</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-6">17.3 Compatibility smoke matrix</h3>
              <p className="text-xs text-muted-foreground">
                These routes are intentionally retained for one grace window. They must remain reachable and functional, but must NOT appear in primary navigation or canonical CTAs.
              </p>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Test #</th>
                      <th className="px-3 py-2 font-medium">Route</th>
                      <th className="px-3 py-2 font-medium">Expected behavior</th>
                      <th className="px-3 py-2 font-medium">Hidden from nav?</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:px-3 [&_td]:py-1.5 [&_td]:align-top">
                    <tr><td>C-01</td><td className="font-mono">/admin/tree-editor/:scriptId</td><td>Loads legacy TreeEditorPage; deep-link bookmark works; no nav pointer</td><td>Yes</td></tr>
                    <tr><td>C-02</td><td className="font-mono">/admin/script-routing</td><td>Loads ScriptRoutingPage; reachable for ops; no nav pointer</td><td>Yes</td></tr>
                    <tr><td>C-03</td><td className="font-mono">/app/workspaces/:id/integrations-legacy</td><td>Loads ConnectorsCatalogPage; canonical /integrations is preferred</td><td>Yes</td></tr>
                    <tr><td>C-04</td><td className="font-mono">/product</td><td>Renders ProductTourPage in marketing chrome; reachable from footer / mobile menu only</td><td>Desktop: yes</td></tr>
                    <tr><td>C-05</td><td className="font-mono">/demo</td><td>Renders DemoSandboxPage in marketing chrome; footer / mobile menu only</td><td>Desktop: yes</td></tr>
                    <tr><td>C-06</td><td className="font-mono">/faq</td><td>Renders FaqPage in marketing chrome; footer / mobile menu only</td><td>Desktop: yes</td></tr>
                    <tr><td>C-07</td><td className="font-mono">/admin/clients</td><td>Legacy client list still works; linked from workspace clients header for transition</td><td>Yes (workspace clients is canonical)</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-6">17.4 Canonical-vs-compatibility truth table</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><b>Org overview</b>: canonical <span className="font-mono">/admin</span>; compat aliases <span className="font-mono">/admin/dashboard</span>, <span className="font-mono">/dashboard</span>.</li>
                <li><b>Workspace home</b>: canonical <span className="font-mono">/app/workspaces/:id</span>; no compat aliases.</li>
                <li><b>Campaigns</b>: canonical <span className="font-mono">/admin/campaigns</span> + <span className="font-mono">/app/workspaces/:id/campaigns</span>; compat: redirected legacy tabs and blueprints.</li>
                <li><b>Builders</b>: canonical four — Guide / Campaign / Mapping / Flow; compat-only: tree-editor deep links, script-routing.</li>
                <li><b>Integrations</b>: canonical org <span className="font-mono">/admin/connectors</span>, canonical workspace <span className="font-mono">/app/workspaces/:id/integrations</span>; compat: <span className="font-mono">/admin/integrations</span> (redirect), <span className="font-mono">.../integrations-legacy</span>.</li>
                <li><b>Marketing</b>: canonical six in desktop nav; compat: <span className="font-mono">/product</span>, <span className="font-mono">/demo</span>, <span className="font-mono">/faq</span> (footer + mobile only).</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">17.5 Nav &amp; CTA consistency checks</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>No item appears twice in primary admin sidebar (campaigns, integrations, builders).</li>
                <li>Primary marketing nav is exactly: Solutions, Personas, Pricing, Integrations, Customers, Trust.</li>
                <li>No public CTA targets <span className="font-mono">/admin/*</span>, <span className="font-mono">/master/*</span>, or <span className="font-mono">/superadmin/*</span>.</li>
                <li>No CTA references stale labels: "Scripter", "Scriptflow", "Tree Editor" (allowed only as compat link text in headers).</li>
                <li>Builder back/preview CTAs route only to canonical builders (post-Phase C).</li>
                <li>"Connectors" is the visible nav label; "Integrations" appears only in marketing IA and workspace nav.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">17.6 Responsive / mobile spot-checks</h3>
              <p className="text-xs text-muted-foreground">Min viewport: 360 × 800. Verify each touched surface:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Workspace shell: sidebar collapses; section header doesn't overflow.</li>
                <li>Campaign list table: horizontal scroll OK; row tap = navigate.</li>
                <li>Guide cards: stack vertically; status + version chips wrap cleanly.</li>
                <li>Integrations: dialog usable on mobile; provider select reachable.</li>
                <li>Analytics: KpiCard grid 2-col on mobile; disposition bars don't clip.</li>
                <li>QA: tabs scrollable; action buttons reachable on narrow rows.</li>
                <li>Billing: invoice list rows wrap; StatusBadge stays inline.</li>
                <li>Marketing header: mega menu collapses to hamburger; full IA visible in mobile menu.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">17.7 Defect log structure</h3>
              <p className="text-xs text-muted-foreground">Use this template per finding (track in issue tracker, mirror summary here for the cycle):</p>
              <div className="rounded-md border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap">
{`ID:        QA-RC-001
Date:      YYYY-MM-DD
Reporter:  <name>
Route:     <path>
Family:    <campaigns | guides | integrations | ...>
Severity:  S1 (blocker) | S2 (major) | S3 (minor) | S4 (cosmetic)
Repro:     1. ...  2. ...  3. ...
Expected:  ...
Actual:    ...
Console:   <yes/no, snippet>
Network:   <failing request, status>
Workaround: <if any>
Owner:     <triaged-to>
Status:    open | in-progress | fixed | wontfix | duplicate`}
              </div>
              <ul className="list-disc pl-5 space-y-1 text-xs mt-2">
                <li><b>S1 — blocker</b>: canonical route 500/blank, auth loop, data loss, redirect loop, primary CTA broken. Must fix to ship.</li>
                <li><b>S2 — major</b>: feature broken on canonical route; mobile broken on touched surface; redirect lands on wrong canonical target.</li>
                <li><b>S3 — minor</b>: empty state copy/icon off; StatusBadge wrong tone; nav label inconsistency.</li>
                <li><b>S4 — cosmetic</b>: spacing/typography drift; non-critical alignment.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">17.8 Release-candidate checklist</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>17.1 route-family checklist — 100% green on canonical routes.</li>
                <li>17.2 redirect matrix — all 13 redirects resolve to canonical target with no auth loop.</li>
                <li>17.3 compatibility matrix — all 7 routes reachable; none surfaced in primary nav.</li>
                <li>17.5 nav &amp; CTA audit — no duplicates, no stale labels, no public→admin leaks.</li>
                <li>17.6 mobile pass — every touched workspace surface usable at 390 × 844.</li>
                <li>No open S1 or S2 defects in 17.7.</li>
                <li>Build green; lint green; <span className="font-mono">npm test</span> (vitest) green.</li>
                <li>Console clean on canonical routes (no red errors at navigation).</li>
                <li>/outline 17.x sections updated with cycle date + sign-off.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">17.9 Post-release deletion checklist (next release after RC)</h3>
              <p className="text-xs text-muted-foreground">
                After one full release cycle in production with the redirects/compat routes in place, execute these deletions. Each item must be paired with a release note and verified that no inbound traffic remains in logs.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Delete redirect entries R-03 through R-08 (legacy <span className="font-mono">/admin/campaigns/*</span> tabs) and R-09 through R-12 (builder aliases) once analytics show &lt;1% traffic for 7 days.</li>
                <li>Delete <span className="font-mono">/admin/integrations</span> alias (R-13).</li>
                <li>Legacy source files removed in Phase 1 Fabric59 reposition: <span className="font-mono">ScripterPage</span>, <span className="font-mono">ScriptFlowHubPage</span>, <span className="font-mono">CallFlowBuilderPage</span>, legacy <span className="font-mono">IntegrationsPage</span>, legacy campaign tab pages (<span className="font-mono">p11-builder-vault</span> + <span className="font-mono">pb-imports-vault</span> done).</li>
                <li>Decide on <span className="font-mono">/admin/tree-editor/:scriptId</span> + <span className="font-mono">/admin/script-routing</span>: keep as ops compat, or fully remove based on usage data.</li>
                <li>Decide on <span className="font-mono">/app/workspaces/:id/integrations-legacy</span> removal once pilots confirm Phase 7 catalog parity.</li>
                <li>Decide on <span className="font-mono">/product</span>, <span className="font-mono">/demo</span>, <span className="font-mono">/faq</span> public-route fate based on marketing/SEO data.</li>
                <li>Add release note: "Legacy routes removed — canonical replacements in place since &lt;previous release&gt;."</li>
                <li>Flip <span className="font-mono">p11-legacy-route-sweep</span> and <span className="font-mono">p11-builder-vault</span> follow-ups to <span className="font-mono">done</span> in /outline.</li>
              </ul>

              <h3 className="text-sm font-semibold text-foreground mt-6">17.10 Cycle log</h3>
              <p className="text-xs text-muted-foreground">
                Append one row per QA cycle: cycle date, tester, build/commit, sections passed, S1/S2 count, sign-off.
                Empty until the first RC pass runs.
              </p>
              <div className="rounded-md border p-3 text-xs text-muted-foreground italic">
                No cycles recorded yet. First cycle should fill in: date, tester, build SHA, results for 17.1–17.6, defect count by severity, ship/no-ship decision.
              </div>
            </Section>

            <Section id="s18" title="18. Post-Phase-11 Surface Truth Audit (Pass 1)">
              <p className="text-xs text-muted-foreground">
                Read-only inventory of every user-facing surface after Phase 11 close-out, classified canonical vs compatibility vs lingering. Source: <span className="font-mono">src/data/surfaceAudit.ts</span>. No user-facing routes/copy were modified to produce this audit. Pass 2 executes the recommended slice sequence (A–D) to revamp.
              </p>

              {(() => {
                const s = summarizeAudit();
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-3">
                    {Object.entries(s.byScope).map(([k, v]) => (
                      <div key={k} className="rounded-md border p-2 text-xs">
                        <div className="font-mono text-muted-foreground">{k}</div>
                        <div className="text-base font-semibold text-foreground">{v}</div>
                      </div>
                    ))}
                    {Object.entries(s.byClassification).map(([k, v]) => (
                      <div key={k} className="rounded-md border p-2 text-xs">
                        <div className="font-mono text-muted-foreground">{k}</div>
                        <div className="text-base font-semibold text-foreground">{v}</div>
                      </div>
                    ))}
                    <div className="rounded-md border p-2 text-xs"><div className="font-mono text-muted-foreground">total routes</div><div className="text-base font-semibold">{s.total}</div></div>
                    <div className="rounded-md border p-2 text-xs"><div className="font-mono text-muted-foreground">lingering</div><div className="text-base font-semibold">{s.lingering}</div></div>
                    <div className="rounded-md border p-2 text-xs"><div className="font-mono text-muted-foreground">copy issues</div><div className="text-base font-semibold">{s.copyIssues}</div></div>
                    <div className="rounded-md border p-2 text-xs"><div className="font-mono text-muted-foreground">cta non-canonical</div><div className="text-base font-semibold">{s.ctaIssues}</div></div>
                    <div className="rounded-md border p-2 text-xs"><div className="font-mono text-muted-foreground">redirects</div><div className="text-base font-semibold">{s.redirects}</div></div>
                  </div>
                );
              })()}

              <h3 className="text-sm font-semibold text-foreground mt-6">18.1 Surface inventory</h3>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Route</th>
                      <th className="text-left p-2">Scope</th>
                      <th className="text-left p-2">Current title</th>
                      <th className="text-left p-2">Canonical</th>
                      <th className="text-left p-2">Class</th>
                      <th className="text-left p-2">Action</th>
                      <th className="text-left p-2">Slice</th>
                      <th className="text-left p-2">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SURFACE_INVENTORY.map((r) => (
                      <tr key={r.route} className="border-t align-top">
                        <td className="p-2 font-mono">{r.route}</td>
                        <td className="p-2">{r.scope}</td>
                        <td className="p-2">{r.currentTitle}</td>
                        <td className="p-2">{r.canonicalName}</td>
                        <td className="p-2">{r.classification}</td>
                        <td className="p-2">{r.action}</td>
                        <td className="p-2">{r.slice}</td>
                        <td className="p-2">{r.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-6">18.2 Lingering items matrix</h3>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Area</th>
                      <th className="text-left p-2">Item</th>
                      <th className="text-left p-2">Evidence</th>
                      <th className="text-left p-2">Impact</th>
                      <th className="text-left p-2">Slice</th>
                      <th className="text-left p-2">Resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LINGERING_ITEMS.map((l) => (
                      <tr key={l.id} className="border-t align-top">
                        <td className="p-2 font-mono">{l.id}</td>
                        <td className="p-2">{l.area}</td>
                        <td className="p-2">{l.item}</td>
                        <td className="p-2 text-muted-foreground">{l.evidence}</td>
                        <td className="p-2">{l.impact}</td>
                        <td className="p-2">{l.slice}</td>
                        <td className="p-2">{l.resolution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-6">18.3 Copy / naming inconsistency matrix</h3>
              <div className="space-y-2">
                {COPY_INCONSISTENCIES.map((c) => (
                  <div key={c.id} className="rounded-md border p-3 text-xs">
                    <div className="font-semibold text-foreground">{c.id} — {c.entity} <span className="ml-2 text-muted-foreground">(slice {c.slice})</span></div>
                    <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                      {c.variants.map((v, i) => (
                        <li key={i}><span className="font-mono">{v.label}</span> — {v.where}</li>
                      ))}
                    </ul>
                    <div className="mt-1"><span className="text-muted-foreground">Canonical:</span> <span className="text-foreground">{c.canonical}</span></div>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-6">18.4 CTA / navigation alignment matrix</h3>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">CTA</th>
                      <th className="text-left p-2">Surface</th>
                      <th className="text-left p-2">Destination</th>
                      <th className="text-left p-2">Class</th>
                      <th className="text-left p-2">Slice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CTA_ALIGNMENT.map((t) => (
                      <tr key={t.id} className="border-t align-top">
                        <td className="p-2 font-mono">{t.id}</td>
                        <td className="p-2">{t.cta}</td>
                        <td className="p-2">{t.surface}</td>
                        <td className="p-2 font-mono">{t.destination}</td>
                        <td className="p-2">{t.classification}</td>
                        <td className="p-2">{t.slice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-6">18.5 Redirect / compatibility truth table</h3>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Route</th>
                      <th className="text-left p-2">Disposition</th>
                      <th className="text-left p-2">Canonical target</th>
                      <th className="text-left p-2">Sunset</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REDIRECT_TABLE.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2 font-mono">{r.id}</td>
                        <td className="p-2 font-mono">{r.from}</td>
                        <td className="p-2">{r.mode === "compat" ? "compat" : `redirect (${r.kind})`}</td>
                        <td className="p-2 font-mono">{r.to}</td>
                        <td className="p-2">{r.sunsetPhase}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-6">18.6 Recommended slice sequence (Pass 2)</h3>
              <div className="space-y-3">
                {SLICE_SEQUENCE.map((s) => (
                  <div key={s.slice} className="rounded-md border p-3">
                    <div className="text-sm font-semibold text-foreground">Slice {s.slice} — {s.name}</div>
                    <div className="mt-2 text-xs">
                      <div className="font-medium text-foreground">Touches</div>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {s.touches.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                    <div className="mt-2 text-xs">
                      <div className="font-medium text-foreground">Does not touch</div>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {s.doesNotTouch.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
