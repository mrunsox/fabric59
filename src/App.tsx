import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MasterProtectedRoute } from "@/components/auth/MasterProtectedRoute";
import { AdminShell } from "@/components/layout/AdminShell";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import WorkspacesIndexPage from "@/pages/workspace/WorkspacesIndexPage";
import WorkspaceHomePage from "@/pages/workspace/WorkspaceHomePage";
import WorkspaceSectionPlaceholder from "@/pages/workspace/WorkspaceSectionPlaceholder";
import WorkspaceClientsPage from "@/pages/workspace/WorkspaceClientsPage";
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
import { ScrollToTop } from "@/components/layout/ScrollToTop";

// Auth pages
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import SystemAccessPage from "@/pages/auth/SystemAccessPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import OnboardingPage from "@/pages/onboarding/OnboardingPage";
import WorkspaceBootstrapPage from "@/pages/onboarding/WorkspaceBootstrapPage";
import AcceptInvitePage from "@/pages/auth/AcceptInvitePage";
import OutlinePage from "@/pages/OutlinePage";
import LandingPage from "@/pages/LandingPage";
import TermsPage from "@/pages/TermsPage";
import SecurityPage from "@/pages/SecurityPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TrustPage from "@/pages/TrustPage";
import ResponsibleDisclosurePage from "@/pages/ResponsibleDisclosurePage";
import ContactPage from "@/pages/ContactPage";
import FaqPage from "@/pages/FaqPage";
import ProductTourPage from "@/pages/ProductTourPage";
import DemoSandboxPage from "@/pages/DemoSandboxPage";
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
import IntegrationsPage from "@/pages/admin/IntegrationsPage";
import CampaignsPage from "@/pages/admin/CampaignsPage";
import CampaignIntakePage from "@/pages/admin/CampaignIntakePage";
import CampaignDetailPage from "@/pages/admin/CampaignDetailPage";
// ArchivedCampaignsPage + CampaignBlueprintsPage no longer routed (Phase B convergence — redirected to canonical /admin/campaigns?status=archived and /admin/templates).
import ReportsPage from "@/pages/admin/ReportsPage";
import ClientOverviewPage from "@/pages/admin/ClientOverviewPage";
import PartnersPage from "@/pages/admin/PartnersPage";
import PartnerOverviewPage from "@/pages/admin/PartnerOverviewPage";
import Report59UploadPage from "@/pages/admin/Report59UploadPage";
import ScripterPage from "@/pages/admin/ScripterPage";
import AgentDashboardPage from "@/pages/admin/AgentDashboardPage";
import SupervisorPage from "@/pages/admin/SupervisorPage";
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
import ScriptRoutingPage from "@/pages/admin/ScriptRoutingPage";
import GoalsPage from "@/pages/admin/GoalsPage";
import CallSummaryTemplatesPage from "@/pages/admin/CallSummaryTemplatesPage";
import ScriptFlowHubPage from "@/pages/admin/ScriptFlowHubPage";
import EmailTemplatesPage from "@/pages/admin/EmailTemplatesPage";
import LegalConnectPage from "@/pages/admin/LegalConnectPage";
import ClientLegalConnectPage from "@/pages/admin/ClientLegalConnectPage";
import CampaignOverlayListPage from "@/pages/admin/CampaignOverlayListPage";
import CampaignOverlayPage from "@/pages/admin/CampaignOverlayPage";
import CampaignBuilderPage from "@/pages/admin/CampaignBuilderPage";
import Five9OverviewPage from "@/pages/admin/Five9OverviewPage";
import LegalConnectOverviewPage from "@/pages/admin/LegalConnectOverviewPage";
// CampaignsOverviewPage + CampaignDraftsPage no longer routed (Phase B convergence — redirected to canonical /admin/campaigns and /admin/campaigns?status=draft).
import CampaignReadinessBoardPage from "@/pages/admin/CampaignReadinessBoardPage";
import CampaignEventLogPage from "@/pages/admin/CampaignEventLogPage";
import TestingHubPage from "@/pages/admin/TestingHubPage";
import MonitoringHubPage from "@/pages/admin/MonitoringHubPage";
import DocsHubPage from "@/pages/admin/DocsHubPage";
import QrRoutingPage from "@/pages/admin/QrRoutingPage";

