import React, { useEffect, useState } from "react";
import { Radio, PowerOff, ExternalLink } from "lucide-react";
import { apiRequest } from "../../services/api";

export const AdminTunnelsPage: React.FC = () => {
  const [activeTunnels, setActiveTunnels] = useState<any[]>([]);

  const fetchActiveTunnels = async () => {
    try {
      const data = await apiRequest<any>("/v1/admin/tunnels/active");
      const items = Array.isArray(data) ? data : data?.items || [];
      setActiveTunnels(items);
    } catch {
      setActiveTunnels([]);
    }
  };

  useEffect(() => {
    fetchActiveTunnels();
  }, []);

  const handleForceDisconnect = async (sessionId: string) => {
    if (!confirm("Force disconnect this active tunnel across the network?")) return;
    try {
      await apiRequest(`/v1/admin/tunnels/${sessionId}/disconnect`, { method: "POST" });
      fetchActiveTunnels();
    } catch (err: any) {
      alert(err.message || "Failed to disconnect tunnel.");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Global Active Tunnels</h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>
          Monitor all active tunnel sessions across all users on the platform.
        </p>
      </div>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        {activeTunnels.length === 0 ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>
            No live tunnels connected across the system.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>User Email</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Subdomain</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Target Port</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Connected At</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeTunnels.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{t.user_email || t.user_id}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#38bdf8" }}>{t.subdomain}.tunnix.local</td>
                    <td style={{ padding: "0.75rem 1rem" }}>localhost:{t.local_port}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8" }}>{new Date(t.created_at).toLocaleString()}</td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <button onClick={() => handleForceDisconnect(t.id)} className="btn-danger" style={{ padding: "0.35rem 0.6rem" }}>
                        <PowerOff size={15} /> Force Disconnect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
