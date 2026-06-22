import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MasterProtectedRoute } from "@/components/auth/MasterProtectedRoute";
// Phase 2 — smart post-auth redirect (decides /onboarding vs /w/:id/home).
import LaunchRedirectPage from "@/pages/auth/LaunchRedirectPage";
import { AdminShell } from "@/components/layout/AdminShell";
import LegacyWorkspaceRedirect from "@/pages/workspace/LegacyWorkspaceRedirect";
// Vertical Skin System (Phase 4) — runtime theme injection.
import { SkinProvider } from "@/lib/skins/SkinProvider";
// Shell convergence (Phase E) — /org/* retired in favor of canonical /admin/*.
import { OrgParamRedirect } from "@/components/auth/OrgParamRedirect";
// Shell convergence (Phase E) — /org/* retired in favor of canonical /admin/*.
// All /org/* paths redirect into their AdminShell equivalents below.
import { WorkspaceShell as CanonicalWorkspaceShell, WorkspaceIndexRedirect } from "@/shells/WorkspaceShell";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import WorkspacesIndexPage from "@/pages/workspace/WorkspacesIndexPage";
// WorkspaceHomePage retired — /w/:id/home now redirects to /w/:id/campaigns and the KPI strip lives in WorkspaceContextBar.
import WorkspaceFormsPage from "@/pages/workspace/WorkspaceFormsPage";
import WorkspaceFormNewPage from "@/pages/workspace/WorkspaceFormNewPage";
import WorkspaceFormDetailPage from "@/pages/workspace/WorkspaceFormDetailPage";
import WorkspaceFormBuilderPage from "@/pages/workspace/WorkspaceFormBuilderPage";
import WorkspaceResetPreviewPage from "@/pages/workspace/WorkspaceResetPreviewPage";
import WorkspaceClientsPage from "@/pages/workspace/WorkspaceClientsPage";
import WorkspaceClientDetailPage from "@/pages/workspace/WorkspaceClientDetailPage";
import WorkspaceCampaignsPage from "@/pages/workspace/WorkspaceCampaignsPage";
import WorkspaceCampaignDetailPage from "@/pages/workspace/WorkspaceCampaignDetailPage";
import WorkspaceCampaignNewPage from "@/pages/workspace/WorkspaceCampaignNewPage";
// ASC (AI-Assisted Script Creation) — Slice 1: flag-gated decision shim + wizard.
import WorkspaceCampaignNewDecisionPage from "@/pages/workspace/campaigns/WorkspaceCampaignNewDecisionPage";
import AscWizardPage from "@/pages/workspace/campaigns/asc/AscWizardPage";
import AscPreviewPage from "@/pages/workspace/campaigns/asc/AscPreviewPage";
import WorkspaceGuidesPage from "@/pages/workspace/WorkspaceGuidesPage";
import WorkspaceLibraryPage from "@/pages/workspace/library/WorkspaceLibraryPage";
import WorkspaceGuideDetailPage from "@/pages/workspace/WorkspaceGuideDetailPage";
import WorkspaceGuideEditPage from "@/pages/workspace/WorkspaceGuideEditPage";
import WorkspaceGuideNewPage from "@/pages/workspace/WorkspaceGuideNewPage";
import WorkspaceGuidePreviewPage from "@/pages/workspace/WorkspaceGuidePreviewPage";
// Phase 4 — canonical singleton workspace guide builder.
import WorkspaceGuideBuilderPage from "@/pages/workspace/WorkspaceGuideBuilderPage";
// Phase 5 — canonical campaign flow (decision-tree) builder.
import WorkspaceCampaignFlowBuilderPage from "@/pages/workspace/WorkspaceCampaignFlowBuilderPage";
import WorkspaceTemplatesPage from "@/pages/workspace/WorkspaceTemplatesPage";
import WorkspaceTemplateDetailPage from "@/pages/workspace/WorkspaceTemplateDetailPage";
import WorkspaceIntegrationsPage from "@/pages/workspace/WorkspaceIntegrationsPage";
import WorkspaceIntegrationDetailPage from "@/pages/workspace/WorkspaceIntegrationDetailPage";
import WorkspaceAnalyticsPage from "@/pages/workspace/WorkspaceAnalyticsPage";
import WorkspaceQaPage from "@/pages/workspace/WorkspaceQaPage";
import WorkspaceBillingPage from "@/pages/workspace/WorkspaceBillingPage";
import WorkspaceKnowledgePage from "@/pages/workspace/WorkspaceKnowledgePage";
// Business Brain — Phase 1 / Slice 1 module.
import BusinessBrainLayoutPage from "@/pages/workspace/brain/BusinessBrainLayoutPage";
import KnowledgeBinPage from "@/pages/workspace/brain/KnowledgeBinPage";
import SuggestedFactsPage from "@/pages/workspace/brain/SuggestedFactsPage";
import ApprovedKnowledgePage from "@/pages/workspace/brain/ApprovedKnowledgePage";
import BrainSearchPage from "@/pages/workspace/brain/BrainSearchPage";
import BrainGovernancePage from "@/pages/workspace/brain/BrainGovernancePage";
import BrainHealthPage from "@/pages/workspace/brain/BrainHealthPage";
import BusinessBrainSettingsPage from "@/pages/workspace/settings/BusinessBrainSettingsPage";
import WorkspaceAssistantPage from "@/pages/workspace/WorkspaceAssistantPage";
import WorkspaceSettingsPage from "@/pages/workspace/WorkspaceSettingsPage";
// Additive workspace-shell route completion (May 13 Canonical Build Doc §4):
// Runs / Agents / Supervisor land inside /w/:workspaceId/* so canonical nav resolves.
import WorkspaceRunsPage from "@/pages/workspace/WorkspaceRunsPage";
import WorkspaceAgentsPage from "@/pages/workspace/WorkspaceAgentsPage";
import WorkspaceSupervisorPage from "@/pages/workspace/WorkspaceSupervisorPage";
// Phase B canonical surfaces.
import WorkspaceDispositionsPage from "@/pages/workspace/WorkspaceDispositionsPage";
import WorkspaceNotificationsPage from "@/pages/workspace/WorkspaceNotificationsPage";
import WorkspaceAgentCockpitPage from "@/pages/workspace/WorkspaceAgentCockpitPage";
import WorkspaceCockpitShell from "@/pages/workspace/cockpit/WorkspaceCockpitShell";
// Phase 6 — canonical live call runner.
import LiveCallRunnerPage from "@/pages/agent/LiveCallRunnerPage";
import AgentWorkspaceLandingPage from "@/pages/agent/AgentWorkspaceLandingPage";
// Published campaign embed runner — mounted outside the auth shell.
import EmbedCampaignRunnerPage from "@/pages/embed/EmbedCampaignRunnerPage";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

