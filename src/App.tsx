import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MasterProtectedRoute } from "@/components/auth/MasterProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { MasterLayout } from "@/components/layout/MasterLayout";
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

import CallFlowBuilderPage from "@/pages/admin/CallFlowBuilderPage";
import TreeEditorPage from "@/pages/admin/TreeEditorPage";
import UserDashboardPage from "@/pages/admin/UserDashboardPage";
import DesignSystemPage from "@/pages/admin/DesignSystemPage";
import NotFound from "./pages/NotFound";

// Master admin pages
import MasterDashboardPage from "@/pages/master/MasterDashboardPage";
import OrganizationsOverviewPage from "@/pages/master/OrganizationsOverviewPage";
import UsersManagementPage from "@/pages/master/UsersManagementPage";

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

            {/* Master admin routes - hidden, only accessible via /system-access */}
            <Route element={<MasterProtectedRoute />}>
              <Route path="/master" element={<MasterLayout />}>
                <Route index element={<MasterDashboardPage />} />
                <Route path="organizations" element={<OrganizationsOverviewPage />} />
                <Route path="users" element={<UsersManagementPage />} />
              </Route>
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<TenantsPage />} />
                <Route path="clients/:id" element={<ClientOverviewPage />} />
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
                <Route path="tree-editor/:scriptId" element={<TreeEditorPage />} />
                <Route path="tree-editor" element={<TreeEditorPage />} />
                <Route path="test" element={<TestConsolePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="design-system" element={<DesignSystemPage />} />
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
