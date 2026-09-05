import React, { useEffect, useState, useMemo } from "react";
import { Users, ArrowLeft, RefreshCw, Key, Trash2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";

interface UserDetail {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  max_tunnels: number;
  max_subdomains: number;
  allowed_platforms: string;
  created_at: string;
}

interface AgentToken {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface TunnelSession {
  id: string;
  subdomain: string;
  status: string;
  local_port: number | null;
  connected_at: string | null;
  disconnected_at: string | null;
  created_at: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [tokens, setTokens] = useState<AgentToken[]>([]);
  const [tunnels, setTunnels] = useState<TunnelSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editMaxTunnels, setEditMaxTunnels] = useState(0);
  const [editMaxSubdomains, setEditMaxSubdomains] = useState(0);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>(`/v1/admin/users/${id}`);
      const u = data?.user ?? data;
      setUser(u);
      setEditRole(u.role);
      setEditStatus(u.status);
      setEditMaxTunnels(u.max_tunnels ?? 3);
      setEditMaxSubdomains(u.max_subdomains ?? 3);
      setTokens(data?.agentTokens ?? []);
      setTunnels(data?.tunnelSessions ?? []);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [id]);

  const handleSaveRole = async () => {
    setSaving(true);
    try {
      await apiRequest(`/v1/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role: editRole }) });
      fetchUser();
    } catch (err: any) {
      alert(err.message || "Failed to update role.");
    } finally { setSaving(false); }
  };

  const handleSaveStatus = async () => {
    setSaving(true);
    try {
      await apiRequest(`/v1/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: editStatus }) });
      fetchUser();
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    } finally { setSaving(false); }
  };

  const handleSaveLimits = async () => {
    setSaving(true);
    try {
      await apiRequest(`/v1/admin/users/${id}/limits`, {
        method: "PATCH",
        body: JSON.stringify({ maxTunnels: editMaxTunnels, maxSubdomains: editMaxSubdomains }),
      });
      fetchUser();
    } catch (err: any) {
      alert(err.message || "Failed to update limits.");
    } finally { setSaving(false); }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm("Revoke this agent token?")) return;
    try {
      await apiRequest(`/v1/admin/agent-tokens/${tokenId}/revoke`, { method: "DELETE" });
      fetchUser();
    } catch (err: any) {
      alert(err.message || "Failed to revoke token.");
    }
  };

  const handleRevokeAllTokens = async () => {
    if (!confirm(`Revoke ALL agent tokens for ${user?.email}?`)) return;
    try {
      await apiRequest(`/v1/admin/users/${id}/revoke-agent-tokens`, { method: "POST" });
      fetchUser();
    } catch (err: any) {
      alert(err.message || "Failed to revoke tokens.");
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading user...</div>;
  if (!user) return <div style={{ textAlign: "center", padding: "3rem", color: "#ef4444" }}>User not found.</div>;

  const STATUS_COLORS: Record<string, string> = {
    active: "#22c55e", pending: "#f59e0b", suspended: "#ef4444",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "2rem" }}>
        <button onClick={() => navigate("/admin/users")} className="btn-secondary" style={{ padding: "6px 12px" }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{user.name || user.email}</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>{user.email} · Joined {formatDate(user.created_at)}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: "2rem" }}>
        {[
          { label: "Role", value: user.role },
          { label: "Status", value: <span style={{ color: STATUS_COLORS[user.status] }}>{user.status}</span> },
          { label: "Max Tunnels", value: user.max_tunnels },
          { label: "Max Subdomains", value: user.max_subdomains },
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ padding: "1rem" }}>
            <p style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: 4 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: "2rem" }}>
        {/* Role */}
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 8 }}>Update Role</h3>
          <select className="input" value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ marginBottom: 8, width: "100%" }}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={handleSaveRole} disabled={saving} className="btn-primary" style={{ width: "100%" }}>Save Role</button>
        </div>

        {/* Status */}
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 8 }}>Update Status</h3>
          <select className="input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ marginBottom: 8, width: "100%" }}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          <button onClick={handleSaveStatus} disabled={saving} className="btn-primary" style={{ width: "100%" }}>Save Status</button>
        </div>

        {/* Limits */}
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 8 }}>Update Limits</h3>
          <label style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Max Tunnels</label>
          <input className="input" type="number" min={0} max={100} value={editMaxTunnels}
            onChange={(e) => setEditMaxTunnels(Number(e.target.value))} style={{ width: "100%", marginBottom: 8 }} />
          <label style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Max Subdomains</label>
          <input className="input" type="number" min={0} max={100} value={editMaxSubdomains}
            onChange={(e) => setEditMaxSubdomains(Number(e.target.value))} style={{ width: "100%", marginBottom: 8 }} />
          <button onClick={handleSaveLimits} disabled={saving} className="btn-primary" style={{ width: "100%" }}>Save Limits</button>
        </div>
      </div>

      {/* Agent Tokens */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <Key size={16} /> Agent Tokens
          </h2>
          <button onClick={handleRevokeAllTokens} className="btn-danger" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
            Revoke All
          </button>
        </div>
        {tokens.length === 0 ? (
          <p style={{ color: "#475569", fontSize: "0.875rem" }}>No agent tokens.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ color: "#64748b", borderBottom: "1px solid #1e293b" }}>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Name</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Prefix</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Last Used</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #0f172a" }}>
                  <td style={{ padding: "8px 10px" }}>{t.name}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#94a3b8" }}>{t.token_prefix}</td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{formatDate(t.last_used_at)}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ color: t.revoked_at ? "#ef4444" : "#22c55e", fontSize: "0.75rem" }}>
                      {t.revoked_at ? "Revoked" : "Active"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {!t.revoked_at && (
                      <button onClick={() => handleRevokeToken(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tunnel Sessions */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Tunnel Sessions</h2>
        {tunnels.length === 0 ? (
          <p style={{ color: "#475569", fontSize: "0.875rem" }}>No tunnel sessions.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ color: "#64748b", borderBottom: "1px solid #1e293b" }}>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Subdomain</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Status</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Port</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Connected</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {tunnels.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #0f172a" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#a5b4fc" }}>{t.subdomain}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ fontSize: "0.75rem", textTransform: "capitalize", color: t.status === "active" ? "#22c55e" : "#64748b" }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{t.local_port ?? "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{formatDate(t.connected_at)}</td>
                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{formatDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