// Auth pages
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import SystemAccessPage from "@/pages/auth/SystemAccessPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import OnboardingPage from "@/pages/onboarding/OnboardingPage";
// Phase 2 — WorkspaceBootstrapPage no longer routed; /onboarding/workspace
// redirects into /onboarding (which already owns the workspace bootstrap step).
// File retained on disk for historical reference and a future cleanup pass.
import AcceptInvitePage from "@/pages/auth/AcceptInvitePage";
import OutlinePage from "@/pages/OutlinePage";
// Phase 1 — canonical marketing HomePage (mounted at "/").
// Legacy LandingPage file kept on disk (referenced by regression tests) but no longer routed.
import HomePage from "@/pages/marketing/HomePage";
import TermsPage from "@/pages/TermsPage";
import SecurityPage from "@/pages/SecurityPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TrustPage from "@/pages/TrustPage";
import ResponsibleDisclosurePage from "@/pages/ResponsibleDisclosurePage";
import ContactPage from "@/pages/ContactPage";
import ProductTourPage from "@/pages/ProductTourPage";
// Phase 9 — canonical marketing IA
import PersonasPage from "@/pages/marketing/PersonasPage";
import SolutionsPage from "@/pages/marketing/SolutionsPage";
import PricingPage from "@/pages/marketing/PricingPage";
import IntegrationsIndexPage from "@/pages/marketing/IntegrationsIndexPage";
import CustomersPage from "@/pages/marketing/CustomersPage";

