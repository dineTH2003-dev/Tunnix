import React, { useEffect, useState } from "react";
import { FileText, Filter } from "lucide-react";
import { apiRequest } from "../../services/api";

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  const fetchLogs = async () => {
    try {
      const data = await apiRequest<any>("/v1/admin/audit-logs");
      const items = Array.isArray(data) ? data : data?.items || [];
      setLogs(items);
    } catch {
      setLogs([]);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Security Audit Logs</h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>
          Comprehensive trail of system authentication, token issuance, and administrative events.
        </p>
      </div>

      <div className="glass-card" style={{ padding: "1.5rem" }}>
        {logs.length === 0 ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>No audit log entries recorded.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Timestamp</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Event Type</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>User Email</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>IP Address</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.6rem 0.8rem", color: "#94a3b8" }}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{ padding: "0.6rem 0.8rem" }}>
                      <span className="badge badge-active" style={{ fontSize: "0.7rem" }}>{log.event_type}</span>
                    </td>
                    <td style={{ padding: "0.6rem 0.8rem", fontWeight: 500 }}>{log.user_email || log.user_id || "System"}</td>
                    <td style={{ padding: "0.6rem 0.8rem", color: "#64748b" }}>{log.ip_address || "127.0.0.1"}</td>
                    <td style={{ padding: "0.6rem 0.8rem", color: "#cbd5e1" }}>
                      <code className="font-mono" style={{ fontSize: "0.75rem" }}>{JSON.stringify(log.metadata || {})}</code>
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
