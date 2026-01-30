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

// Auth pages
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import SystemAccessPage from "@/pages/auth/SystemAccessPage";
import OnboardingPage from "@/pages/onboarding/OnboardingPage";

// Admin pages
import TenantsPage from "@/pages/admin/TenantsPage";
import DomainsPage from "@/pages/admin/DomainsPage";
import DomainDetailPage from "@/pages/admin/DomainDetailPage";
import MappingsPage from "@/pages/admin/MappingsPage";
import ApiLogsPage from "@/pages/admin/ApiLogsPage";
import NotificationsPage from "@/pages/admin/NotificationsPage";
import TestConsolePage from "@/pages/admin/TestConsolePage";
import SettingsPage from "@/pages/admin/SettingsPage";
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
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/system-access" element={<SystemAccessPage />} />

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
                <Route path="domains" element={<DomainsPage />} />
                <Route path="domains/:id" element={<DomainDetailPage />} />
                <Route path="mappings" element={<MappingsPage />} />
                <Route path="logs" element={<ApiLogsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="test" element={<TestConsolePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Redirect root to admin */}
            <Route path="/" element={<Navigate to="/admin" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