// Admin pages
import TenantsPage from "@/pages/admin/TenantsPage";
import DomainsPage from "@/pages/admin/DomainsPage";
import DomainDetailPage from "@/pages/admin/DomainDetailPage";
import MappingsPage from "@/pages/admin/MappingsPage";
import MappingBuilderPage from "@/pages/admin/MappingBuilderPage";
import ApiLogsPage from "@/pages/admin/ApiLogsPage";
import NotificationsPage from "@/pages/admin/NotificationsPage";
import TestConsolePage from "@/pages/admin/TestConsolePage";
import SettingsPage from "@/pages/admin/SettingsPage";
import AgentsPage from "@/pages/admin/AgentsPage";
import DispositionsPage from "@/pages/admin/DispositionsPage";
// Phase D: legacy IntegrationsPage import removed; /admin/integrations redirects to /admin/connectors.
import CampaignsPage from "@/pages/admin/CampaignsPage";
// CampaignIntakePage no longer routed at /admin/* — create/edit redirected into canonical workspace path.
// Dashboard consolidation: legacy /admin/campaigns/:id demoted to a redirect helper
// that resolves the workspace and forwards to the canonical /w/:workspaceId/campaigns/:id hub.
import { AdminCampaignRedirect } from "@/components/auth/AdminCampaignRedirect";
// ArchivedCampaignsPage + CampaignBlueprintsPage no longer routed (Phase B convergence — redirected to canonical /admin/campaigns?status=archived and /admin/templates).
import ReportsPage from "@/pages/admin/ReportsPage";
import ClientOverviewPage from "@/pages/admin/ClientOverviewPage";
import PartnersPage from "@/pages/admin/PartnersPage";
import PartnerOverviewPage from "@/pages/admin/PartnerOverviewPage";
import Report59UploadPage from "@/pages/admin/Report59UploadPage";
// VAULTED (slug: legacy-scripter-page) — ScripterPage import removed; /admin/scripter redirects.
// agent-dashboard + supervisor pages deleted (canonical workspace QA covers it).
import QAAnalyticsPage from "@/pages/admin/QAAnalyticsPage";
import BillingPage from "@/pages/admin/BillingPage";
// Phase D: PostCallAutomationsPage no longer routed at /admin/automations.
// PostCallAutomationsContent is mounted inside WorkspaceNotificationsPage as the
// canonical "Post-call rules" tab; the file is retained for that re-export only
// and the legacy route silent-redirects into the workspace notifications surface.
// LegalConnectOverviewPage retired — /admin/legal-connect/overview redirects to /admin/legal-connect.
// Phase D: legacy ANI / Callback Queue / Abandon Rate / QR Routing pages
// were redirected to /admin/settings and the source files deleted (Gate 3).
// CampaignOverlayPage / CampaignOverlayListPage same — redirect to /admin/campaigns.
// Dashboard consolidation: Five9OverviewPage file deleted; /admin/five9 and
// /admin/five9/overview both redirect to /admin/connectors/five9.
// IdentityResolutionPage / DataPlanePage / PlatformUtilitiesPage retained on disk
// but de-surfaced — /admin/identity, /admin/data-plane, /admin/utilities → /superadmin.
import DataPlanePage from "@/pages/admin/DataPlanePage";
import IdentityResolutionPage from "@/pages/admin/IdentityResolutionPage";
import PlatformUtilitiesPage from "@/pages/admin/PlatformUtilitiesPage";
import ScriptEditorPage from "@/pages/admin/ScriptEditorPage";
import ScriptBuilderPage from "@/pages/admin/ScriptBuilderPage";
import KnowledgeBasePage from "@/pages/admin/KnowledgeBasePage";
import TrainingPage from "@/pages/admin/TrainingPage";
import FeedbackPage from "@/pages/admin/FeedbackPage";
// VAULTED (slug: legacy-script-routing) — ScriptRoutingPage import removed; /admin/script-routing redirects.
import GoalsPage from "@/pages/admin/GoalsPage";
import CallSummaryTemplatesPage from "@/pages/admin/CallSummaryTemplatesPage";
// VAULTED (slug: legacy-scriptflow-hub) — ScriptFlowHubPage import removed; /admin/scriptflow redirects.
import EmailTemplatesPage from "@/pages/admin/EmailTemplatesPage";
import LegalConnectPage from "@/pages/admin/LegalConnectPage";
import ClientLegalConnectPage from "@/pages/admin/ClientLegalConnectPage";
// Phase D: CampaignOverlayPage / CampaignOverlayListPage retired — files deleted, routes redirect.
// VAULTED (slug: legacy-five9-campaign-builder) — CampaignBuilderPage import removed; routes redirect to /admin/campaigns/new.
// CampaignsOverviewPage + CampaignDraftsPage no longer routed (Phase B convergence — redirected to canonical /admin/campaigns and /admin/campaigns?status=draft).
// CampaignReadinessBoardPage + CampaignEventLogPage deleted in hard-cleanup slice.
// Dashboard consolidation: TestingHubPage + MonitoringHubPage retired —
// /admin/testing → /admin/test, /admin/monitoring → /admin/logs.
import DocsHubPage from "@/pages/admin/DocsHubPage";
// Phase D: QrRoutingPage retired — file deleted, /admin/qr-routing → /admin/settings.

// CallFlowBuilderPage import removed — /admin/call-flow-builder now redirects via WorkspaceResolveRedirect.
import CallFlowPage from "@/pages/admin/CallFlowPage";
// VAULTED (slug: legacy-tree-editor) — TreeEditorPage import removed; /admin/tree-editor/:scriptId redirects.
// UserDashboardPage no longer mounted directly — Phase 11 collapsed /admin/dashboard into /admin (OverviewPage re-exports it).
import DesignSystemPage from "@/pages/admin/DesignSystemPage";
import DevGuidePage from "@/pages/superadmin/DevGuidePage";
import NotFound from "./pages/NotFound";

// Integration core pages
import OverviewPage from "@/pages/admin/OverviewPage";
import WorkspacesPage from "@/pages/admin/WorkspacesPage";
import WorkspaceDetailPage from "@/pages/admin/WorkspaceDetailPage";
import ClientsPage from "@/pages/admin/ClientsPage";
// ClientWorkspacePage retired (was a one-line re-export of ClientOverviewPage).
// Five9Page (re-export) deleted; /admin/five9 now uses Five9OverviewPage directly.
import ConnectorsCatalogPage from "@/pages/admin/ConnectorsCatalogPage";
import ConnectorInstancePage from "@/pages/admin/ConnectorInstancePage";
import FlowsPage from "@/pages/admin/FlowsPage";
import FlowBuilderPage from "@/pages/admin/FlowBuilderPage";
import NewFlowPage from "@/pages/admin/NewFlowPage";
import DeploymentsPage from "@/pages/admin/DeploymentsPage";
import DeploymentDetailPage from "@/pages/admin/DeploymentDetailPage";
import RunsPage from "@/pages/admin/RunsPage";
import RunDetailPage from "@/pages/admin/RunDetailPage";
import TemplatesPage from "@/pages/admin/TemplatesPage";
import TemplateDetailPage from "@/pages/admin/TemplateDetailPage";

