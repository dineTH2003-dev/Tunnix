import React, { useEffect, useState } from "react";
import { Globe, Shield, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "../../services/api";

export const AdminSubdomainsPage: React.FC = () => {
  const [reservedSubdomains, setReservedSubdomains] = useState<any[]>([]);
  const [blockedSubdomains, setBlockedSubdomains] = useState<any[]>([]);
  const [newBlocked, setNewBlocked] = useState("");

  const fetchData = async () => {
    try {
      const [res, block] = await Promise.all([
        apiRequest<any>("/v1/admin/subdomains/reserved").catch(() => []),
        apiRequest<any>("/v1/admin/subdomains/blocked").catch(() => []),
      ]);
      const resItems = Array.isArray(res) ? res : res?.items || [];
      const blockItems = Array.isArray(block) ? block : block?.items || [];
      setReservedSubdomains(resItems);
      setBlockedSubdomains(blockItems);
    } catch {
      setReservedSubdomains([]);
      setBlockedSubdomains([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddBlocked = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlocked.trim()) return;

    try {
      await apiRequest("/v1/admin/subdomains/blocked", {
        method: "POST",
        body: JSON.stringify({ subdomain: newBlocked.trim().toLowerCase() }),
      });
      setNewBlocked("");
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to block subdomain.");
    }
  };

  const handleRemoveBlocked = async (id: string) => {
    try {
      await apiRequest(`/v1/admin/subdomains/blocked/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to unblock subdomain.");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Global Subdomain Governance</h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>
          Manage user-reserved subdomains and system restricted/blocked domain patterns.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* Blocked Subdomains List */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Restricted / Blocked Words</h2>

          <form onSubmit={handleAddBlocked} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <input
              type="text"
              required
              placeholder="e.g. admin, api, billing"
              value={newBlocked}
              onChange={(e) => setNewBlocked(e.target.value)}
              className="input-field"
            />
            <button type="submit" className="btn-primary" style={{ padding: "0.5rem 0.85rem" }}>
              <Plus size={16} /> Block
            </button>
          </form>

          {blockedSubdomains.length === 0 ? (
            <div style={{ color: "#64748b", textAlign: "center", padding: "1rem" }}>No blocked subdomains configured.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {blockedSubdomains.map((b) => (
                <span
                  key={b.id}
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    color: "#fca5a5",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    padding: "0.3rem 0.6rem",
                    borderRadius: 6,
                    fontSize: "0.85rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {b.subdomain}
                  <button onClick={() => handleRemoveBlocked(b.id)} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", padding: 0 }}>
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Global Reserved Subdomains */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>All Reserved Subdomains</h2>

          {reservedSubdomains.length === 0 ? (
            <div style={{ color: "#64748b", textAlign: "center", padding: "1rem" }}>No reserved subdomains in system.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                    <th style={{ padding: "0.5rem" }}>Subdomain</th>
                    <th style={{ padding: "0.5rem" }}>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {reservedSubdomains.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "0.5rem", color: "#38bdf8", fontWeight: 600 }}>{r.subdomain}</td>
                      <td style={{ padding: "0.5rem", color: "#94a3b8" }}>{r.user_email || r.user_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
