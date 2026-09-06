import React, { useEffect, useState, useMemo } from "react";
import { FileText, RefreshCw, Search } from "lucide-react";
import { apiRequest } from "../../services/api";

interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata_json: string | null;
  created_at: string;
  actor_user_id: string | null;
  actor_user_email: string | null;
}

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/v1/admin/audit-logs?limit=50");
      const items = Array.isArray(data) ? data : data?.items ?? [];
      setLogs(items);
      setNextCursor(data?.nextCursor ?? null);
    } catch {
      setLogs([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await apiRequest<any>(`/v1/admin/audit-logs?limit=50&cursor=${encodeURIComponent(nextCursor)}`);
      const items = Array.isArray(data) ? data : data?.items ?? [];
      setLogs((prev) => [...prev, ...items]);
      setNextCursor(data?.nextCursor ?? null);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        (l.actor_user_email ?? "").toLowerCase().includes(q) ||
        (l.ip_address ?? "").toLowerCase().includes(q) ||
        (l.metadata_json ?? "").toLowerCase().includes(q),
    );
  }, [logs, search]);

  const parseMetadata = (json: string | null) => {
    if (!json) return null;
    try {
      const parsed = JSON.parse(json);
      if (Object.keys(parsed).length === 0) return null;
      return parsed;
    } catch {
      return json;
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={22} color="#6366f1" /> Security Audit Logs
          </h1>
          <p style={{ color: "#94a3b8", marginTop: 4 }}>
            Immutable chronological record of administrative actions, authentication attempts, and lifecycle events.
          </p>
        </div>
        <button onClick={fetchLogs} className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {/* Search Input */}
      <div style={{ position: "relative", marginBottom: "1.5rem", maxWidth: 420 }}>
        <Search size={16} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          className="input"
          placeholder="Filter by action, user, IP, or metadata..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", paddingLeft: "2.25rem" }}
        />
      </div>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        {loading ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: "3rem" }}>Loading audit logs...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: "3rem" }}>
            <FileText size={40} style={{ margin: "0 auto 1rem" }} />
            <p>No audit log entries found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                  <th style={{ padding: "0.6rem 0.8rem", width: 170 }}>Timestamp</th>
                  <th style={{ padding: "0.6rem 0.8rem", width: 190 }}>Event Action</th>
                  <th style={{ padding: "0.6rem 0.8rem", width: 180 }}>Actor</th>
                  <th style={{ padding: "0.6rem 0.8rem", width: 120 }}>IP Address</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const meta = parseMetadata(log.metadata_json);
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "0.6rem 0.8rem", color: "#94a3b8", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: "0.6rem 0.8rem" }}>
                        <span
                          className="badge badge-active"
                          style={{
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            textTransform: "none",
                            padding: "2px 8px",
                            backgroundColor: "rgba(99, 102, 241, 0.15)",
                            color: "#a5b4fc",
                            border: "1px solid rgba(99, 102, 241, 0.3)",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "0.6rem 0.8rem", fontWeight: 500, color: "#e2e8f0" }}>
                        {log.actor_user_email || (log.actor_user_id ? log.actor_user_id.slice(0, 8) : "System")}
                      </td>
                      <td style={{ padding: "0.6rem 0.8rem", color: "#64748b", fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {log.ip_address || "—"}
                      </td>
                      <td style={{ padding: "0.6rem 0.8rem", color: "#cbd5e1" }}>
                        {meta ? (
                          <code
                            className="font-mono"
                            style={{
                              fontSize: "0.75rem",
                              backgroundColor: "rgba(0,0,0,0.3)",
                              padding: "2px 6px",
                              borderRadius: 4,
                              display: "inline-block",
                              maxWidth: 380,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={typeof meta === "object" ? JSON.stringify(meta, null, 2) : meta}
                          >
                            {typeof meta === "object" ? JSON.stringify(meta) : meta}
                          </code>
                        ) : (
                          <span style={{ color: "#475569" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem" }}>
              <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                Showing {filtered.length} log entries
              </span>
              {nextCursor && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-secondary"
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                >
                  {loadingMore ? "Loading..." : "Load Older Logs"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
