import React, { useEffect, useState } from "react";
import { ShieldAlert, Users, Radio, Globe, FileText, Key, Activity, Clock, RefreshCw } from "lucide-react";
import { apiRequest } from "../../services/api";

interface AdminStats {
  totalUsers: number;
  adminUsers: number;
  pendingUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalSessions: number;
  activeTunnels: number;
  totalTokens: number;
  activeTokens: number;
  reservedSubdomains: number;
  totalAuditLogs: number;
  sessionsLast7Days: number;
  sessionsLast30Days: number;
}

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<AdminStats>("/v1/admin/stats");
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            Admin Stats <span className="badge badge-admin">Platform Operator</span>
          </h1>
          <p style={{ color: "#94a3b8", marginTop: 4 }}>
            System-wide platform metrics, active connections, security quotas, and user lifecycle.
          </p>
        </div>
        <button onClick={fetchStats} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {/* Main Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Total Users</span>
            <Users size={20} color="#38bdf8" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.5rem" }}>{stats?.totalUsers ?? 0}</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
            {stats?.activeUsers ?? 0} active • {stats?.adminUsers ?? 0} admins
          </div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Pending Approval</span>
            <Users size={20} color="#fbbf24" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.5rem", color: (stats?.pendingUsers ?? 0) > 0 ? "#fbbf24" : "inherit" }}>
            {stats?.pendingUsers ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
            {stats?.suspendedUsers ?? 0} suspended
          </div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Live Active Tunnels</span>
            <Radio size={20} color="#4ade80" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.5rem", color: "#4ade80" }}>
            {stats?.activeTunnels ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
            {stats?.totalSessions ?? 0} total sessions
          </div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Reserved Subdomains</span>
            <Globe size={20} color="#c084fc" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.5rem" }}>
            {stats?.reservedSubdomains ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>Active reservations</div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Agent Tokens</span>
            <Key size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem" }}>
            {stats?.activeTokens ?? 0} <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 400 }}>active</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
            {stats?.totalTokens ?? 0} total issued
          </div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>7-Day Tunnel Volume</span>
            <Activity size={20} color="#38bdf8" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem" }}>
            {stats?.sessionsLast7Days ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
            {stats?.sessionsLast30Days ?? 0} in past 30 days
          </div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Audit Log Entries</span>
            <FileText size={20} color="#a855f7" />
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem" }}>
            {stats?.totalAuditLogs ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
            Immutable security events
          </div>
        </div>
      </div>
    </div>
  );
};
