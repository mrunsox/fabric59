/**
 * Post-Phase-11 Surface Truth Audit (Pass 1)
 *
 * Single source of truth for the canonical-vs-compatibility state of every
 * user-facing surface in Fabric59 after Phase 11 convergence completed.
 *
 * NO user-facing copy or routes are modified by importing this file. It is
 * a read-only inventory rendered by `/outline` Section 18 and consumed by
 * the Pass 2 revamp slices (A, B, C, D).
 *
 * Updated: post-Phase-11 close-out.
 */

export type Classification =
  | "canonical"
  | "compatibility"
  | "redirecting"
  | "lingering-duplicate"
  | "stale-harmless"
  | "harmful-remove";

export type Action = "keep" | "refactor" | "demote" | "redirect" | "delete";
export type Slice = "A" | "B" | "C" | "D" | "none";
export type Risk = "low" | "med" | "high";
export type Scope =
  | "marketing"
  | "auth"
  | "org-admin"
  | "workspace"
  | "compat"
  | "superadmin";

export type SurfaceRow = {
  route: string;
  scope: Scope;
  file: string;
  currentTitle: string;
  canonicalName: string;
  classification: Classification;
  action: Action;
  slice: Slice;
  risk: Risk;
  notes?: string;
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 1. Full surface inventory                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export const SURFACE_INVENTORY: SurfaceRow[] = [
  /* ── Public marketing ──────────────────────────────────────────────────── */
  { route: "/", scope: "marketing", file: "src/pages/LandingPage.tsx", currentTitle: "Fabric59 — Five9-Native Control Plane & Legal-Intake Bridge", canonicalName: "Home", classification: "canonical", action: "refactor", slice: "A", risk: "med",
    notes: "Hero/positioning still vendor-first (Five9 + legal). Should read as canonical multi-tenant operational-intelligence platform. 'Coming soon' claims need re-validation." },
  { route: "/solutions", scope: "marketing", file: "src/pages/marketing/SolutionsPage.tsx", currentTitle: "Solutions", canonicalName: "Solutions", classification: "canonical", action: "keep", slice: "A", risk: "low" },
  { route: "/personas", scope: "marketing", file: "src/pages/marketing/PersonasPage.tsx", currentTitle: "Personas", canonicalName: "Personas", classification: "canonical", action: "keep", slice: "A", risk: "low" },
  { route: "/pricing", scope: "marketing", file: "src/pages/marketing/PricingPage.tsx", currentTitle: "Pricing", canonicalName: "Pricing", classification: "canonical", action: "keep", slice: "A", risk: "low" },
  { route: "/integrations", scope: "marketing", file: "src/pages/marketing/IntegrationsIndexPage.tsx", currentTitle: "Integrations", canonicalName: "Integrations", classification: "canonical", action: "keep", slice: "A", risk: "low" },
  { route: "/customers", scope: "marketing", file: "src/pages/marketing/CustomersPage.tsx", currentTitle: "Customers", canonicalName: "Customers", classification: "canonical", action: "keep", slice: "A", risk: "low" },
  { route: "/trust", scope: "marketing", file: "src/pages/TrustPage.tsx", currentTitle: "Trust", canonicalName: "Trust", classification: "canonical", action: "keep", slice: "none", risk: "low", notes: "Out of revamp scope; copy authoritative." },
  { route: "/security", scope: "marketing", file: "src/pages/SecurityPage.tsx", currentTitle: "Security", canonicalName: "Security", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/privacy", scope: "marketing", file: "src/pages/PrivacyPage.tsx", currentTitle: "Privacy", canonicalName: "Privacy", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/terms", scope: "marketing", file: "src/pages/TermsPage.tsx", currentTitle: "Terms", canonicalName: "Terms", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/responsible-disclosure", scope: "marketing", file: "src/pages/ResponsibleDisclosurePage.tsx", currentTitle: "Responsible Disclosure", canonicalName: "Responsible Disclosure", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/contact", scope: "marketing", file: "src/pages/ContactPage.tsx", currentTitle: "Contact", canonicalName: "Contact", classification: "canonical", action: "keep", slice: "A", risk: "low", notes: "Primary CTA path. Should accept ?intent=demo from Slice A demo redirect." },
  { route: "/product", scope: "marketing", file: "src/pages/ProductTourPage.tsx", currentTitle: "Product tour", canonicalName: "Product Overview", classification: "compatibility", action: "refactor", slice: "A", risk: "med",
    notes: "Slice A: refactor into the canonical product overview page organized by IA categories." },
  { route: "/demo", scope: "marketing", file: "src/pages/DemoSandboxPage.tsx", currentTitle: "Demo sandbox", canonicalName: "(retired)", classification: "harmful-remove", action: "redirect", slice: "A", risk: "med",
    notes: "Slice A: replace body with redirect to /contact?intent=demo. Remove from footer/mobile nav." },
  { route: "/faq", scope: "marketing", file: "src/pages/FaqPage.tsx", currentTitle: "FAQ", canonicalName: "(retired)", classification: "harmful-remove", action: "redirect", slice: "A", risk: "med",
    notes: "Slice A: fold useful Q&A into /trust + /contact, redirect /faq to /contact#faq." },

  /* ── Auth + onboarding ─────────────────────────────────────────────────── */
  { route: "/login", scope: "auth", file: "src/pages/auth/LoginPage.tsx", currentTitle: "Sign In", canonicalName: "Sign In", classification: "canonical", action: "keep", slice: "A", risk: "low", notes: "Verify CTA label parity with header (currently 'Sign In')." },
  { route: "/signup", scope: "auth", file: "src/pages/auth/SignupPage.tsx", currentTitle: "Sign Up", canonicalName: "Sign Up", classification: "canonical", action: "keep", slice: "A", risk: "low" },
  { route: "/forgot-password", scope: "auth", file: "src/pages/auth/ForgotPasswordPage.tsx", currentTitle: "Forgot Password", canonicalName: "Forgot Password", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/reset-password", scope: "auth", file: "src/pages/auth/ResetPasswordPage.tsx", currentTitle: "Reset Password", canonicalName: "Reset Password", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/system-access", scope: "auth", file: "src/pages/auth/SystemAccessPage.tsx", currentTitle: "System Access", canonicalName: "System Access", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/accept-invite", scope: "auth", file: "src/pages/auth/AcceptInvitePage.tsx", currentTitle: "Accept Invite", canonicalName: "Accept Invite", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/onboarding", scope: "auth", file: "src/pages/onboarding/OnboardingPage.tsx", currentTitle: "Onboarding", canonicalName: "Onboarding", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/onboarding/workspace", scope: "auth", file: "src/pages/onboarding/WorkspaceBootstrapPage.tsx", currentTitle: "Workspace Bootstrap", canonicalName: "Workspace Bootstrap", classification: "canonical", action: "keep", slice: "none", risk: "low" },

  /* ── Org admin (canonical 7 in GLOBAL_SECTIONS) ────────────────────────── */
  { route: "/admin", scope: "org-admin", file: "src/pages/admin/OverviewPage.tsx → UserDashboardPage.tsx", currentTitle: "Command Center / org name", canonicalName: "Organization Overview", classification: "canonical", action: "refactor", slice: "B", risk: "high",
    notes: "h1 reads 'Command Center' as fallback — pre-canonical IA. Slice B: rename 'Organization Overview', reorder modules, audit QuickActionsGrid destinations." },
  { route: "/admin/workspaces", scope: "org-admin", file: "src/pages/admin/WorkspacesPage.tsx", currentTitle: "Workspaces", canonicalName: "Workspaces", classification: "canonical", action: "keep", slice: "B", risk: "low" },
  { route: "/admin/workspaces/:id", scope: "org-admin", file: "src/pages/admin/WorkspaceDetailPage.tsx", currentTitle: "Workspace Detail", canonicalName: "Workspace Detail", classification: "canonical", action: "keep", slice: "B", risk: "low" },
  { route: "/admin/connectors", scope: "org-admin", file: "src/pages/admin/ConnectorsCatalogPage.tsx", currentTitle: "Connectors", canonicalName: "Connectors", classification: "canonical", action: "keep", slice: "B", risk: "low", notes: "Single canonical org-level integrations catalog (Phase D)." },
  { route: "/admin/connectors/:slug", scope: "org-admin", file: "src/pages/admin/ConnectorInstancePage.tsx", currentTitle: "Connector Instance", canonicalName: "Connector Instance", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/reports", scope: "org-admin", file: "src/pages/admin/ReportsPage.tsx", currentTitle: "Reports", canonicalName: "Reports", classification: "canonical", action: "keep", slice: "B", risk: "low" },
  { route: "/admin/notifications", scope: "org-admin", file: "src/pages/admin/NotificationsPage.tsx", currentTitle: "Notifications", canonicalName: "Notifications", classification: "canonical", action: "keep", slice: "B", risk: "low" },
  { route: "/admin/settings", scope: "org-admin", file: "src/pages/admin/SettingsPage.tsx", currentTitle: "Settings", canonicalName: "Settings", classification: "canonical", action: "keep", slice: "B", risk: "low" },
  { route: "/admin/billing", scope: "org-admin", file: "src/pages/admin/BillingPage.tsx", currentTitle: "Billing", canonicalName: "Billing", classification: "canonical", action: "keep", slice: "B", risk: "low" },

  /* ── Org admin: deep-link reachable but NOT in primary nav ─────────────── */
  { route: "/admin/clients", scope: "org-admin", file: "src/pages/admin/ClientsPage.tsx", currentTitle: "Clients", canonicalName: "Clients", classification: "compatibility", action: "demote", slice: "B", risk: "med",
    notes: "Re-export of TenantsPage. Org-level Clients is workspace-scoped now; keep route as compat for direct links." },
  { route: "/admin/clients/:id", scope: "org-admin", file: "src/pages/admin/ClientOverviewPage.tsx", currentTitle: "Client Overview", canonicalName: "Client Overview", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/clients/:id/workspace", scope: "org-admin", file: "src/pages/admin/ClientWorkspacePage.tsx", currentTitle: "Client Workspace", canonicalName: "Client Workspace", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/clients/:clientId/legal-connect", scope: "org-admin", file: "src/pages/admin/ClientLegalConnectPage.tsx", currentTitle: "Client Legal Connect", canonicalName: "Client Legal Connect", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/clients/:clientId/five9-overlay", scope: "org-admin", file: "src/pages/admin/CampaignOverlayListPage.tsx", currentTitle: "Five9 Overlay", canonicalName: "Five9 Overlay", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/clients/:clientId/five9-overlay/campaigns/:campaignRouteId", scope: "org-admin", file: "src/pages/admin/CampaignOverlayPage.tsx", currentTitle: "Campaign Overlay", canonicalName: "Campaign Overlay", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/five9", scope: "org-admin", file: "src/pages/admin/Five9Page.tsx", currentTitle: "Five9", canonicalName: "Five9 (connector instance)", classification: "lingering-duplicate", action: "demote", slice: "B", risk: "high",
    notes: "Still surfaced as a sub-tab under Connectors. Slice B: remove sub-tab, treat as a Connector instance card under /admin/connectors." },
  { route: "/admin/five9/campaign-builder", scope: "org-admin", file: "src/pages/admin/CampaignBuilderPage.tsx", currentTitle: "Five9 Campaign Builder", canonicalName: "(deprecated)", classification: "lingering-duplicate", action: "delete", slice: "D", risk: "med",
    notes: "Phase B chose CampaignIntakePage as canonical. Builder file vault + delete in Slice D." },
  { route: "/admin/five9/campaign-builder/:draftId", scope: "org-admin", file: "src/pages/admin/CampaignBuilderPage.tsx", currentTitle: "Five9 Campaign Builder", canonicalName: "(deprecated)", classification: "lingering-duplicate", action: "delete", slice: "D", risk: "med" },
  { route: "/admin/legal-connect", scope: "org-admin", file: "src/pages/admin/LegalConnectPage.tsx", currentTitle: "Legal Connect", canonicalName: "Legal Connect", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/legal-connect/overview", scope: "org-admin", file: "src/pages/admin/LegalConnectOverviewPage.tsx", currentTitle: "Legal Connect Overview", canonicalName: "Legal Connect Overview", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/campaigns", scope: "org-admin", file: "src/pages/admin/CampaignsPage.tsx", currentTitle: "Campaigns", canonicalName: "Campaigns", classification: "canonical", action: "keep", slice: "none", risk: "low", notes: "Single canonical campaigns list (Phase B)." },
  { route: "/admin/campaigns/new", scope: "org-admin", file: "src/pages/admin/CampaignIntakePage.tsx", currentTitle: "New Campaign", canonicalName: "New Campaign", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/campaigns/:id", scope: "org-admin", file: "src/pages/admin/CampaignDetailPage.tsx", currentTitle: "Campaign Detail", canonicalName: "Campaign Detail", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/campaigns/edit/:id", scope: "org-admin", file: "src/pages/admin/CampaignIntakePage.tsx", currentTitle: "Edit Campaign", canonicalName: "Edit Campaign", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/campaigns/readiness", scope: "org-admin", file: "src/pages/admin/CampaignReadinessBoardPage.tsx", currentTitle: "Campaign Readiness", canonicalName: "Campaign Readiness", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/campaigns/event-log", scope: "org-admin", file: "src/pages/admin/CampaignEventLogPage.tsx", currentTitle: "Campaign Event Log", canonicalName: "Campaign Event Log", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/scripts", scope: "org-admin", file: "src/pages/admin/ScriptEditorPage.tsx", currentTitle: "Scripts", canonicalName: "Guides", classification: "canonical", action: "refactor", slice: "C", risk: "med", notes: "Canonical builder-set entry (Phase C). Label rename 'Scripts → Guides' per CANONICAL_TERMS deferred to Slice C." },
  { route: "/admin/scripts/:id", scope: "org-admin", file: "src/pages/admin/ScriptEditorPage.tsx", currentTitle: "Script Editor", canonicalName: "Guide Editor", classification: "canonical", action: "refactor", slice: "C", risk: "med" },
  { route: "/admin/scripts/:scriptId/builder", scope: "org-admin", file: "src/pages/admin/ScriptBuilderPage.tsx", currentTitle: "Script Builder", canonicalName: "Guide Builder", classification: "canonical", action: "refactor", slice: "C", risk: "med" },
  { route: "/admin/flows", scope: "org-admin", file: "src/pages/admin/FlowsPage.tsx", currentTitle: "Flows", canonicalName: "Flows", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/flows/new", scope: "org-admin", file: "src/pages/admin/NewFlowPage.tsx", currentTitle: "New Flow", canonicalName: "New Flow", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/flows/:id", scope: "org-admin", file: "src/pages/admin/FlowBuilderPage.tsx", currentTitle: "Flow Builder", canonicalName: "Flow Builder", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/mappings", scope: "org-admin", file: "src/pages/admin/MappingsPage.tsx", currentTitle: "Mappings", canonicalName: "Mappings", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/mappings/builder", scope: "org-admin", file: "src/pages/admin/MappingBuilderPage.tsx", currentTitle: "Mapping Builder", canonicalName: "Mapping Builder", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/mappings/builder/:id", scope: "org-admin", file: "src/pages/admin/MappingBuilderPage.tsx", currentTitle: "Mapping Builder", canonicalName: "Mapping Builder", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/templates", scope: "org-admin", file: "src/pages/admin/TemplatesPage.tsx", currentTitle: "Templates", canonicalName: "Templates", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/templates/:id", scope: "org-admin", file: "src/pages/admin/TemplateDetailPage.tsx", currentTitle: "Template Detail", canonicalName: "Template Detail", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/qa", scope: "org-admin", file: "src/pages/admin/QAAnalyticsPage.tsx", currentTitle: "QA Analytics", canonicalName: "QA", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/logs", scope: "org-admin", file: "src/pages/admin/ApiLogsPage.tsx", currentTitle: "API Logs", canonicalName: "API Logs", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/domains", scope: "org-admin", file: "src/pages/admin/DomainsPage.tsx", currentTitle: "Domains", canonicalName: "Domains", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/domains/:id", scope: "org-admin", file: "src/pages/admin/DomainDetailPage.tsx", currentTitle: "Domain Detail", canonicalName: "Domain Detail", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/agents", scope: "org-admin", file: "src/pages/admin/AgentsPage.tsx", currentTitle: "Agents", canonicalName: "Agents", classification: "stale-harmless", action: "demote", slice: "B", risk: "med", notes: "Org-level agents page; canonical home is /app/workspaces/:id/agents." },
  { route: "/admin/agent-dashboard", scope: "org-admin", file: "src/pages/admin/AgentDashboardPage.tsx", currentTitle: "Agent Dashboard", canonicalName: "Agent Dashboard", classification: "stale-harmless", action: "demote", slice: "B", risk: "med" },
  { route: "/admin/supervisor", scope: "org-admin", file: "src/pages/admin/SupervisorPage.tsx", currentTitle: "Supervisor", canonicalName: "Supervisor", classification: "stale-harmless", action: "demote", slice: "B", risk: "med" },
  { route: "/admin/dispositions", scope: "org-admin", file: "src/pages/admin/DispositionsPage.tsx", currentTitle: "Dispositions", canonicalName: "Dispositions", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/automations", scope: "org-admin", file: "src/pages/admin/PostCallAutomationsPage.tsx", currentTitle: "Post-Call Automations", canonicalName: "Post-Call Automations", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/ani-blocklist", scope: "org-admin", file: "src/pages/admin/ANIBlockListPage.tsx", currentTitle: "ANI Block List", canonicalName: "ANI Block List", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/callback-queue", scope: "org-admin", file: "src/pages/admin/CallbackQueuePage.tsx", currentTitle: "Callback Queue", canonicalName: "Callback Queue", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/abandon-rate", scope: "org-admin", file: "src/pages/admin/AbandonRatePage.tsx", currentTitle: "Abandon Rate", canonicalName: "Abandon Rate", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/data-plane", scope: "org-admin", file: "src/pages/admin/DataPlanePage.tsx", currentTitle: "Data Plane", canonicalName: "Data Plane", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/identity", scope: "org-admin", file: "src/pages/admin/IdentityResolutionPage.tsx", currentTitle: "Identity Resolution", canonicalName: "Identity Resolution", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/utilities", scope: "org-admin", file: "src/pages/admin/PlatformUtilitiesPage.tsx", currentTitle: "Platform Utilities", canonicalName: "Platform Utilities", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/goals", scope: "org-admin", file: "src/pages/admin/GoalsPage.tsx", currentTitle: "Goals", canonicalName: "Goals", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/summary-templates", scope: "org-admin", file: "src/pages/admin/CallSummaryTemplatesPage.tsx", currentTitle: "Call Summary Templates", canonicalName: "Call Summary Templates", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/email-templates", scope: "org-admin", file: "src/pages/admin/EmailTemplatesPage.tsx", currentTitle: "Email Templates", canonicalName: "Email Templates", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/qr-routing", scope: "org-admin", file: "src/pages/admin/QrRoutingPage.tsx", currentTitle: "QR Routing", canonicalName: "QR Routing", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/kb", scope: "org-admin", file: "src/pages/admin/KnowledgeBasePage.tsx", currentTitle: "Knowledge Base", canonicalName: "Knowledge Base", classification: "stale-harmless", action: "demote", slice: "B", risk: "low", notes: "Canonical lives at workspace scope." },
  { route: "/admin/training", scope: "org-admin", file: "src/pages/admin/TrainingPage.tsx", currentTitle: "Training", canonicalName: "Training", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/feedback", scope: "org-admin", file: "src/pages/admin/FeedbackPage.tsx", currentTitle: "Feedback", canonicalName: "Feedback", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/monitoring", scope: "org-admin", file: "src/pages/admin/MonitoringHubPage.tsx", currentTitle: "Monitoring", canonicalName: "Monitoring", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/testing", scope: "org-admin", file: "src/pages/admin/TestingHubPage.tsx", currentTitle: "Testing", canonicalName: "Testing", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/docs", scope: "org-admin", file: "src/pages/admin/DocsHubPage.tsx", currentTitle: "Docs", canonicalName: "Docs", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/test", scope: "org-admin", file: "src/pages/admin/TestConsolePage.tsx", currentTitle: "Test Console", canonicalName: "Test Console", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/design-system", scope: "org-admin", file: "src/pages/admin/DesignSystemPage.tsx", currentTitle: "Design System", canonicalName: "Design System", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/profile", scope: "org-admin", file: "src/pages/admin/ProfilePage.tsx", currentTitle: "Profile", canonicalName: "Profile", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/partners", scope: "org-admin", file: "src/pages/admin/PartnersPage.tsx", currentTitle: "Partners", canonicalName: "Partners", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/partners/:id", scope: "org-admin", file: "src/pages/admin/PartnerOverviewPage.tsx", currentTitle: "Partner Overview", canonicalName: "Partner Overview", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/deployments", scope: "org-admin", file: "src/pages/admin/DeploymentsPage.tsx", currentTitle: "Deployments", canonicalName: "Deployments", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/deployments/:id", scope: "org-admin", file: "src/pages/admin/DeploymentDetailPage.tsx", currentTitle: "Deployment Detail", canonicalName: "Deployment Detail", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/runs", scope: "org-admin", file: "src/pages/admin/RunsPage.tsx", currentTitle: "Runs", canonicalName: "Runs", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/runs/:id", scope: "org-admin", file: "src/pages/admin/RunDetailPage.tsx", currentTitle: "Run Detail", canonicalName: "Run Detail", classification: "stale-harmless", action: "keep", slice: "none", risk: "low" },

  /* ── Workspace product (canonical 15 in WORKSPACE_SECTIONS) ────────────── */
  { route: "/app/workspaces", scope: "workspace", file: "src/pages/workspace/WorkspacesIndexPage.tsx", currentTitle: "Workspaces", canonicalName: "Workspaces Index", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/app/workspaces/:id", scope: "workspace", file: "src/pages/workspace/WorkspaceHomePage.tsx", currentTitle: "Workspace Home", canonicalName: "Workspace Home", classification: "canonical", action: "refactor", slice: "C", risk: "med", notes: "Slice C: real KPIs, canonical CTA destinations." },
  { route: "/app/workspaces/:id/clients", scope: "workspace", file: "src/pages/workspace/WorkspaceClientsPage.tsx", currentTitle: "Clients", canonicalName: "Clients", classification: "canonical", action: "keep", slice: "C", risk: "low" },
  { route: "/app/workspaces/:id/campaigns", scope: "workspace", file: "src/pages/workspace/WorkspaceCampaignsPage.tsx", currentTitle: "Campaigns", canonicalName: "Campaigns", classification: "canonical", action: "keep", slice: "C", risk: "low" },
  { route: "/app/workspaces/:id/campaigns/new", scope: "workspace", file: "src/pages/workspace/WorkspaceCampaignNewPage.tsx", currentTitle: "(redirect)", canonicalName: "New Campaign", classification: "redirecting", action: "keep", slice: "none", risk: "low", notes: "Redirects to /admin/campaigns/new (Phase 3 decision)." },
  { route: "/app/workspaces/:id/campaigns/:campaignId", scope: "workspace", file: "src/pages/workspace/WorkspaceCampaignDetailPage.tsx", currentTitle: "Campaign Detail", canonicalName: "Campaign Detail", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/app/workspaces/:id/guides", scope: "workspace", file: "src/pages/workspace/WorkspaceGuidesPage.tsx", currentTitle: "Guides", canonicalName: "Guides", classification: "canonical", action: "keep", slice: "C", risk: "low" },
  { route: "/app/workspaces/:id/guides/new", scope: "workspace", file: "src/pages/workspace/WorkspaceGuideNewPage.tsx", currentTitle: "New Guide", canonicalName: "New Guide", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/app/workspaces/:id/guides/:guideId", scope: "workspace", file: "src/pages/workspace/WorkspaceGuideDetailPage.tsx", currentTitle: "Guide Detail", canonicalName: "Guide Detail", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/app/workspaces/:id/guides/:guideId/edit", scope: "workspace", file: "src/pages/workspace/WorkspaceGuideEditPage.tsx", currentTitle: "Edit Guide", canonicalName: "Edit Guide", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/app/workspaces/:id/guides/:guideId/preview", scope: "workspace", file: "src/pages/workspace/WorkspaceGuidePreviewPage.tsx", currentTitle: "Guide Preview", canonicalName: "Guide Preview", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/app/workspaces/:id/forms", scope: "workspace", file: "WorkspaceSectionPlaceholder", currentTitle: "Forms (placeholder)", canonicalName: "Forms", classification: "stale-harmless", action: "demote", slice: "C", risk: "med",
    notes: "Placeholder only — Slice C: hide from secondary nav until Phase 5 ships, keep route as compat." },
  { route: "/app/workspaces/:id/templates", scope: "workspace", file: "src/pages/workspace/WorkspaceTemplatesPage.tsx", currentTitle: "Templates", canonicalName: "Templates", classification: "canonical", action: "keep", slice: "C", risk: "low" },
  { route: "/app/workspaces/:id/templates/:templateId", scope: "workspace", file: "src/pages/workspace/WorkspaceTemplateDetailPage.tsx", currentTitle: "Template Detail", canonicalName: "Template Detail", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/app/workspaces/:id/runs", scope: "workspace", file: "src/pages/admin/RunsPage.tsx (shared)", currentTitle: "Runs", canonicalName: "Runs", classification: "compatibility", action: "refactor", slice: "C", risk: "med",
    notes: "Reuses org-level page; needs workspace-scoped binding in Slice C or demote." },
  { route: "/app/workspaces/:id/agents", scope: "workspace", file: "src/pages/admin/AgentsPage.tsx (shared)", currentTitle: "Agents", canonicalName: "Agents", classification: "compatibility", action: "refactor", slice: "C", risk: "med" },
  { route: "/app/workspaces/:id/supervisor", scope: "workspace", file: "src/pages/admin/SupervisorPage.tsx (shared)", currentTitle: "Supervisor", canonicalName: "Supervisor", classification: "compatibility", action: "refactor", slice: "C", risk: "med" },
  { route: "/app/workspaces/:id/qa", scope: "workspace", file: "src/pages/workspace/WorkspaceQaPage.tsx", currentTitle: "QA", canonicalName: "QA", classification: "canonical", action: "keep", slice: "C", risk: "low" },
  { route: "/app/workspaces/:id/analytics", scope: "workspace", file: "src/pages/workspace/WorkspaceAnalyticsPage.tsx", currentTitle: "Analytics", canonicalName: "Analytics", classification: "canonical", action: "keep", slice: "C", risk: "low" },
  { route: "/app/workspaces/:id/billing", scope: "workspace", file: "src/pages/workspace/WorkspaceBillingPage.tsx", currentTitle: "Billing", canonicalName: "Billing", classification: "canonical", action: "keep", slice: "C", risk: "low" },
  { route: "/app/workspaces/:id/integrations", scope: "workspace", file: "src/pages/workspace/WorkspaceIntegrationsPage.tsx", currentTitle: "Integrations", canonicalName: "Integrations", classification: "canonical", action: "keep", slice: "C", risk: "low" },
  { route: "/app/workspaces/:id/integrations/:connectionId", scope: "workspace", file: "src/pages/workspace/WorkspaceIntegrationDetailPage.tsx", currentTitle: "Integration Detail", canonicalName: "Integration Detail", classification: "canonical", action: "keep", slice: "none", risk: "low" },
  { route: "/app/workspaces/:id/knowledge", scope: "workspace", file: "src/pages/workspace/WorkspaceKnowledgePage.tsx", currentTitle: "Knowledge", canonicalName: "Knowledge", classification: "canonical", action: "keep", slice: "C", risk: "low" },
  { route: "/app/workspaces/:id/assistant", scope: "workspace", file: "src/pages/workspace/WorkspaceAssistantPage.tsx", currentTitle: "Assistant", canonicalName: "Assistant", classification: "canonical", action: "keep", slice: "C", risk: "low" },
  { route: "/app/workspaces/:id/settings", scope: "workspace", file: "src/pages/admin/SettingsPage.tsx (shared)", currentTitle: "Settings", canonicalName: "Settings", classification: "compatibility", action: "refactor", slice: "C", risk: "med" },

  /* ── Compatibility / legacy still routable ─────────────────────────────── */
  { route: "/dashboard", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/dashboard", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/integrations", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin/connectors)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "D", risk: "low" },
  { route: "/admin/scripter", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin/scripts)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "D", risk: "low" },
  { route: "/admin/scriptflow", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin/scripts)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "D", risk: "low" },
  { route: "/admin/tree-editor", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin/scripts)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "D", risk: "low" },
  { route: "/admin/call-flow", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin/flows)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "D", risk: "low" },
  { route: "/admin/campaign-blueprints", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin/templates)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "D", risk: "low" },
  { route: "/admin/campaigns/overview", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin/campaigns)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "D", risk: "low" },
  { route: "/admin/campaigns/drafts", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin/campaigns?status=draft)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "D", risk: "low" },
  { route: "/admin/campaigns/archived", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin/campaigns?status=archived)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "D", risk: "low" },
  { route: "/admin/tenants", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin/clients)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "D", risk: "low" },
  { route: "/admin/five9/legacy", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /admin/five9)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "D", risk: "low" },
  { route: "/admin/tree-editor/:scriptId", scope: "compat", file: "src/pages/admin/TreeEditorPage.tsx", currentTitle: "Tree Editor", canonicalName: "(deep-link compat)", classification: "compatibility", action: "demote", slice: "D", risk: "med", notes: "Keep reachable for direct links; banner + remove from any UI entry point." },
  { route: "/admin/script-routing", scope: "compat", file: "src/pages/admin/ScriptRoutingPage.tsx", currentTitle: "Script Routing", canonicalName: "(deep-link compat)", classification: "compatibility", action: "demote", slice: "D", risk: "med" },
  { route: "/app/workspaces/:id/integrations-legacy", scope: "compat", file: "src/pages/admin/ConnectorsCatalogPage.tsx (shared)", currentTitle: "Integrations (legacy)", canonicalName: "(deep-link compat)", classification: "compatibility", action: "demote", slice: "D", risk: "med" },
  { route: "/app/workspaces/:id/qa-legacy", scope: "compat", file: "src/pages/admin/QAAnalyticsPage.tsx (shared)", currentTitle: "QA (legacy)", canonicalName: "(deep-link compat)", classification: "compatibility", action: "demote", slice: "D", risk: "med" },
  { route: "/app/workspaces/:id/analytics-legacy", scope: "compat", file: "src/pages/admin/ReportsPage.tsx (shared)", currentTitle: "Analytics (legacy)", canonicalName: "(deep-link compat)", classification: "compatibility", action: "demote", slice: "D", risk: "med" },
  { route: "/admin/dev-guide", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /superadmin/dev-guide)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "none", risk: "low" },
  { route: "/admin/settings/dev-guide", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /superadmin/dev-guide)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "none", risk: "low" },
  { route: "/master", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirect → /superadmin)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "none", risk: "low" },
  { route: "/vault, /feature-vault, /five9, /domains, /five9-domains, /legal-connect, /settings, /onboarding/legal-connect, /call-flow", scope: "compat", file: "App.tsx <Navigate />", currentTitle: "(redirects)", canonicalName: "(retired)", classification: "redirecting", action: "keep", slice: "none", risk: "low" },

  /* ── Superadmin (out of revamp scope) ──────────────────────────────────── */
  { route: "/superadmin/*", scope: "superadmin", file: "src/pages/superadmin/*", currentTitle: "Superadmin", canonicalName: "Superadmin", classification: "canonical", action: "keep", slice: "none", risk: "low", notes: "Internal master-admin tooling; not in revamp scope." },
  { route: "/outline", scope: "superadmin", file: "src/pages/OutlinePage.tsx", currentTitle: "Outline (gated)", canonicalName: "Outline", classification: "canonical", action: "keep", slice: "none", risk: "low" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* 2. Lingering items matrix                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export type LingeringItem = {
  id: string;
  area: "marketing" | "org-admin" | "workspace" | "shell" | "files";
  item: string;
  evidence: string;
  impact: "blocking" | "high" | "med" | "low";
  slice: Slice;
  resolution: string;
};

export const LINGERING_ITEMS: LingeringItem[] = [
  { id: "L-01", area: "shell", item: "MegaMenuHeader Platform mega-menu lists 11 vendor-feature items, not canonical IA",
    evidence: "src/components/marketing/MegaMenuHeader.tsx — platformItems array with Five9 SOAP, Multi-domain Five9, Field Mapping, Decision-tree script builder, etc., all linked to fragile /#anchor hrefs.",
    impact: "high", slice: "A",
    resolution: "Rebuild Platform menu around canonical IA categories (Workspaces, Campaigns, Guides, Integrations, Analytics, QA). Move feature inventory into refactored /product." },
  { id: "L-02", area: "shell", item: "MegaFooter Platform column duplicates the same vendor-feature list",
    evidence: "src/components/marketing/MegaFooter.tsx — platformLinks array hrefs (/#available-now, /#legal-connect, /#security) tie footer to landing-page anchors.",
    impact: "high", slice: "A",
    resolution: "Replace with canonical IA category links + 'Built on' sub-list. Remove anchor-based hrefs." },
  { id: "L-03", area: "marketing", item: "/product, /demo, /faq still surfaced in mobile menu and footer",
    evidence: "MegaMenuHeader mobile sheet + MegaFooter companyLinks include FAQ.",
    impact: "med", slice: "A",
    resolution: "Demote /demo and /faq to redirects; keep /product as the refactored canonical product overview." },
  { id: "L-04", area: "marketing", item: "LandingPage 'Coming soon' claims may be stale",
    evidence: "src/pages/LandingPage.tsx lines 75–81: Clio activation, AI Call Flow export, Disposition email writebacks, Google Workspace provisioning, Self-serve billing.",
    impact: "med", slice: "A",
    resolution: "Re-validate each claim against current product state; remove or update wording in Slice A." },
  { id: "L-05", area: "marketing", item: "Hero positioning is vendor-specific (Five9 + legal) rather than canonical platform",
    evidence: "LandingPage SEOHead title 'Fabric59 — Five9-Native Control Plane & Legal-Intake Bridge' + footer mission line.",
    impact: "med", slice: "A",
    resolution: "Reposition as multi-tenant operational-intelligence platform with Five9 + Legal Connect as reference verticals." },
  { id: "L-06", area: "org-admin", item: "/admin overview h1 reads 'Command Center' / org-name fallback",
    evidence: "src/pages/admin/UserDashboardPage.tsx line 39: 'organization?.name || \"Command Center\"'.",
    impact: "high", slice: "B",
    resolution: "Rename to 'Organization Overview', use org name as supporting line." },
  { id: "L-07", area: "org-admin", item: "GLOBAL_SECTIONS.connectors.subNav surfaces 'Five9' as a peer of 'Catalog'",
    evidence: "src/config/navigation.ts lines 57–62.",
    impact: "high", slice: "B",
    resolution: "Remove Five9 sub-tab; surface as a Connector instance card inside /admin/connectors." },
  { id: "L-08", area: "org-admin", item: "AdminShell header buttons use vendor-specific labels",
    evidence: "src/components/layout/AdminShell.tsx — 'Five9 Docs' button + 'AI Guide' button.",
    impact: "med", slice: "B",
    resolution: "Rename to 'Docs' and 'Assistant' for terminology parity with WORKSPACE_SECTIONS." },
  { id: "L-09", area: "org-admin", item: "AdvancedRoutesPage labels 11 canonical surfaces as 'Archived'",
    evidence: "src/pages/superadmin/AdvancedRoutesPage.tsx — 'Archived — Scripts & call flow', 'Archived — Operations'.",
    impact: "med", slice: "D",
    resolution: "Re-classify groups against SURFACE_INVENTORY; rename 'Archived' to 'Compatibility' or 'Deep-link only'." },
  { id: "L-10", area: "workspace", item: "WORKSPACE_SECTIONS.forms entry has no real implementation",
    evidence: "App.tsx forms route renders WorkspaceSectionPlaceholder.",
    impact: "med", slice: "C",
    resolution: "Hide Forms tab from secondary nav until Phase 5 ships; keep route as compat." },
  { id: "L-11", area: "shell", item: "WorkspaceShell back-link labelled 'Org admin' is non-canonical",
    evidence: "src/components/layout/WorkspaceShell.tsx line 98.",
    impact: "low", slice: "C",
    resolution: "Relabel to 'Organization' or org name." },
  { id: "L-12", area: "files", item: "Orphaned legacy page files still on disk after Phase 11 redirects",
    evidence: "Files reachable only via redirect or unreachable: ScripterPage, ScriptFlowHubPage, CallFlowBuilderPage, CallFlowPage, CampaignBlueprintsPage, CampaignsOverviewPage, CampaignDraftsPage, ArchivedCampaignsPage, IntegrationsPage, CampaignBuilderPage.",
    impact: "low", slice: "D",
    resolution: "Vault then delete after grace window; verify no remaining imports first." },
  { id: "L-13", area: "workspace", item: "Workspace Runs / Agents / Supervisor / Settings reuse org-level pages without workspace scoping",
    evidence: "App.tsx routes 408–410, 432 reuse RunsPage, AgentsPage, SupervisorPage, SettingsPage.",
    impact: "med", slice: "C",
    resolution: "Slice C: rebind to workspace context, or add workspace banner + route guard." },
  { id: "L-14", area: "workspace", item: "WorkspaceHomePage lacks real KPIs; renders nav grid only",
    evidence: "src/pages/workspace/WorkspaceHomePage.tsx — 'Lightweight landing surface. Real metrics arrive in Phase 2B / Phase 3.'",
    impact: "med", slice: "C",
    resolution: "Slice C: add workspace KPIs strip, readiness card, recent activity; canonical CTA destinations." },
  { id: "L-15", area: "org-admin", item: "Org-level Agents/AgentDashboard/Supervisor pages reachable but workspace-canonical now",
    evidence: "/admin/agents, /admin/agent-dashboard, /admin/supervisor active routes.",
    impact: "med", slice: "B",
    resolution: "Slice B: add 'compat — workspace canonical' banner + remove from any remaining org-level CTA." },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* 3. Copy / naming inconsistency matrix                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export type CopyInconsistency = {
  id: string;
  entity: string;
  variants: { label: string; where: string }[];
  canonical: string;
  slice: Slice;
};

export const COPY_INCONSISTENCIES: CopyInconsistency[] = [
  { id: "C-01", entity: "Org overview heading",
    variants: [
      { label: "Command Center", where: "UserDashboardPage h1 fallback" },
      { label: "Overview", where: "GLOBAL_SECTIONS.overview.label / sidebar" },
      { label: "Organization", where: "AdminShell breadcrumb" },
    ],
    canonical: "Organization Overview", slice: "B" },
  { id: "C-02", entity: "Sign-in CTA",
    variants: [
      { label: "Sign In", where: "MegaMenuHeader, AdminShell sign-out is 'Sign out'" },
      { label: "Sign in", where: "(per copy-writing rule for sentence case body — verify)" },
    ],
    canonical: "Sign In (button) / Sign in to Fabric59 (page title body)", slice: "A" },
  { id: "C-03", entity: "AI helper",
    variants: [
      { label: "AI Guide", where: "AdminShell header button" },
      { label: "Assistant", where: "WORKSPACE_SECTIONS / WorkspaceAssistantPage" },
    ],
    canonical: "Assistant", slice: "B" },
  { id: "C-04", entity: "Docs entry",
    variants: [
      { label: "Five9 Docs", where: "AdminShell header button" },
      { label: "Docs", where: "/admin/docs DocsHubPage" },
      { label: "Knowledge", where: "WORKSPACE_SECTIONS.knowledge" },
    ],
    canonical: "Docs (org); Knowledge (workspace)", slice: "B" },
  { id: "C-05", entity: "Tenant ↔ Client",
    variants: [
      { label: "Tenants", where: "/admin/tenants → redirects to /admin/clients; TenantsPage file" },
      { label: "Clients", where: "ClientsPage re-export, sidebar matches" },
    ],
    canonical: "Clients (per CANONICAL_TERMS)", slice: "B" },
  { id: "C-06", entity: "Scripts ↔ Guides",
    variants: [
      { label: "Scripts", where: "/admin/scripts ScriptEditorPage, ScriptBuilderPage filenames" },
      { label: "Guides", where: "WORKSPACE_SECTIONS.guides, /app/workspaces/:id/guides" },
    ],
    canonical: "Guides (per CANONICAL_TERMS — Phase 4 rename)", slice: "C" },
  { id: "C-07", entity: "Footer link casing",
    variants: [
      { label: "Product tour", where: "MegaFooter productLinks" },
      { label: "Solutions / Personas / Pricing", where: "MegaFooter productLinks" },
      { label: "Responsible Disclosure", where: "MegaFooter companyLinks (TitleCase)" },
    ],
    canonical: "TitleCase for nav items per copy-writing-rules memory", slice: "A" },
  { id: "C-08", entity: "Hero positioning",
    variants: [
      { label: "Five9-Native Control Plane & Legal-Intake Bridge", where: "LandingPage SEOHead" },
      { label: "Operational intelligence for service organizations", where: "(canonical positioning per master spec)" },
    ],
    canonical: "Multi-tenant operational intelligence platform", slice: "A" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* 4. CTA / navigation alignment matrix                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export type CtaRow = {
  id: string;
  cta: string;
  surface: string;
  destination: string;
  classification: "canonical" | "compat" | "dead" | "off-message";
  slice: Slice;
};

export const CTA_ALIGNMENT: CtaRow[] = [
  { id: "T-01", cta: "Request a walkthrough", surface: "MegaMenuHeader (desktop+mobile)", destination: "/contact", classification: "canonical", slice: "none" },
  { id: "T-02", cta: "Sign In", surface: "MegaMenuHeader", destination: "/login", classification: "canonical", slice: "none" },
  { id: "T-03", cta: "Full product tour", surface: "MegaMenuHeader Platform menu footer", destination: "/product", classification: "compat", slice: "A" },
  { id: "T-04", cta: "Roadmap →", surface: "MegaMenuHeader Platform menu", destination: "/#coming-soon", classification: "off-message", slice: "A", },
  { id: "T-05", cta: "Platform mega-menu items (×11)", surface: "MegaMenuHeader", destination: "/#available-now, /#legal-connect, /#security, /#coming-soon", classification: "off-message", slice: "A" },
  { id: "T-06", cta: "Footer Platform column (×8)", surface: "MegaFooter", destination: "/#available-now, /#legal-connect, /#security", classification: "off-message", slice: "A" },
  { id: "T-07", cta: "Footer FAQ link", surface: "MegaFooter companyLinks", destination: "/faq", classification: "compat", slice: "A" },
  { id: "T-08", cta: "Mobile menu Product tour / FAQ", surface: "MegaMenuHeader mobile sheet", destination: "/product, /faq", classification: "compat", slice: "A" },
  { id: "T-09", cta: "Org sidebar (canonical 7)", surface: "AdminShell", destination: "/admin, /admin/workspaces, /admin/connectors, /admin/reports, /admin/notifications, /admin/settings, /admin/billing", classification: "canonical", slice: "none" },
  { id: "T-10", cta: "Connectors sub-nav: 'Five9'", surface: "AdminShell SectionTabs", destination: "/admin/five9", classification: "off-message", slice: "B" },
  { id: "T-11", cta: "AdminShell 'Five9 Docs'", surface: "AdminShell header", destination: "Five9DocsPanel", classification: "off-message", slice: "B" },
  { id: "T-12", cta: "AdminShell 'AI Guide'", surface: "AdminShell header", destination: "GuidancePanel", classification: "off-message", slice: "B" },
  { id: "T-13", cta: "QuickActionsGrid", surface: "/admin overview", destination: "(audit per Slice B)", classification: "off-message", slice: "B" },
  { id: "T-14", cta: "Workspace back-link 'Org admin'", surface: "WorkspaceShell", destination: "/admin", classification: "off-message", slice: "C" },
  { id: "T-15", cta: "WorkspaceHomePage section cards (×14)", surface: "/app/workspaces/:id", destination: "WORKSPACE_SECTIONS hrefs", classification: "canonical", slice: "C" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* 5. Redirect / compatibility truth table                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export type RedirectRow = {
  id: string;
  from: string;
  to: string;
  kind: "permanent" | "grace-window" | "reconsider";
};

export const REDIRECT_TABLE: RedirectRow[] = [
  { id: "R-01", from: "/dashboard", to: "/admin", kind: "permanent" },
  { id: "R-02", from: "/admin/dashboard", to: "/admin", kind: "permanent" },
  { id: "R-03", from: "/admin/integrations", to: "/admin/connectors", kind: "grace-window" },
  { id: "R-04", from: "/admin/scripter", to: "/admin/scripts", kind: "grace-window" },
  { id: "R-05", from: "/admin/scriptflow", to: "/admin/scripts", kind: "grace-window" },
  { id: "R-06", from: "/admin/tree-editor", to: "/admin/scripts", kind: "grace-window" },
  { id: "R-07", from: "/admin/call-flow", to: "/admin/flows", kind: "grace-window" },
  { id: "R-08", from: "/admin/campaign-blueprints", to: "/admin/templates", kind: "grace-window" },
  { id: "R-09", from: "/admin/campaigns/overview", to: "/admin/campaigns", kind: "grace-window" },
  { id: "R-10", from: "/admin/campaigns/drafts", to: "/admin/campaigns?status=draft", kind: "grace-window" },
  { id: "R-11", from: "/admin/campaigns/archived", to: "/admin/campaigns?status=archived", kind: "grace-window" },
  { id: "R-12", from: "/admin/tenants", to: "/admin/clients", kind: "permanent" },
  { id: "R-13", from: "/admin/five9/legacy", to: "/admin/five9", kind: "grace-window" },
  { id: "R-14", from: "/master/*", to: "/superadmin/*", kind: "permanent" },
  { id: "R-15", from: "/admin/dev-guide", to: "/superadmin/dev-guide", kind: "permanent" },
  { id: "R-16", from: "/vault, /feature-vault", to: "/superadmin/vault", kind: "permanent" },
  { id: "R-17", from: "/five9, /domains, /five9-domains, /legal-connect, /settings, /call-flow, /onboarding/legal-connect", to: "/admin/* equivalents", kind: "permanent" },
  // Slice A — implemented:
  { id: "R-18", from: "/demo", to: "/contact?intent=demo", kind: "permanent" },
  { id: "R-19", from: "/faq", to: "/trust", kind: "permanent" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* 6. Slice sequence                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export const SLICE_SEQUENCE: { slice: Slice; name: string; touches: string[]; doesNotTouch: string[] }[] = [
  {
    slice: "A", name: "Marketing + public header/footer/CTA cleanup",
    touches: [
      "src/components/marketing/MegaMenuHeader.tsx — rebuild Platform menu, remove anchor-based hrefs, demote /product /demo /faq",
      "src/components/marketing/MegaFooter.tsx — replace Platform column with canonical IA, TitleCase normalize",
      "src/pages/LandingPage.tsx — re-validate Coming-soon claims, reposition hero",
      "src/pages/ProductTourPage.tsx — refactor into canonical product overview by IA category",
      "src/pages/DemoSandboxPage.tsx — replace body with redirect to /contact?intent=demo",
      "src/pages/FaqPage.tsx — fold into /trust + /contact, redirect /faq → /contact#faq",
      "src/pages/ContactPage.tsx — accept ?intent=demo and #faq anchors",
    ],
    doesNotTouch: ["/admin/*", "/app/workspaces/*", "shells", "any backend"],
  },
  {
    slice: "B", name: "Org admin cockpit restructure + org-level copy cleanup",
    touches: [
      "src/pages/admin/UserDashboardPage.tsx → rename heading 'Organization Overview', reorder modules",
      "src/components/dashboard/QuickActionsGrid.tsx — audit destinations against canonical 7",
      "src/components/layout/AdminShell.tsx — rename 'Five9 Docs' → 'Docs', 'AI Guide' → 'Assistant'",
      "src/config/navigation.ts — remove 'Five9' subNav from connectors; clean stale matches",
      "Org-level Agents / AgentDashboard / Supervisor / KB pages — add 'compat — workspace canonical' banner",
    ],
    doesNotTouch: ["marketing", "/app/workspaces/*", "any backend"],
  },
  {
    slice: "C", name: "Workspace shell + page-heading + breadcrumb + CTA cleanup",
    touches: [
      "src/components/layout/WorkspaceShell.tsx — relabel 'Org admin' back-link to 'Organization'",
      "src/config/navigation.ts WORKSPACE_SECTIONS — hide 'Forms' tab until Phase 5",
      "src/pages/workspace/WorkspaceHomePage.tsx — add KPIs, readiness card, canonical CTAs",
      "All workspace pages — TitleCase h1, sentence-case body, EmptyState + StatusBadge adoption",
      "Workspace Runs / Agents / Supervisor / Settings — workspace-scope binding or compat banner",
      "Rename 'Scripts → Guides' across /admin/scripts surfaces (Phase 4 deferred rename)",
    ],
    doesNotTouch: ["marketing", "/admin overview/cockpit", "any backend"],
  },
  {
    slice: "D", name: "Lingering legacy de-surfacing + redirect follow-ups + file deletion",
    touches: [
      "Vault + delete: ScripterPage, ScriptFlowHubPage, CallFlowBuilderPage, CallFlowPage, CampaignBlueprintsPage, CampaignsOverviewPage, CampaignDraftsPage, ArchivedCampaignsPage, IntegrationsPage, CampaignBuilderPage (after import audit)",
      "Re-classify AdvancedRoutesPage groups: 'Archived' → 'Compatibility' or 'Deep-link only'",
      "Demote /admin/tree-editor/:scriptId, /admin/script-routing, /app/workspaces/:id/{integrations,qa,analytics}-legacy with banner",
      "Final pass: every Card/Button/Link in /admin/* and /app/workspaces/* — assert no destination is in REDIRECT_TABLE.from or LingeringItem L-12",
      "Update OutlinePage Section 18 + Section 17 to reflect new state; flip p11-legacy-route-sweep, p11-builder-vault to done",
    ],
    doesNotTouch: ["marketing", "any backend", "page bodies of canonical surfaces"],
  },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* 7. Roll-up counters                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export function summarizeAudit() {
  const byClassification: Record<Classification, number> = {
    canonical: 0, compatibility: 0, redirecting: 0,
    "lingering-duplicate": 0, "stale-harmless": 0, "harmful-remove": 0,
  };
  const byScope: Record<Scope, number> = {
    marketing: 0, auth: 0, "org-admin": 0, workspace: 0, compat: 0, superadmin: 0,
  };
  for (const r of SURFACE_INVENTORY) {
    byClassification[r.classification]++;
    byScope[r.scope]++;
  }
  return {
    total: SURFACE_INVENTORY.length,
    byClassification,
    byScope,
    lingering: LINGERING_ITEMS.length,
    copyIssues: COPY_INCONSISTENCIES.length,
    ctaIssues: CTA_ALIGNMENT.filter(c => c.classification !== "canonical").length,
    redirects: REDIRECT_TABLE.length,
  };
}
