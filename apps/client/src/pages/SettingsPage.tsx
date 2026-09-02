import React from "react";
import { User, Shield, HardDrive, Clock } from "lucide-react";
import { useAuth } from "../store/authContext";

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Account & Quotas</h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>
          View your profile details, role permissions, and active resource limits.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* Profile Card */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <User size={22} color="#38bdf8" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>User Profile</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.9rem" }}>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.8rem" }}>Email Address</span>
              <strong style={{ fontSize: "1rem" }}>{user?.email}</strong>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.8rem" }}>Role & Status</span>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: 4 }}>
                <span className={user?.role === "admin" ? "badge badge-admin" : "badge badge-active"}>
                  {user?.role}
                </span>
                <span className="badge badge-active">{user?.status}</span>
              </div>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.8rem" }}>Member Since</span>
              <span style={{ color: "#cbd5e1" }}>
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Resource Limits Card */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <HardDrive size={22} color="#818cf8" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Capacity Quotas</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.85rem" }}>
                <span style={{ color: "#cbd5e1" }}>Concurrent Tunnels Limit</span>
                <span style={{ fontWeight: 700, color: "#38bdf8" }}>{user?.maxTunnels} Max</span>
              </div>
              <div style={{ height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%", backgroundColor: "#38bdf8" }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.85rem" }}>
                <span style={{ color: "#cbd5e1" }}>Reserved Subdomains Limit</span>
                <span style={{ fontWeight: 700, color: "#818cf8" }}>{user?.maxSubdomains} Max</span>
              </div>
              <div style={{ height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%", backgroundColor: "#818cf8" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
