import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, RefreshCw, PowerOff, ExternalLink, History } from "lucide-react";
import { apiRequest } from "../services/api";

interface TunnelSession {
  id: string;
  subdomain: string;
  public_url: string;
  local_port: number;
  status: string;
  created_at: string;
  last_heartbeat_at: string | null;
}

export const ActiveTunnelsPage: React.FC = () => {
  const [tunnels, setTunnels] = useState<TunnelSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTunnels = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/v1/tunnel/sessions");
      const items = Array.isArray(data) ? data : data?.items || [];
      setTunnels(items);
    } catch {
      setTunnels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTunnels();
    const interval = setInterval(fetchTunnels, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this live tunnel?")) return;
    try {
      await apiRequest(`/v1/tunnel/sessions/${id}/disconnect`, { method: "POST" });
      fetchTunnels();
    } catch (err: any) {
      alert(err.message || "Failed to disconnect tunnel.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Live Active Tunnels</h1>
          <p style={{ color: "#94a3b8", marginTop: 4 }}>
            Monitor and control your active tunnel connections in real time.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/tunnels/history" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <History size={16} /> Tunnel History
          </Link>
          <button onClick={fetchTunnels} className="btn-secondary">
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        {tunnels.length === 0 ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: "3rem" }}>
            <Radio size={36} style={{ margin: "0 auto 1rem", opacity: 0.4 }} />
            <p style={{ fontSize: "1rem" }}>No active tunnels connected right now.</p>
            <small style={{ color: "#475569", marginTop: 4, display: "block" }}>
              Run <code>tunnix http &lt;port&gt;</code> on your machine to start a tunnel.
            </small>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>Public Domain URL</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Local Forwarding</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Last Heartbeat</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Connected At</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tunnels.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                      <a
                        href={t.public_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#38bdf8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        {t.subdomain}.tunnix.local <ExternalLink size={14} />
                      </a>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <code className="font-mono">localhost:{t.local_port}</code>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span className="badge badge-active">
                        <span className="pulse-dot"></span> Active
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8" }}>
                      {t.last_heartbeat_at ? new Date(t.last_heartbeat_at).toLocaleTimeString() : "Just now"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8" }}>
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <button onClick={() => handleDisconnect(t.id)} className="btn-danger" style={{ padding: "0.35rem 0.6rem" }}>
                        <PowerOff size={15} /> Disconnect
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