// Platform admin pages (mounted under /superadmin)
import OrganizationsOverviewPage from "@/pages/master/OrganizationsOverviewPage";
import UsersManagementPage from "@/pages/master/UsersManagementPage";

// Superadmin (platform governance)
// Feature Vault retired (Phase 1 legacy strip): FeatureVaultPage, FeatureVaultDetailPage,
// SourceExportsPage source files deleted. /superadmin/vault, /superadmin/vault/:id,
// /superadmin/exports, /master/vault, /vault all tombstone to /superadmin/docs below.
import { SuperadminShell } from "@/components/layout/SuperadminShell";
import SuperadminOverviewPage from "@/pages/superadmin/SuperadminOverviewPage";
import AdvancedRoutesPage from "@/pages/superadmin/AdvancedRoutesPage";
import PublicFormPage from "@/pages/public/PublicFormPage";
import SystemDocsPage from "@/pages/superadmin/SystemDocsPage";
import DesignPartnersPage from "@/pages/superadmin/DesignPartnersPage";
import LegalConnectReportsPage from "@/pages/superadmin/LegalConnectReportsPage";
import TestCasesPage from "@/pages/superadmin/TestCasesPage";
import AscShadowObservationPage from "@/pages/superadmin/AscShadowObservationPage";

const queryClient = new QueryClient();

/**
 * WorkspaceResolveRedirect — resolves an "active" workspace and redirects.
 *
 * Resolution order:
 *   1. localStorage `lastWorkspaceId` (set by the canonical workspace shell on mount)
 *   2. The org's `is_default = true` workspace (RLS-scoped query)
 *   3. The first workspace the user can see
 *
 * Used by all legacy `/admin/*` surfaces that have a workspace-scoped canonical
 * home (legacy guide builders, agent dashboard, five9 campaign builder, and the
 * /admin/campaigns create+edit endpoints which are no longer first-class).
 *
 * Failure mode: shows a controlled message with a link back to /admin so users
 * never see a blank screen.
 */
