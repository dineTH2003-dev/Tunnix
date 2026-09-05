import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./store/authContext";
import { ThemeProvider } from "./store/themeContext";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";

// Public Pages
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// User Workspace Pages
import { DashboardHome } from "./pages/DashboardHome";
import { AgentTokensPage } from "./pages/AgentTokensPage";
import { SubdomainsPage } from "./pages/SubdomainsPage";
import { ActiveTunnelsPage } from "./pages/ActiveTunnelsPage";
import { TunnelHistoryPage } from "./pages/TunnelHistoryPage";
import { DownloadPage } from "./pages/DownloadPage";
import { SettingsPage } from "./pages/SettingsPage";

// Admin Pages
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/admin/AdminUserDetailPage";
import { AdminTunnelsPage } from "./pages/admin/AdminTunnelsPage";
import { AdminTunnelsHistoryPage } from "./pages/admin/AdminTunnelsHistoryPage";
import { AdminSubdomainsPage } from "./pages/admin/AdminSubdomainsPage";
import { AdminBlockedSubdomainsPage } from "./pages/admin/AdminBlockedSubdomainsPage";
import { AdminAccessControlPage } from "./pages/admin/AdminAccessControlPage";
import { AdminAuditLogsPage } from "./pages/admin/AdminAuditLogsPage";

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
        <Routes>
          {/* Public Marketing Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Public Auth Route */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected User Workspace Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/tokens" element={<AgentTokensPage />} />
              <Route path="/subdomains" element={<SubdomainsPage />} />
              <Route path="/tunnels" element={<ActiveTunnelsPage />} />
              <Route path="/tunnels/history" element={<TunnelHistoryPage />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Protected Admin Console Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
                <Route path="/admin/tunnels" element={<AdminTunnelsPage />} />
                <Route path="/admin/tunnels/history" element={<AdminTunnelsHistoryPage />} />
                <Route path="/admin/subdomains" element={<AdminSubdomainsPage />} />
                <Route path="/admin/subdomains/blocked" element={<AdminBlockedSubdomainsPage />} />
                <Route path="/admin/access-control" element={<AdminAccessControlPage />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
              </Route>
            </Route>
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>
  );
};