import CallFlowBuilderPage from "@/pages/admin/CallFlowBuilderPage";
import CallFlowPage from "@/pages/admin/CallFlowPage";
import TreeEditorPage from "@/pages/admin/TreeEditorPage";
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
import Five9Page from "@/pages/admin/Five9Page";
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
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/product" element={<ProductTourPage />} />
            <Route path="/demo" element={<DemoSandboxPage />} />
            {/* Phase 9 — canonical public marketing IA */}
            <Route path="/personas" element={<PersonasPage />} />
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/integrations" element={<IntegrationsIndexPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            {/* Phase 9 — invite-accept landing target */}
            <Route path="/accept-invite" element={<AcceptInvitePage />} />
            <Route path="/call-flow" element={<Navigate to="/superadmin/call-flow" replace />} />

            {/* Legacy /master/* → consolidated under /superadmin */}
            <Route path="/master" element={<Navigate to="/superadmin" replace />} />
            <Route path="/master/organizations" element={<Navigate to="/superadmin/workspaces" replace />} />
            <Route path="/master/users" element={<Navigate to="/superadmin/users" replace />} />
            <Route path="/master/vault" element={<Navigate to="/superadmin/vault" replace />} />
            <Route path="/master/vault/:id" element={<Navigate to="/superadmin/vault" replace />} />
            <Route path="/master/exports" element={<Navigate to="/superadmin/exports" replace />} />
            <Route path="/master/routes" element={<Navigate to="/superadmin/routes" replace />} />
            <Route path="/master/docs" element={<Navigate to="/superadmin/docs" replace />} />
            <Route path="/admin/dev-guide" element={<Navigate to="/superadmin/dev-guide" replace />} />
            <Route path="/admin/settings/dev-guide" element={<Navigate to="/superadmin/dev-guide" replace />} />

            {/* Friendly top-level shortcuts → real routes (no dead 404s for bookmarks/docs) */}
            <Route path="/vault" element={<Navigate to="/superadmin/vault" replace />} />
            <Route path="/feature-vault" element={<Navigate to="/superadmin/vault" replace />} />
            <Route path="/five9" element={<Navigate to="/admin/five9" replace />} />
            <Route path="/domains" element={<Navigate to="/admin/domains" replace />} />
            <Route path="/five9-domains" element={<Navigate to="/admin/domains" replace />} />
            <Route path="/legal-connect" element={<Navigate to="/admin/legal-connect" replace />} />
            <Route path="/legal-connect/overview" element={<Navigate to="/admin/legal-connect/overview" replace />} />
            <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
            <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/onboarding/legal-connect" element={<Navigate to="/admin/legal-connect" replace />} />

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
              <Route path="/onboarding" element={<OnboardingPage />} />
              {/* Phase 9 — workspace bootstrap (lands user inside canonical workspace) */}
              <Route
                path="/onboarding/workspace"
                element={
                  <WorkspaceProvider>
                    <WorkspaceBootstrapPage />
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
                <Route path="five9" element={<Five9Page />} />
                <Route path="five9/legacy" element={<Navigate to="/admin/five9" replace />} />
                <Route path="five9/campaign-builder" element={<CampaignBuilderPage />} />
                <Route path="five9/campaign-builder/:draftId" element={<CampaignBuilderPage />} />
                <Route path="legal-connect/overview" element={<LegalConnectOverviewPage />} />
                {/* CANONICAL (Phase B): campaign cluster collapsed.
                    overview/drafts → /admin/campaigns (with optional ?status= filter).
                    readiness + event-log remain compatibility-only — reachable via direct URL,
                    de-surfaced from primary campaign nav, still linked from operational hubs (Five9, Monitoring, Legal Connect). */}
                <Route path="campaigns/overview" element={<Navigate to="/admin/campaigns" replace />} />
                <Route path="campaigns/drafts" element={<Navigate to="/admin/campaigns?status=draft" replace />} />
                <Route path="campaigns/readiness" element={<CampaignReadinessBoardPage />} />
                <Route path="campaigns/event-log" element={<CampaignEventLogPage />} />
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
                
                {/* CANONICAL: scripts/guides cluster — scripter, scripts, tree-editor, scriptflow,
                    script-routing all merge into the canonical Guide artifact in Phase 4.
                    Kept routable; de-surfaced from primary nav this pass. */}
                <Route path="scripter" element={<ScripterPage />} />
                {/* CANONICAL: kept routable as an active operational surface; de-surfaced from nav. */}
                <Route path="agent-dashboard" element={<AgentDashboardPage />} />
                <Route path="supervisor" element={<SupervisorPage />} />
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
                <Route path="scripts/:id" element={<ScriptEditorPage />} />
                <Route path="scripts/:scriptId/builder" element={<ScriptBuilderPage />} />
                <Route path="kb" element={<KnowledgeBasePage />} />
                <Route path="training" element={<TrainingPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="script-routing" element={<ScriptRoutingPage />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="summary-templates" element={<CallSummaryTemplatesPage />} />
                <Route path="scriptflow" element={<ScriptFlowHubPage />} />
                <Route path="email-templates" element={<EmailTemplatesPage />} />
                <Route path="call-flow" element={<CallFlowBuilderPage />} />
                <Route path="legal-connect" element={<LegalConnectPage />} />
                <Route path="qr-routing" element={<QrRoutingPage />} />
                <Route path="tree-editor/:scriptId" element={<TreeEditorPage />} />
                <Route path="tree-editor" element={<TreeEditorPage />} />
                <Route path="test" element={<TestConsolePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="design-system" element={<DesignSystemPage />} />
              </Route>

              {/* ============================================================
                  CANONICAL WORKSPACE TREE (Phase 2A)
                  Path: /app/workspaces/:workspaceId/*
                  Workspace identity is currently adapted from Organization
                  via WorkspaceContext (see src/contexts/WorkspaceContext.tsx).
                  Real workspaces table arrives in Phase 2B.
                  Legacy /admin/* routes remain fully active and unchanged.
                  ============================================================ */}
              <Route
                path="/app/workspaces"
                element={
                  <WorkspaceProvider>
                    <WorkspacesIndexPage />
                  </WorkspaceProvider>
                }
              />
              <Route path="/app/workspaces/:workspaceId" element={<WorkspaceShell />}>
                <Route index element={<WorkspaceHomePage />} />
                <Route path="home" element={<WorkspaceHomePage />} />
                {/* Reused legacy pages — wrapped under canonical workspace shell.
                    These pages still read org-scoped data from AuthContext today;
                    workspace-scoped data binding lands in Phase 2B/3. */}
                {/* Phase 2B: workspace-scoped clients (real workspace context). */}
                <Route path="clients" element={<WorkspaceClientsPage />} />
                {/* Phase 3: canonical workspace campaigns (workspace-scoped, RLS). */}
                <Route path="campaigns" element={<WorkspaceCampaignsPage />} />
                <Route path="campaigns/new" element={<WorkspaceCampaignNewPage />} />
                <Route path="campaigns/:campaignId" element={<WorkspaceCampaignDetailPage />} />
                {/* Phase 5: canonical workspace templates (workspace-scoped read of canonical
                    templates table; mirrors all 7 legacy template tables). */}
                <Route path="templates" element={<WorkspaceTemplatesPage />} />
                <Route path="templates/:templateId" element={<WorkspaceTemplateDetailPage />} />
                <Route path="runs" element={<RunsPage />} />
                <Route path="agents" element={<AgentsPage />} />
                <Route path="supervisor" element={<SupervisorPage />} />
                {/* Phase 8: canonical workspace QA + analytics surfaces.
                    Legacy admin pages remain reachable under /admin/* as
                    compatibility-only; canonical QA/analytics live here. */}
                <Route path="qa" element={<WorkspaceQaPage />} />
                <Route path="qa-legacy" element={<QAAnalyticsPage />} />
                <Route path="analytics" element={<WorkspaceAnalyticsPage />} />
                <Route path="analytics-legacy" element={<ReportsPage />} />
                <Route path="billing" element={<WorkspaceBillingPage />} />
                {/* Phase 10 — AI knowledge layer + workspace assistant. */}
                <Route path="knowledge" element={<WorkspaceKnowledgePage />} />
                <Route path="assistant" element={<WorkspaceAssistantPage />} />
                {/* Phase 7: canonical workspace integrations (provider-agnostic).
                    Reads canonical integration_providers + integration_connections;
                    legacy ConnectorsCatalogPage stays reachable but is no longer the
                    primary surface for workspace-scoped integrations. */}
                <Route path="integrations" element={<WorkspaceIntegrationsPage />} />
                <Route
                  path="integrations/:connectionId"
                  element={<WorkspaceIntegrationDetailPage />}
                />
                <Route path="integrations-legacy" element={<ConnectorsCatalogPage />} />
                <Route path="settings" element={<SettingsPage />} />
                {/* Phase 4: canonical workspace guides (workspace-scoped, mirrored from legacy scripts).
                    ScriptBuilderPage at /admin/scripts/:scriptId/builder is the canonical builder
                    survivor; legacy script surfaces (scripter, tree-editor, scriptflow, script-routing)
                    remain routable as compatibility/deferred during Phase 4. */}
                <Route path="guides" element={<WorkspaceGuidesPage />} />
                <Route path="guides/new" element={<WorkspaceGuideNewPage />} />
                <Route path="guides/:guideId" element={<WorkspaceGuideDetailPage />} />
                <Route path="guides/:guideId/edit" element={<WorkspaceGuideEditPage />} />
                <Route path="guides/:guideId/preview" element={<WorkspaceGuidePreviewPage />} />
                <Route
                  path="forms"
                  element={
                    <WorkspaceSectionPlaceholder
                      label="Forms"
                      rationale="The canonical Forms builder is a new surface introduced in Phase 5."
                    />
                  }
                />
              </Route>
            </Route>

            {/* Redirect root to admin */}
            <Route path="/" element={<LandingPage />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
