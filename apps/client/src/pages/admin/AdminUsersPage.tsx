import React, { useEffect, useState } from "react";
import { Users, CheckCircle, XCircle, Shield, Edit2, Save, X } from "lucide-react";
import { apiRequest } from "../../services/api";

interface UserRecord {
  id: string;
  email: string;
  role: "admin" | "user";
  status: "pending" | "active" | "suspended";
  name: string | null;
  max_tunnels: number;
  max_subdomains: number;
  created_at: string;
}

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await apiRequest<any>("/v1/admin/users");
      const items = Array.isArray(data) ? data : data?.items || [];
      setUsers(items);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      await apiRequest(`/v1/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await apiRequest(`/v1/admin/users/${editingUser.id}/limits`, {
        method: "PATCH",
        body: JSON.stringify({
          maxTunnels: editingUser.max_tunnels,
          maxSubdomains: editingUser.max_subdomains,
        }),
      });
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Failed to update limits.");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>User Management</h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>
          Approve pending user accounts, suspend users, and customize account capacity limits.
        </p>
      </div>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        {users.length === 0 ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>No users registered.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>User Email</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Role</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Max Tunnels</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Max Subdomains</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Registered At</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{u.email}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span className={u.role === "admin" ? "badge badge-admin" : "badge badge-active"}>{u.role}</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span className={u.status === "active" ? "badge badge-active" : u.status === "pending" ? "badge badge-pending" : "badge badge-disconnected"}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>{u.max_tunnels}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>{u.max_subdomains}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        {u.status === "pending" && (
                          <button onClick={() => handleUpdateStatus(u.id, "active")} className="btn-primary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}>
                            <CheckCircle size={14} /> Approve
                          </button>
                        )}
                        {u.status === "active" && (
                          <button onClick={() => handleUpdateStatus(u.id, "suspended")} className="btn-danger" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}>
                            <XCircle size={14} /> Suspend
                          </button>
                        )}
                        {u.status === "suspended" && (
                          <button onClick={() => handleUpdateStatus(u.id, "active")} className="btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}>
                            Unsuspend
                          </button>
                        )}
                        <button onClick={() => setEditingUser(u)} className="btn-secondary" style={{ padding: "0.3rem 0.5rem" }} title="Edit Limits">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Limits Modal */}
      {editingUser && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div className="glass-card" style={{ maxWidth: 420, width: "100%", padding: "1.75rem", position: "relative", backgroundColor: "#0f172a" }}>
            <button onClick={() => setEditingUser(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>
              Edit Capacity Limits for {editingUser.email}
            </h3>

            <form onSubmit={handleSaveLimits}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 6, color: "#cbd5e1" }}>
                  Max Concurrent Tunnels
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={editingUser.max_tunnels}
                  onChange={(e) => setEditingUser({ ...editingUser, max_tunnels: parseInt(e.target.value, 10) })}
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 6, color: "#cbd5e1" }}>
                  Max Reserved Subdomains
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={editingUser.max_subdomains}
                  onChange={(e) => setEditingUser({ ...editingUser, max_subdomains: parseInt(e.target.value, 10) })}
                  className="input-field"
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                <Save size={16} /> Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
