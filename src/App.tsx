import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MasterProtectedRoute } from "@/components/auth/MasterProtectedRoute";
// Phase 2 — smart post-auth redirect (decides /onboarding vs /w/:id/home).
import LaunchRedirectPage from "@/pages/auth/LaunchRedirectPage";
import { AdminShell } from "@/components/layout/AdminShell";
import LegacyWorkspaceRedirect from "@/pages/workspace/LegacyWorkspaceRedirect";
// Shell convergence (Phase E) — /org/* retired in favor of canonical /admin/*.
// All /org/* paths redirect into their AdminShell equivalents below.
import { WorkspaceShell as CanonicalWorkspaceShell, WorkspaceIndexRedirect } from "@/shells/WorkspaceShell";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import WorkspacesIndexPage from "@/pages/workspace/WorkspacesIndexPage";
import WorkspaceHomePage from "@/pages/workspace/WorkspaceHomePage";
import WorkspaceFormsPage from "@/pages/workspace/WorkspaceFormsPage";
import WorkspaceFormNewPage from "@/pages/workspace/WorkspaceFormNewPage";
import WorkspaceFormDetailPage from "@/pages/workspace/WorkspaceFormDetailPage";
import WorkspaceResetPreviewPage from "@/pages/workspace/WorkspaceResetPreviewPage";
import WorkspaceClientsPage from "@/pages/workspace/WorkspaceClientsPage";
import WorkspaceClientDetailPage from "@/pages/workspace/WorkspaceClientDetailPage";
import WorkspaceCampaignsPage from "@/pages/workspace/WorkspaceCampaignsPage";
import WorkspaceCampaignDetailPage from "@/pages/workspace/WorkspaceCampaignDetailPage";
import WorkspaceCampaignNewPage from "@/pages/workspace/WorkspaceCampaignNewPage";
import WorkspaceGuidesPage from "@/pages/workspace/WorkspaceGuidesPage";
import WorkspaceGuideDetailPage from "@/pages/workspace/WorkspaceGuideDetailPage";
import WorkspaceGuideEditPage from "@/pages/workspace/WorkspaceGuideEditPage";
import WorkspaceGuideNewPage from "@/pages/workspace/WorkspaceGuideNewPage";
import WorkspaceGuidePreviewPage from "@/pages/workspace/WorkspaceGuidePreviewPage";
import WorkspaceTemplatesPage from "@/pages/workspace/WorkspaceTemplatesPage";
import WorkspaceTemplateDetailPage from "@/pages/workspace/WorkspaceTemplateDetailPage";
import WorkspaceIntegrationsPage from "@/pages/workspace/WorkspaceIntegrationsPage";
import WorkspaceIntegrationDetailPage from "@/pages/workspace/WorkspaceIntegrationDetailPage";
import WorkspaceAnalyticsPage from "@/pages/workspace/WorkspaceAnalyticsPage";
import WorkspaceQaPage from "@/pages/workspace/WorkspaceQaPage";
import WorkspaceBillingPage from "@/pages/workspace/WorkspaceBillingPage";
import WorkspaceKnowledgePage from "@/pages/workspace/WorkspaceKnowledgePage";
import WorkspaceAssistantPage from "@/pages/workspace/WorkspaceAssistantPage";
import WorkspaceSettingsPage from "@/pages/workspace/WorkspaceSettingsPage";
// Additive workspace-shell route completion (May 13 Canonical Build Doc §4):
// Runs / Agents / Supervisor land inside /w/:workspaceId/* so canonical nav resolves.
import WorkspaceRunsPage from "@/pages/workspace/WorkspaceRunsPage";
import WorkspaceAgentsPage from "@/pages/workspace/WorkspaceAgentsPage";
import WorkspaceSupervisorPage from "@/pages/workspace/WorkspaceSupervisorPage";
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
import CampaignIntakePage from "@/pages/admin/CampaignIntakePage";
import CampaignDetailPage from "@/pages/admin/CampaignDetailPage";
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
import PostCallAutomationsPage from "@/pages/admin/PostCallAutomationsPage";
import ANIBlockListPage from "@/pages/admin/ANIBlockListPage";
import CallbackQueuePage from "@/pages/admin/CallbackQueuePage";
import AbandonRatePage from "@/pages/admin/AbandonRatePage";
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
import CampaignOverlayListPage from "@/pages/admin/CampaignOverlayListPage";
import CampaignOverlayPage from "@/pages/admin/CampaignOverlayPage";
// VAULTED (slug: legacy-five9-campaign-builder) — CampaignBuilderPage import removed; routes redirect to /admin/campaigns/new.
import Five9OverviewPage from "@/pages/admin/Five9OverviewPage";
import LegalConnectOverviewPage from "@/pages/admin/LegalConnectOverviewPage";
// CampaignsOverviewPage + CampaignDraftsPage no longer routed (Phase B convergence — redirected to canonical /admin/campaigns and /admin/campaigns?status=draft).
// CampaignReadinessBoardPage + CampaignEventLogPage deleted in hard-cleanup slice.
import TestingHubPage from "@/pages/admin/TestingHubPage";
import MonitoringHubPage from "@/pages/admin/MonitoringHubPage";
import DocsHubPage from "@/pages/admin/DocsHubPage";
import QrRoutingPage from "@/pages/admin/QrRoutingPage";

