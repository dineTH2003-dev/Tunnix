import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Key,
  Globe,
  Radio,
  History,
  Download,
  Settings,
  ShieldAlert,
  Users,
  FileText,
  Shield,
  Lock,
  LogOut,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../store/authContext";
import { AccountIdenticon } from "./AccountIdenticon";

import { ErrorBoundary } from "./ErrorBoundary";

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const navItems = [
    { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
    { label: "Agent Tokens", path: "/tokens", icon: Key },
    { label: "Subdomains", path: "/subdomains", icon: Globe },
    { label: "Active Tunnels", path: "/tunnels", icon: Radio },
    { label: "Tunnel History", path: "/tunnels/history", icon: History },
    { label: "Download CLI", path: "/download", icon: Download },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  const adminNavItems = [
    { label: "Admin Stats", path: "/admin", icon: ShieldAlert },
    { label: "User Management", path: "/admin/users", icon: Users },
    { label: "Live Tunnels", path: "/admin/tunnels", icon: Radio },
    { label: "Tunnel History", path: "/admin/tunnels/history", icon: History },
    { label: "Reserved Subdomains", path: "/admin/subdomains", icon: Globe },
    { label: "Blocked Subdomains", path: "/admin/subdomains/blocked", icon: Shield },
    { label: "Access Control", path: "/admin/access-control", icon: Lock },
    { label: "Audit Logs", path: "/admin/audit-logs", icon: FileText },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          backgroundColor: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 40,
          transform: mobileOpen ? "translateX(0)" : undefined,
          transition: "background-color 0.2s ease, border-color 0.2s ease",
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: "1.5rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(99,102,241,0.4)",
            }}
          >
            <Zap size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Tunnix</h1>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Control Plane
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 0.75rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 0.75rem 0.5rem" }}>
            User Workspace
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.625rem 0.875rem",
                    borderRadius: 8,
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    textDecoration: "none",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    backgroundColor: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                    borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent",
                    transition: "all 0.15s ease",
                  })}
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {user?.role === "admin" && (
            <>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", padding: "1.25rem 0.75rem 0.5rem" }}>
                Admin Panel
              </div>
              <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      style={({ isActive }) => ({
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.625rem 0.875rem",
                        borderRadius: 8,
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        textDecoration: "none",
                        color: isActive ? "#ffffff" : "#94a3b8",
                        backgroundColor: isActive ? "rgba(168,85,247,0.15)" : "transparent",
                        borderLeft: isActive ? "3px solid #a855f7" : "3px solid transparent",
                        transition: "all 0.15s ease",
                      })}
                    >
                      <Icon size={18} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            </>
          )}
        </div>

        {/* User Card */}
        <div style={{ padding: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", overflow: "hidden" }}>
              <AccountIdenticon identifier={user?.id || user?.email} size={34} />
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text-main)" }}>
                  {user?.name || user?.email || "User"}
                </div>
                <div style={{ display: "flex", gap: "0.25rem", marginTop: 2 }}>
                  {user?.role === "admin" ? (
                    <span className="badge badge-admin">Admin</span>
                  ) : (
                    <span className="badge badge-active">User</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 6,
                borderRadius: 6,
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, marginLeft: 260, minHeight: "100vh", backgroundColor: "var(--bg-dark)", color: "var(--text-main)", padding: "2rem", transition: "background-color 0.2s ease" }}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
};