function WorkspaceResolveRedirect({ to }: { to: string }) {
  const { user, organization, isLoading: authLoading } = useAuth();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ["resolve-active-workspace", user?.id ?? "anon", organization?.id ?? "none"],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<{ id: string; is_default: boolean; organization_id: string }[]> => {
      const q = supabase
        .from("workspaces")
        .select("id, is_default, organization_id")
        .order("is_default", { ascending: false });
      const { data, error } = organization?.id ? await q.eq("organization_id", organization.id) : await q;
      if (error) throw error;
      return (data ?? []) as { id: string; is_default: boolean; organization_id: string }[];
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return; // unauthenticated fallback handled below
    if (isLoading) return;
    const last = typeof window !== "undefined" ? localStorage.getItem("lastWorkspaceId") : null;
    const candidate =
      (last && workspaces?.find((w) => w.id === last)?.id) ||
      workspaces?.find((w) => w.is_default)?.id ||
      workspaces?.[0]?.id ||
      null;
    if (candidate) setResolvedId(candidate);
    else setFailed(true);
  }, [authLoading, user, isLoading, workspaces]);

  // Unauthenticated fallback: send to the canonical workspaces picker rather
  // than a login loop with a dead post-login destination.
  if (!authLoading && !user) {
    return <Navigate to="/app/workspaces" replace />;
  }
  if (resolvedId) {
    return <Navigate to={to.replace(":workspaceId", resolvedId)} replace />;
  }
  if (failed) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold">No workspace available</h1>
          <p className="text-sm text-muted-foreground">
            This page lives inside a workspace, but you don't have access to one yet.
            Visit the organization overview to create or be invited into a workspace.
          </p>
          <a href="/admin" className="text-sm font-medium text-primary underline">
            Go to organization overview
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
      Resolving workspace…
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" theme="dark" />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <SkinProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/system-access" element={<SystemAccessPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {/* CANONICAL: /outline is now an internal master-admin doc (see MasterProtectedRoute below). */}
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            {/* Public, unauthenticated form render — embeddable in Five9 Agent Desktop. */}
            <Route path="/forms/:formId" element={<PublicFormPage />} />
            <Route path="/trust" element={<TrustPage />} />
            <Route path="/responsible-disclosure" element={<ResponsibleDisclosurePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/product" element={<ProductTourPage />} />
            {/* Phase 9 — canonical public marketing IA */}
            <Route path="/personas" element={<PersonasPage />} />
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/integrations" element={<IntegrationsIndexPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            {/* Phase 9 — invite-accept landing target */}
            <Route path="/accept-invite" element={<AcceptInvitePage />} />

            {/* Published campaign embed runner — no auth, no app shell. */}
            <Route path="/embed/c/:campaignId" element={<EmbedCampaignRunnerPage />} />


            {/* Legacy /master/* → consolidated under /superadmin (high-bookmark only) */}
            <Route path="/master" element={<Navigate to="/superadmin" replace />} />
            <Route path="/master/users" element={<Navigate to="/superadmin/users" replace />} />
            {/* Phase 1 legacy strip: Feature Vault retired. /master/vault tombstones to System Docs. */}
            <Route path="/master/vault" element={<Navigate to="/superadmin/docs" replace />} />

            {/* Friendly top-level shortcuts → real routes */}
            {/* Phase 1 legacy strip: /vault tombstones to System Docs (Feature Vault retired). */}
            <Route path="/vault" element={<Navigate to="/superadmin/docs" replace />} />
            <Route path="/five9" element={<Navigate to="/admin/five9" replace />} />
            <Route path="/domains" element={<Navigate to="/admin/domains" replace />} />
            <Route path="/legal-connect" element={<Navigate to="/admin/legal-connect" replace />} />
            <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
            <Route path="/dashboard" element={<Navigate to="/admin" replace />} />

            {/* Phase 1 legacy strip: workspace-scoped legacy tombstones. Authenticated users
                resolve to their active workspace; unauthenticated users land on
                /app/workspaces (see WorkspaceResolveRedirect). */}
            <Route path="/analytics-legacy" element={<WorkspaceResolveRedirect to="/w/:workspaceId/analytics" />} />
            <Route path="/qa-legacy" element={<WorkspaceResolveRedirect to="/w/:workspaceId/qa" />} />
            <Route path="/integrations-legacy" element={<WorkspaceResolveRedirect to="/w/:workspaceId/integrations" />} />

            {/* Unified platform admin (Superadmin) — gated by master_admin */}
            <Route element={<MasterProtectedRoute />}>
              <Route path="/superadmin" element={<SuperadminShell />}>
                <Route index element={<SuperadminOverviewPage />} />
                <Route path="workspaces" element={<OrganizationsOverviewPage />} />
                <Route path="users" element={<UsersManagementPage />} />
                <Route path="design-partners" element={<DesignPartnersPage />} />
                <Route path="legal-connect-reports" element={<LegalConnectReportsPage />} />
                {/* Phase 1 legacy strip: Feature Vault retired — tombstones to System Docs. */}
                <Route path="vault" element={<Navigate to="/superadmin/docs" replace />} />
                <Route path="vault/:id" element={<Navigate to="/superadmin/docs" replace />} />
                <Route path="exports" element={<Navigate to="/superadmin/docs" replace />} />
                <Route path="routes" element={<AdvancedRoutesPage />} />
                <Route path="docs" element={<SystemDocsPage />} />
                <Route path="call-flow" element={<Navigate to="/admin/connectors" replace />} />
                <Route path="call-flow/raw" element={<CallFlowPage />} />
                <Route path="dev-guide" element={<DevGuidePage />} />
                <Route path="test-cases" element={<TestCasesPage />} />
                <Route path="asc-shadow" element={<AscShadowObservationPage />} />
                {/* CANONICAL: internal build doc, no longer public. */}
                <Route path="docs/outline" element={<OutlinePage />} />
              </Route>
              {/* CANONICAL: gated /outline — same component, master-admin only. */}
              <Route path="/outline" element={<OutlinePage />} />
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              {/* Phase 2 — canonical first-run flow. /onboarding is the single
                  obvious entry; /onboarding/workspace is folded into it. */}
              <Route
                path="/onboarding"
                element={
                  <WorkspaceProvider>
                    <OnboardingPage />
                  </WorkspaceProvider>
                }
              />
              {/* Phase 2 — legacy /onboarding/workspace redirects into the
                  canonical onboarding page (workspace bootstrap is its
                  internal step 4). External deep links keep working. */}
              <Route path="/onboarding/workspace" element={<Navigate to="/onboarding" replace />} />

              {/* Phase 2 — smart post-auth redirect. All sign-in / sign-up /
                  invite-accept flows route through here so the org+workspace
                  decision matrix lives in exactly one place. */}
              <Route
                path="/launch"
                element={
                  <WorkspaceProvider>
                    <LaunchRedirectPage />
                  </WorkspaceProvider>
                }
              />

              {/* ============================================================
                  PHASE 6 — Canonical live call runner.
                  /app/agent/workspace                                landing (picker)
                  /app/agent/workspace/:workspaceId/:campaignId       runner
                  Dedicated runtime surface — not mounted inside any other
                  shell so live-call latency stays predictable. The legacy
                  /w/:workspaceId/agent cockpit (Checkpoint 4) is preserved.
                  ============================================================ */}
              <Route path="/app/agent/workspace" element={<AgentWorkspaceLandingPage />} />
              <Route
                path="/app/agent/workspace/:workspaceId/:campaignId"
                element={<LiveCallRunnerPage />}
              />

              {/* Admin routes */}
              <Route path="/admin" element={<AdminShell />}>
                <Route index element={<OverviewPage />} />

                {/* Integration core */}
                <Route path="workspaces" element={<WorkspacesPage />} />
                <Route path="workspaces/:id" element={<WorkspaceDetailPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="clients/:id/workspace" element={<Navigate to="../" replace />} />
                <Route path="connectors" element={<ConnectorsCatalogPage />} />
                <Route path="connectors/:slug" element={<ConnectorInstancePage />} />
                <Route path="flows" element={<FlowsPage />} />
                <Route path="flows/new" element={<NewFlowPage />} />
                <Route path="flows/:id" element={<FlowBuilderPage />} />
                <Route path="deployments" element={<DeploymentsPage />} />
                <Route path="deployments/:id" element={<DeploymentDetailPage />} />
                <Route path="runs" element={<RunsPage />} />
                <Route path="runs/:id" element={<RunDetailPage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="templates/:id" element={<TemplateDetailPage />} />

                {/* Five9 (top-level). CANONICAL: /five9/legacy collapsed into /five9 (Phase 1). */}
                {/* Phase D: /admin/five9 de-surfaced — silent redirect to canonical connector instance. */}
                <Route path="five9" element={<Navigate to="/admin/connectors/five9" replace />} />
                {/* Dashboard consolidation: Five9 Overview retired — tombstone to canonical connector instance. */}
                <Route path="five9/overview" element={<Navigate to="/admin/connectors/five9" replace />} />
                <Route path="five9/legacy" element={<Navigate to="/admin/five9" replace />} />
                {/* CANONICAL: Five9 campaign builder writes redirect into the workspace path. */}
                <Route path="five9/campaign-builder" element={<WorkspaceResolveRedirect to="/w/:workspaceId/campaigns/new" />} />
                <Route path="five9/campaign-builder/:draftId" element={<WorkspaceResolveRedirect to="/w/:workspaceId/campaigns/new" />} />
                <Route path="legal-connect/overview" element={<Navigate to="/admin/legal-connect" replace />} />
                {/* CANONICAL (Phase B): campaign cluster collapsed.
                    overview/drafts → /admin/campaigns (with optional ?status= filter). */}
                <Route path="campaigns/overview" element={<Navigate to="/admin/campaigns" replace />} />
                <Route path="campaigns/drafts" element={<Navigate to="/admin/campaigns?status=draft" replace />} />
                {/* Dashboard consolidation: Testing + Monitoring hubs retired — tombstone to canonical destinations. */}
                <Route path="testing" element={<Navigate to="/admin/test" replace />} />
                <Route path="monitoring" element={<Navigate to="/admin/logs" replace />} />
                <Route path="docs" element={<DocsHubPage />} />
                <Route path="clients/:id" element={<ClientOverviewPage />} />
                <Route path="clients/:clientId/legal-connect" element={<ClientLegalConnectPage />} />
                <Route path="clients/:clientId/legal-connect/setup/:provider" element={<ClientLegalConnectPage />} />
                {/* Phase D: Campaign Overlay surfaces retired — silent redirects to canonical campaigns list. */}
                <Route path="clients/:clientId/five9-overlay" element={<Navigate to="/admin/campaigns" replace />} />
                <Route path="clients/:clientId/five9-overlay/campaigns/:campaignRouteId" element={<Navigate to="/admin/campaigns" replace />} />
                <Route path="partners" element={<PartnersPage />} />
                <Route path="partners/:id" element={<PartnerOverviewPage />} />
                {/* CANONICAL (Phase 11): single org overview at /admin index. /admin/dashboard collapses into it. */}
                <Route path="dashboard" element={<Navigate to="/admin" replace />} />
                <Route path="domains" element={<DomainsPage />} />
                <Route path="domains/:id" element={<DomainDetailPage />} />
                <Route path="mappings" element={<MappingsPage />} />
                <Route path="mappings/builder" element={<MappingBuilderPage />} />
                <Route path="mappings/builder/:id" element={<MappingBuilderPage />} />
                <Route path="logs" element={<ApiLogsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                {/* CANONICAL: tenants -> clients (UI label only; DB stays tenant*). */}
                <Route path="tenants" element={<Navigate to="/admin/clients" replace />} />
                <Route path="agents" element={<AgentsPage />} />
                <Route path="dispositions" element={<DispositionsPage />} />
                {/* CANONICAL: integrations folded into connectors (Phase 1). */}
                <Route path="integrations" element={<Navigate to="/admin/connectors" replace />} />
                <Route path="campaigns" element={<CampaignsPage />} />
                {/* CANONICAL: campaign create/edit lives only at /w/:workspaceId/campaigns/*.
                    /admin/campaigns is a read-only cross-workspace summary; writes redirect. */}
                <Route path="campaigns/new" element={<WorkspaceResolveRedirect to="/w/:workspaceId/campaigns/new" />} />
                <Route path="campaigns/edit/:id" element={<WorkspaceResolveRedirect to="/w/:workspaceId/campaigns" />} />
                {/* Dashboard consolidation: legacy campaign detail demoted — redirects to canonical /w/:workspaceId/campaigns/:id hub. */}
                <Route path="campaigns/:id" element={<AdminCampaignRedirect />} />
                {/* CANONICAL (Phase B): archived collapses into list filter; blueprints fold into templates. */}
                <Route path="campaigns/archived" element={<Navigate to="/admin/campaigns?status=archived" replace />} />
                <Route path="campaign-blueprints" element={<Navigate to="/admin/templates" replace />} />
                <Route path="reports" element={<ReportsPage />} />
                
                {/* CANONICAL (Phase C): Guide builder family collapses to one entry point.
                    - Canonical org-level guide list:    /admin/scripts
                    - Canonical org-level guide builder: /admin/scripts/:scriptId/builder (ScriptBuilderPage)
                    - Canonical workspace guide editor:  /app/workspaces/:workspaceId/guides/:guideId/edit
                    Legacy aliases (scripter, scriptflow, tree-editor base, call-flow base) redirect into the
                    canonical guide list. Param-bearing legacy routes (tree-editor/:scriptId, script-routing)
                    remain compatibility-only — reachable, de-surfaced from primary nav and CTAs. */}
                {/* CANONICAL: legacy guide builder family resolves to canonical workspace guides surface.
                    /admin/scripts + /admin/scripts/:id/builder are kept for now (org-level deep links);
                    the bare bases below redirect into the workspace shell so a fresh user always lands
                    inside /w/:workspaceId/guides. */}
                <Route path="scripter" element={<WorkspaceResolveRedirect to="/w/:workspaceId/guides" />} />
                <Route path="scriptflow" element={<WorkspaceResolveRedirect to="/w/:workspaceId/guides" />} />
                <Route path="tree-editor" element={<WorkspaceResolveRedirect to="/w/:workspaceId/guides" />} />
                <Route path="call-flow" element={<WorkspaceResolveRedirect to="/w/:workspaceId/guides" />} />
                <Route path="call-flow-builder" element={<WorkspaceResolveRedirect to="/w/:workspaceId/guides" />} />
                {/* CANONICAL: agent-dashboard is compatibility-only (not in nav). Redirects to workspace. */}
                <Route path="agent-dashboard" element={<WorkspaceResolveRedirect to="/w/:workspaceId/agent" />} />
                <Route path="qa" element={<QAAnalyticsPage />} />
                <Route path="billing" element={<BillingPage />} />
                {/* Phase D: legacy ops surfaces silent-redirect to canonical homes. */}
                <Route path="automations" element={<WorkspaceResolveRedirect to="/w/:workspaceId/notifications" />} />
                <Route path="ani-blocklist" element={<Navigate to="/admin/settings" replace />} />
                <Route path="callback-queue" element={<Navigate to="/admin/settings" replace />} />
                <Route path="abandon-rate" element={<Navigate to="/admin/settings" replace />} />
                {/* Phase D: superadmin-class surfaces de-surfaced from /admin — silent redirect to /superadmin.
                    Files retained on disk; reachable via "/raw" suffix if a deep link is needed. */}
                <Route path="data-plane" element={<Navigate to="/superadmin" replace />} />
                <Route path="data-plane/raw" element={<DataPlanePage />} />
                <Route path="identity" element={<Navigate to="/superadmin" replace />} />
                <Route path="identity/raw" element={<IdentityResolutionPage />} />
                <Route path="utilities" element={<Navigate to="/superadmin" replace />} />
                <Route path="utilities/raw" element={<PlatformUtilitiesPage />} />
                <Route path="scripts" element={<ScriptEditorPage />} />
                <Route path="scripts/:scriptId/builder" element={<ScriptBuilderPage />} />
                <Route path="kb" element={<KnowledgeBasePage />} />
                <Route path="training" element={<TrainingPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                {/* CANONICAL: legacy script-routing redirects into workspace guides. */}
                <Route path="script-routing" element={<WorkspaceResolveRedirect to="/w/:workspaceId/guides" />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="summary-templates" element={<CallSummaryTemplatesPage />} />
                {/* Phase C: scriptflow base redirects above; param surface kept for legacy deep links handled by hub. */}
                <Route path="email-templates" element={<EmailTemplatesPage />} />
                {/* Phase C: call-flow base redirects above; this param route is compatibility-only. */}
                <Route path="legal-connect" element={<LegalConnectPage />} />
                {/* Phase D: QrRoutingPage retired — silent redirect to settings. */}
                <Route path="qr-routing" element={<Navigate to="/admin/settings" replace />} />
                {/* CANONICAL: legacy tree-editor redirects into workspace guides (param dropped). */}
                <Route path="tree-editor/:scriptId" element={<WorkspaceResolveRedirect to="/w/:workspaceId/guides" />} />
                <Route path="test" element={<TestConsolePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="design-system" element={<DesignSystemPage />} />
              </Route>

              {/* ============================================================
                  LEGACY /app/workspaces/* — single-hop redirect to /w/*
                  Index keeps the canonical workspaces picker.
                  ============================================================ */}
              <Route
                path="/app/workspaces"
                element={
                  <WorkspaceProvider>
                    <WorkspacesIndexPage />
                  </WorkspaceProvider>
                }
              />
              <Route path="/app/workspaces/:workspaceId/*" element={<LegacyWorkspaceRedirect />} />

              {/* ============================================================
                  SHELL CONVERGENCE (Phase E) — single canonical org shell.
                  AdminShell at /admin/* is the canonical organization-level
                  surface. The previously scaffolded /org/* OrgShell is retired;
                  every /org/* path single-hop redirects into its /admin/*
                  equivalent so external links and bookmarks keep working.
                  ============================================================ */}
              <Route path="/org" element={<Navigate to="/admin" replace />} />
              <Route path="/org/workspaces" element={<Navigate to="/admin/workspaces" replace />} />
              <Route path="/org/workspaces/:id" element={<OrgParamRedirect to="/admin/workspaces/:id" />} />
              <Route path="/org/connectors" element={<Navigate to="/admin/connectors" replace />} />
              <Route path="/org/connectors/:slug" element={<OrgParamRedirect to="/admin/connectors/:slug" />} />
              <Route path="/org/reports" element={<Navigate to="/admin/reports" replace />} />
              <Route path="/org/notifications" element={<Navigate to="/admin/notifications" replace />} />
              <Route path="/org/settings" element={<Navigate to="/admin/settings" replace />} />
              <Route path="/org/billing" element={<Navigate to="/admin/billing" replace />} />

              <Route path="/w/:workspaceId" element={<CanonicalWorkspaceShell />}>
                <Route index element={<WorkspaceIndexRedirect />} />
                <Route path="home" element={<Navigate to="../campaigns" replace />} />
                <Route path="clients" element={<WorkspaceClientsPage />} />
                <Route path="clients/:clientId" element={<WorkspaceClientDetailPage />} />
                <Route path="campaigns" element={<WorkspaceCampaignsPage />} />
                <Route path="campaigns/new" element={<WorkspaceCampaignNewDecisionPage />} />
                <Route path="campaigns/new/manual" element={<WorkspaceCampaignNewPage />} />
                <Route path="campaigns/new/assisted" element={<AscWizardPage />} />
                <Route path="campaigns/new/assisted/preview" element={<AscPreviewPage />} />
                <Route path="campaigns/:campaignId" element={<WorkspaceCampaignDetailPage />} />
                <Route path="campaigns/:campaignId/builder" element={<WorkspaceCampaignFlowBuilderPage />} />
                <Route path="campaigns/:campaignId/embed-preview" element={<EmbedCampaignRunnerPage />} />
                <Route path="guide" element={<WorkspaceGuideBuilderPage />} />
                <Route path="library" element={<WorkspaceLibraryPage />} />
                <Route path="guides" element={<WorkspaceGuidesPage />} />
                <Route path="guides/new" element={<WorkspaceGuideNewPage />} />
                <Route path="guides/:guideId" element={<WorkspaceGuideDetailPage />} />
                <Route path="guides/:guideId/edit" element={<WorkspaceGuideEditPage />} />
                <Route path="guides/:guideId/preview" element={<WorkspaceGuidePreviewPage />} />
                <Route path="forms" element={<WorkspaceFormsPage />} />
                <Route path="forms/new" element={<WorkspaceFormNewPage />} />
                <Route path="forms/:formId" element={<WorkspaceFormDetailPage />} />
                <Route path="forms/:formId/edit" element={<WorkspaceFormBuilderPage />} />
                <Route path="templates" element={<WorkspaceTemplatesPage />} />
                <Route path="templates/:templateId" element={<WorkspaceTemplateDetailPage />} />
                <Route path="qa" element={<WorkspaceQaPage />} />
                <Route path="runs" element={<WorkspaceRunsPage />} />
                <Route path="agents" element={<WorkspaceAgentsPage />} />
                <Route path="supervisor" element={<WorkspaceSupervisorPage />} />
                <Route path="analytics" element={<WorkspaceAnalyticsPage />} />
                <Route path="integrations" element={<WorkspaceIntegrationsPage />} />
                <Route path="integrations/:connectionId" element={<WorkspaceIntegrationDetailPage />} />
                <Route path="knowledge" element={<WorkspaceKnowledgePage />} />
                {/* Business Brain — Phase 1 / Slice 1. Flag-gated inside the layout. */}
                <Route path="brain" element={<BusinessBrainLayoutPage />}>
                  <Route index element={<KnowledgeBinPage />} />
                  <Route path="suggested" element={<SuggestedFactsPage />} />
                  <Route path="approved" element={<ApprovedKnowledgePage />} />
                  <Route path="search" element={<BrainSearchPage />} />
                  <Route path="governance" element={<BrainGovernancePage />} />
                  <Route path="health" element={<BrainHealthPage />} />
                </Route>
                <Route path="assistant" element={<WorkspaceAssistantPage />} />
                <Route path="settings" element={<WorkspaceSettingsPage />} />
                <Route path="settings/brain" element={<BusinessBrainSettingsPage />} />
                {/* Phase B canonical surfaces */}
                <Route path="dispositions" element={<WorkspaceDispositionsPage />} />
                <Route path="notifications" element={<WorkspaceNotificationsPage />} />
                <Route path="agent" element={<WorkspaceAgentCockpitPage />} />
                {/* Phase 4 — canonical Cockpit shell with Live / Supervisor / Runs tabs.
                    Standalone /agent, /runs, /supervisor remain mounted for deep links. */}
                <Route path="cockpit" element={<WorkspaceCockpitShell />} />
              </Route>
            </Route>

            {/* Phase 1 — canonical marketing root.
                Legacy LandingPage is no longer mounted; HomePage uses the new MarketingShell. */}
            <Route path="/" element={<HomePage />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </SkinProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
