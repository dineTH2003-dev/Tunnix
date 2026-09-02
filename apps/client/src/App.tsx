import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./store/authContext";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { AuthPage } from "./pages/AuthPage";
import { DashboardHome } from "./pages/DashboardHome";
import { AgentTokensPage } from "./pages/AgentTokensPage";
import { SubdomainsPage } from "./pages/SubdomainsPage";
import { ActiveTunnelsPage } from "./pages/ActiveTunnelsPage";
import { DownloadPage } from "./pages/DownloadPage";
import { SettingsPage } from "./pages/SettingsPage";

// Admin Pages
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminTunnelsPage } from "./pages/admin/AdminTunnelsPage";
import { AdminSubdomainsPage } from "./pages/admin/AdminSubdomainsPage";
import { AdminAuditLogsPage } from "./pages/admin/AdminAuditLogsPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected User Workspace Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/tokens" element={<AgentTokensPage />} />
              <Route path="/subdomains" element={<SubdomainsPage />} />
              <Route path="/tunnels" element={<ActiveTunnelsPage />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Protected Admin Console Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/tunnels" element={<AdminTunnelsPage />} />
                <Route path="/admin/subdomains" element={<AdminSubdomainsPage />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
