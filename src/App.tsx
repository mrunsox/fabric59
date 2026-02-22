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

import CallFlowBuilderPage from "@/pages/admin/CallFlowBuilderPage";
import UserDashboardPage from "@/pages/admin/UserDashboardPage";
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
                <Route path="call-flow" element={<CallFlowBuilderPage />} />
                <Route path="test" element={<TestConsolePage />} />
                <Route path="settings" element={<SettingsPage />} />
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
