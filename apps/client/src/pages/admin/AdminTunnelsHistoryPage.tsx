import React, { useEffect, useState, useMemo } from "react";
import { History, RefreshCw } from "lucide-react";
import { apiRequest } from "../../services/api";

interface TunnelSession {
  id: string;
  user_id: string;
  user_email?: string;
  subdomain: string;
  status: string;
  local_port: number | null;
  public_url: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  pending: "#f59e0b",
  disconnected: "#64748b",
  revoked: "#ef4444",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function formatDuration(from: string | null, to: string | null): string {
  if (!from || !to) return "—";
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export const AdminTunnelsHistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<TunnelSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/v1/admin/tunnels?status=active,pending,disconnected,revoked");
      const items = Array.isArray(data) ? data : data?.items ?? data?.sessions ?? [];
      setSessions(items);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch = !search ||
        s.subdomain.toLowerCase().includes(search.toLowerCase()) ||
        (s.user_email ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sessions, search, statusFilter]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <History size={20} color="#6366f1" />
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>All Tunnel History</h1>
          </div>
          <p style={{ color: "#94a3b8" }}>All tunnel sessions across all users.</p>
        </div>
        <button onClick={fetchSessions} className="btn-secondary">
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Search subdomain or user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1", minWidth: 180 }}
        />
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="disconnected">Disconnected</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
          <History size={40} style={{ margin: "0 auto 1rem" }} />
          <p>No tunnel sessions match your filters.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b", color: "#64748b" }}>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>User</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Subdomain</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Port</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Status</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Connected</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Disconnected</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #0f172a" }}>
                  <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "0.8rem" }}>{s.user_email ?? s.user_id.slice(0, 8)}</td>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#a5b4fc" }}>{s.subdomain}</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{s.local_port ?? "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      background: STATUS_COLORS[s.status] + "20",
                      color: STATUS_COLORS[s.status],
                      borderRadius: 999,
                      padding: "2px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{formatDate(s.connected_at)}</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{formatDate(s.disconnected_at)}</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{formatDuration(s.connected_at, s.disconnected_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ color: "#475569", fontSize: "0.75rem", marginTop: "1rem" }}>
            {filtered.length} session{filtered.length !== 1 ? "s" : ""} shown
          </p>
        </div>
      )}
    </div>
  );
};
