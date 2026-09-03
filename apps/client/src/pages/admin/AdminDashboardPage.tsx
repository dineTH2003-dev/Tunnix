import React, { useEffect, useState } from "react";
import { ShieldAlert, Users, Radio, Globe, FileText } from "lucide-react";
import { apiRequest } from "../../services/api";

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    usersCount: 0,
    pendingUsersCount: 0,
    activeTunnelsCount: 0,
    subdomainsCount: 0,
  });

  useEffect(() => {
    Promise.all([
      apiRequest<any>("/v1/admin/users").catch(() => []),
      apiRequest<any>("/v1/admin/tunnels/active").catch(() => []),
      apiRequest<any>("/v1/admin/subdomains/reserved").catch(() => []),
    ]).then(([users, tunnels, subdomains]) => {
      const usersArr = Array.isArray(users) ? users : users?.items || [];
      const tunnelsArr = Array.isArray(tunnels) ? tunnels : tunnels?.items || [];
      const subdomainsArr = Array.isArray(subdomains) ? subdomains : subdomains?.items || [];
      setStats({
        usersCount: usersArr.length,
        pendingUsersCount: usersArr.filter((u: any) => u?.status === "pending").length,
        activeTunnelsCount: tunnelsArr.length,
        subdomainsCount: subdomainsArr.length,
      });
    });
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
          Admin Console <span className="badge badge-admin">Platform Operator</span>
        </h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>
          Global metrics, user approvals, active tunnels, and security audit log monitoring.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Total Registered Users</span>
            <Users size={20} color="#38bdf8" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.5rem" }}>{stats.usersCount}</div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Pending Approval</span>
            <Users size={20} color="#fbbf24" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.5rem", color: stats.pendingUsersCount > 0 ? "#fbbf24" : "inherit" }}>
            {stats.pendingUsersCount}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Global Active Tunnels</span>
            <Radio size={20} color="#4ade80" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.5rem" }}>{stats.activeTunnelsCount}</div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Reserved Subdomains</span>
            <Globe size={20} color="#c084fc" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.5rem" }}>{stats.subdomainsCount}</div>
        </div>
      </div>
    </div>
  );
};
