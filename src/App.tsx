import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MasterProtectedRoute } from "@/components/auth/MasterProtectedRoute";
import { AdminShell } from "@/components/layout/AdminShell";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

// Auth pages
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import SystemAccessPage from "@/pages/auth/SystemAccessPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import OnboardingPage from "@/pages/onboarding/OnboardingPage";
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
import ArchivedCampaignsPage from "@/pages/admin/ArchivedCampaignsPage";
import CampaignBlueprintsPage from "@/pages/admin/CampaignBlueprintsPage";
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
import CampaignsOverviewPage from "@/pages/admin/CampaignsOverviewPage";
import CampaignDraftsPage from "@/pages/admin/CampaignDraftsPage";
import CampaignReadinessBoardPage from "@/pages/admin/CampaignReadinessBoardPage";
import CampaignEventLogPage from "@/pages/admin/CampaignEventLogPage";
import TestingHubPage from "@/pages/admin/TestingHubPage";
import MonitoringHubPage from "@/pages/admin/MonitoringHubPage";
import DocsHubPage from "@/pages/admin/DocsHubPage";
import QrRoutingPage from "@/pages/admin/QrRoutingPage";

import CallFlowBuilderPage from "@/pages/admin/CallFlowBuilderPage";
import TreeEditorPage from "@/pages/admin/TreeEditorPage";
import UserDashboardPage from "@/pages/admin/UserDashboardPage";
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
            <Route path="/outline" element={<OutlinePage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/trust" element={<TrustPage />} />
            <Route path="/responsible-disclosure" element={<ResponsibleDisclosurePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/product" element={<ProductTourPage />} />
            <Route path="/demo" element={<DemoSandboxPage />} />

            {/* Legacy /master/* → consolidated under /superadmin */}
            <Route path="/master" element={<Navigate to="/superadmin" replace />} />
            <Route path="/master/organizations" element={<Navigate to="/superadmin/workspaces" replace />} />
            <Route path="/master/users" element={<Navigate to="/superadmin/users" replace />} />
            <Route path="/admin/dev-guide" element={<Navigate to="/superadmin/dev-guide" replace />} />
            <Route path="/admin/settings/dev-guide" element={<Navigate to="/superadmin/dev-guide" replace />} />

            {/* Unified platform admin (Superadmin) — gated by master_admin */}
            <Route element={<MasterProtectedRoute />}>
              <Route path="/superadmin" element={<SuperadminShell />}>
                <Route index element={<SuperadminOverviewPage />} />
                <Route path="workspaces" element={<OrganizationsOverviewPage />} />
                <Route path="users" element={<UsersManagementPage />} />
                <Route path="vault" element={<FeatureVaultPage />} />
                <Route path="vault/:id" element={<FeatureVaultDetailPage />} />
                <Route path="exports" element={<SourceExportsPage />} />
                <Route path="routes" element={<AdvancedRoutesPage />} />
                <Route path="docs" element={<SystemDocsPage />} />
                <Route path="dev-guide" element={<DevGuidePage />} />
              </Route>
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
              
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

                {/* Five9 (top-level) */}
                <Route path="five9" element={<Five9Page />} />
                <Route path="five9/legacy" element={<Five9OverviewPage />} />
                <Route path="five9/campaign-builder" element={<CampaignBuilderPage />} />
                <Route path="five9/campaign-builder/:draftId" element={<CampaignBuilderPage />} />
                <Route path="legal-connect/overview" element={<LegalConnectOverviewPage />} />
                <Route path="campaigns/overview" element={<CampaignsOverviewPage />} />
                <Route path="campaigns/drafts" element={<CampaignDraftsPage />} />
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
                <Route path="dashboard" element={<UserDashboardPage />} />
                <Route path="domains" element={<DomainsPage />} />
                <Route path="domains/:id" element={<DomainDetailPage />} />
                <Route path="mappings" element={<MappingsPage />} />
                <Route path="mappings/builder" element={<MappingBuilderPage />} />
                <Route path="mappings/builder/:id" element={<MappingBuilderPage />} />
                <Route path="logs" element={<ApiLogsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="tenants" element={<TenantsPage />} />
                <Route path="agents" element={<AgentsPage />} />
                <Route path="dispositions" element={<DispositionsPage />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="campaigns" element={<CampaignsPage />} />
                <Route path="campaigns/new" element={<CampaignIntakePage />} />
                <Route path="campaigns/edit/:id" element={<CampaignIntakePage />} />
                <Route path="campaigns/:id" element={<CampaignDetailPage />} />
                <Route path="campaigns/archived" element={<ArchivedCampaignsPage />} />
                <Route path="campaign-blueprints" element={<CampaignBlueprintsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                
                <Route path="scripter" element={<ScripterPage />} />
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
                <Route path="dev-guide" element={<DevGuidePage />} />
                <Route path="settings/dev-guide" element={<DevGuidePage />} />
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
