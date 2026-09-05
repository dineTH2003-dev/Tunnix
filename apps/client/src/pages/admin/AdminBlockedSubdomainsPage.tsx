import React, { useEffect, useState } from "react";
import { Shield, Plus, Trash2, RefreshCw } from "lucide-react";
import { apiRequest } from "../../services/api";

interface BlockedSubdomain {
  id: string;
  subdomain: string;
  reason: string | null;
  created_at: string;
  created_by_user_email?: string | null;
}

export const AdminBlockedSubdomainsPage: React.FC = () => {
  const [blocked, setBlocked] = useState<BlockedSubdomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubdomain, setNewSubdomain] = useState("");
  const [newReason, setNewReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBlocked = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/v1/admin/blocked-subdomains");
      const items = Array.isArray(data) ? data : data?.items ?? data?.blockedSubdomains ?? [];
      setBlocked(items);
    } catch {
      setBlocked([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlocked(); }, []);

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = newSubdomain.trim().toLowerCase();
    if (!sub) return;
    setSubmitting(true);
    try {
      await apiRequest("/v1/admin/blocked-subdomains", {
        method: "POST",
        body: JSON.stringify({ subdomain: sub, reason: newReason.trim() || undefined }),
      });
      setNewSubdomain("");
      setNewReason("");
      fetchBlocked();
    } catch (err: any) {
      alert(err.message || "Failed to block subdomain.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (id: string, subdomain: string) => {
    if (!confirm(`Unblock subdomain "${subdomain}"?`)) return;
    try {
      await apiRequest(`/v1/admin/blocked-subdomains/${id}`, { method: "DELETE" });
      fetchBlocked();
    } catch (err: any) {
      alert(err.message || "Failed to unblock subdomain.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Shield size={20} color="#ef4444" />
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Blocked Subdomains</h1>
          </div>
          <p style={{ color: "#94a3b8" }}>Manage subdomains that users are not allowed to reserve or use as tunnel destinations.</p>
        </div>
        <button onClick={fetchBlocked} className="btn-secondary">
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {/* Add blocked subdomain form */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> Block a Subdomain
        </h2>
        <form onSubmit={handleBlock} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="subdomain-name"
            value={newSubdomain}
            onChange={(e) => setNewSubdomain(e.target.value)}
            required
            style={{ flex: "1", minWidth: 160 }}
          />
          <input
            className="input"
            placeholder="Reason (optional)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            style={{ flex: "2", minWidth: 200 }}
          />
          <button type="submit" disabled={submitting} className="btn-danger" style={{ whiteSpace: "nowrap" }}>
            {submitting ? "Blocking..." : "Block Subdomain"}
          </button>
        </form>
      </div>

      {/* Blocked subdomains list */}
      <div className="card" style={{ padding: "1.5rem" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading...</div>
        ) : blocked.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
            <Shield size={40} style={{ margin: "0 auto 1rem" }} />
            <p>No subdomains are currently blocked.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b", color: "#64748b" }}>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Subdomain</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Reason</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Blocked By</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Blocked At</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {blocked.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #0f172a" }}>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#f87171" }}>{b.subdomain}</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{b.reason ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "0.8rem" }}>{b.created_by_user_email ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{new Date(b.created_at).toLocaleString()}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <button
                      onClick={() => handleUnblock(b.id, b.subdomain)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Trash2 size={14} /> Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
