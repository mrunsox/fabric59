import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import TenantsPage from "@/pages/admin/TenantsPage";
import MappingsPage from "@/pages/admin/MappingsPage";
import ApiLogsPage from "@/pages/admin/ApiLogsPage";
import NotificationsPage from "@/pages/admin/NotificationsPage";
import TestConsolePage from "@/pages/admin/TestConsolePage";
import SettingsPage from "@/pages/admin/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" theme="dark" />
      <BrowserRouter>
        <Routes>
          {/* Redirect root to admin */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<TenantsPage />} />
            <Route path="mappings" element={<MappingsPage />} />
            <Route path="logs" element={<ApiLogsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="test" element={<TestConsolePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
