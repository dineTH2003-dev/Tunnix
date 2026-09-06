import React, { useEffect, useState, useMemo } from "react";
import { Globe, RefreshCw, Trash2, Shield, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/api";

interface ReservedSubdomain {
  id: string;
  subdomain: string;
  status: "active" | "released";
  created_at: string;
  updated_at: string;
  user_id: string | null;
  user_email: string | null;
}

export const AdminSubdomainsPage: React.FC = () => {
  const [subdomains, setSubdomains] = useState<ReservedSubdomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchSubdomains = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/v1/admin/subdomains");
      const items = Array.isArray(data) ? data : data?.subdomains ?? data?.items ?? [];
      setSubdomains(items);
    } catch {
      setSubdomains([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubdomains();
  }, []);

  const handleRelease = async (id: string, subdomain: string) => {
    if (!confirm(`Are you sure you want to release the subdomain "${subdomain}"? The user will lose their reservation.`)) {
      return;
    }

    try {
      await apiRequest(`/v1/admin/subdomains/${id}`, { method: "DELETE" });
      fetchSubdomains();
    } catch (err: any) {
      alert(err.message || "Failed to release subdomain.");
    }
  };

  const filtered = useMemo(() => {
    return subdomains.filter((s) => {
      const matchesSearch =
        !search ||
        s.subdomain.toLowerCase().includes(search.toLowerCase()) ||
        (s.user_email ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subdomains, search, statusFilter]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Globe size={22} color="#6366f1" /> Reserved Subdomains
          </h1>
          <p style={{ color: "#94a3b8", marginTop: 4 }}>
            Overview of all subdomains reserved across the platform by active users.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            to="/admin/subdomains/blocked"
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
          >
            <Shield size={16} color="#ef4444" /> Blocked Subdomains
          </Link>
          <button onClick={fetchSubdomains} className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1", minWidth: 220 }}>
          <Search size={16} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            className="input"
            placeholder="Search by subdomain or owner email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", paddingLeft: "2.25rem" }}
          />
        </div>
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="released">Released Only</option>
        </select>
      </div>

      {/* Subdomains Table */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading reserved subdomains...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
            <Globe size={40} style={{ margin: "0 auto 1rem" }} />
            <p>No reserved subdomains match your search.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>Subdomain</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Owner</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Reserved At</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ color: "#38bdf8", fontWeight: 600, fontFamily: "monospace", fontSize: "0.95rem" }}>
                        {r.subdomain}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#cbd5e1" }}>
                      {r.user_email || (r.user_id ? r.user_id.slice(0, 8) : "System")}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        className={`badge ${r.status === "active" ? "badge-active" : "badge-inactive"}`}
                        style={{ textTransform: "capitalize" }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontSize: "0.8rem" }}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      {r.status === "active" ? (
                        <button
                          onClick={() => handleRelease(r.id, r.subdomain)}
                          className="btn-danger"
                          style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Trash2 size={13} /> Release
                        </button>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>Released</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#64748b" }}>
              Showing {filtered.length} of {subdomains.length} reservation{subdomains.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