import CallFlowBuilderPage from "@/pages/admin/CallFlowBuilderPage";
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
import ClientWorkspacePage from "@/pages/admin/ClientWorkspacePage";
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

// Superadmin (Feature Vault)
import { SuperadminShell } from "@/components/layout/SuperadminShell";
import SuperadminOverviewPage from "@/pages/superadmin/SuperadminOverviewPage";
import FeatureVaultPage from "@/pages/superadmin/FeatureVaultPage";
import FeatureVaultDetailPage from "@/pages/superadmin/FeatureVaultDetailPage";
import SourceExportsPage from "@/pages/superadmin/SourceExportsPage";
import AdvancedRoutesPage from "@/pages/superadmin/AdvancedRoutesPage";
import SystemDocsPage from "@/pages/superadmin/SystemDocsPage";
import DesignPartnersPage from "@/pages/superadmin/DesignPartnersPage";
import LegalConnectReportsPage from "@/pages/superadmin/LegalConnectReportsPage";
import TestCasesPage from "@/pages/superadmin/TestCasesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" theme="dark" />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
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

            {/* Legacy /master/* → consolidated under /superadmin (high-bookmark only) */}
            <Route path="/master" element={<Navigate to="/superadmin" replace />} />
            <Route path="/master/users" element={<Navigate to="/superadmin/users" replace />} />
            <Route path="/master/vault" element={<Navigate to="/superadmin/vault" replace />} />

            {/* Friendly top-level shortcuts → real routes */}
            <Route path="/vault" element={<Navigate to="/superadmin/vault" replace />} />
            <Route path="/five9" element={<Navigate to="/admin/five9" replace />} />
            <Route path="/domains" element={<Navigate to="/admin/domains" replace />} />
            <Route path="/legal-connect" element={<Navigate to="/admin/legal-connect" replace />} />
            <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
            <Route path="/dashboard" element={<Navigate to="/admin" replace />} />

            {/* Unified platform admin (Superadmin) — gated by master_admin */}
            <Route element={<MasterProtectedRoute />}>
              <Route path="/superadmin" element={<SuperadminShell />}>
                <Route index element={<SuperadminOverviewPage />} />
                <Route path="workspaces" element={<OrganizationsOverviewPage />} />
                <Route path="users" element={<UsersManagementPage />} />
                <Route path="design-partners" element={<DesignPartnersPage />} />
                <Route path="legal-connect-reports" element={<LegalConnectReportsPage />} />
                <Route path="vault" element={<FeatureVaultPage />} />
                <Route path="vault/:id" element={<FeatureVaultDetailPage />} />
                <Route path="exports" element={<SourceExportsPage />} />
                <Route path="routes" element={<AdvancedRoutesPage />} />
                <Route path="docs" element={<SystemDocsPage />} />
                <Route path="call-flow" element={<CallFlowPage />} />
                <Route path="dev-guide" element={<DevGuidePage />} />
                <Route path="test-cases" element={<TestCasesPage />} />
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


              {/* Admin routes */}
              <Route path="/admin" element={<AdminShell />}>
                <Route index element={<OverviewPage />} />

                {/* Integration core */}
                <Route path="workspaces" element={<WorkspacesPage />} />
                <Route path="workspaces/:id" element={<WorkspaceDetailPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="clients/:id/workspace" element={<ClientWorkspacePage />} />
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
                <Route path="five9" element={<Five9OverviewPage />} />
                <Route path="five9/legacy" element={<Navigate to="/admin/five9" replace />} />
                {/* VAULTED: legacy-five9-campaign-builder → canonical /admin/campaigns/new */}
                <Route path="five9/campaign-builder" element={<Navigate to="/admin/campaigns/new" replace />} />
                <Route path="five9/campaign-builder/:draftId" element={<Navigate to="/admin/campaigns/new" replace />} />
                <Route path="legal-connect/overview" element={<LegalConnectOverviewPage />} />
                {/* CANONICAL (Phase B): campaign cluster collapsed.
                    overview/drafts → /admin/campaigns (with optional ?status= filter). */}
                <Route path="campaigns/overview" element={<Navigate to="/admin/campaigns" replace />} />
                <Route path="campaigns/drafts" element={<Navigate to="/admin/campaigns?status=draft" replace />} />
                <Route path="testing" element={<TestingHubPage />} />
                <Route path="monitoring" element={<MonitoringHubPage />} />
                <Route path="docs" element={<DocsHubPage />} />
                <Route path="clients/:id" element={<ClientOverviewPage />} />
                <Route path="clients/:clientId/legal-connect" element={<ClientLegalConnectPage />} />
                <Route path="clients/:clientId/legal-connect/setup/:provider" element={<ClientLegalConnectPage />} />
                <Route path="clients/:clientId/five9-overlay" element={<CampaignOverlayListPage />} />
                <Route path="clients/:clientId/five9-overlay/campaigns/:campaignRouteId" element={<CampaignOverlayPage />} />
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
                <Route path="campaigns/new" element={<CampaignIntakePage />} />
                <Route path="campaigns/edit/:id" element={<CampaignIntakePage />} />
                <Route path="campaigns/:id" element={<CampaignDetailPage />} />
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
                <Route path="scripter" element={<Navigate to="/admin/scripts" replace />} />
                <Route path="scriptflow" element={<Navigate to="/admin/scripts" replace />} />
                <Route path="tree-editor" element={<Navigate to="/admin/scripts" replace />} />
                <Route path="call-flow" element={<Navigate to="/admin/flows" replace />} />
                {/* agent-dashboard + supervisor deleted (canonical workspace QA covers it). */}
                <Route path="qa" element={<QAAnalyticsPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="automations" element={<PostCallAutomationsPage />} />
                <Route path="ani-blocklist" element={<ANIBlockListPage />} />
                <Route path="callback-queue" element={<CallbackQueuePage />} />
                <Route path="abandon-rate" element={<AbandonRatePage />} />
                <Route path="data-plane" element={<DataPlanePage />} />
                <Route path="identity" element={<IdentityResolutionPage />} />
                <Route path="utilities" element={<PlatformUtilitiesPage />} />
                <Route path="scripts" element={<ScriptEditorPage />} />
                <Route path="scripts/:scriptId/builder" element={<ScriptBuilderPage />} />
                <Route path="kb" element={<KnowledgeBasePage />} />
                <Route path="training" element={<TrainingPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                {/* VAULTED: legacy-script-routing → canonical /admin/scripts */}
                <Route path="script-routing" element={<Navigate to="/admin/scripts" replace />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="summary-templates" element={<CallSummaryTemplatesPage />} />
                {/* Phase C: scriptflow base redirects above; param surface kept for legacy deep links handled by hub. */}
                <Route path="email-templates" element={<EmailTemplatesPage />} />
                {/* Phase C: call-flow base redirects above; this param route is compatibility-only. */}
                <Route path="legal-connect" element={<LegalConnectPage />} />
                <Route path="qr-routing" element={<QrRoutingPage />} />
                {/* VAULTED: legacy-tree-editor → canonical /admin/scripts */}
                <Route path="tree-editor/:scriptId" element={<Navigate to="/admin/scripts" replace />} />
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
                <Route path="home" element={<WorkspaceHomePage />} />
                <Route path="clients" element={<WorkspaceClientsPage />} />
                <Route path="clients/:clientId" element={<WorkspaceClientDetailPage />} />
                <Route path="campaigns" element={<WorkspaceCampaignsPage />} />
                <Route path="campaigns/new" element={<WorkspaceCampaignNewPage />} />
                <Route path="campaigns/:campaignId" element={<WorkspaceCampaignDetailPage />} />
                <Route path="guides" element={<WorkspaceGuidesPage />} />
                <Route path="guides/new" element={<WorkspaceGuideNewPage />} />
                <Route path="guides/:guideId" element={<WorkspaceGuideDetailPage />} />
                <Route path="guides/:guideId/edit" element={<WorkspaceGuideEditPage />} />
                <Route path="guides/:guideId/preview" element={<WorkspaceGuidePreviewPage />} />
                <Route path="forms" element={<WorkspaceFormsPage />} />
                <Route path="forms/new" element={<WorkspaceFormNewPage />} />
                <Route path="forms/:formId" element={<WorkspaceFormDetailPage />} />
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
                <Route path="assistant" element={<WorkspaceAssistantPage />} />
                <Route path="settings" element={<WorkspaceSettingsPage />} />
              </Route>
            </Route>

            {/* Phase 1 — canonical marketing root.
                Legacy LandingPage is no longer mounted; HomePage uses the new MarketingShell. */}
            <Route path="/" element={<HomePage />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
