import React, { useEffect, useState } from "react";
import { Globe, Plus, Trash2, ShieldCheck, AlertCircle } from "lucide-react";
import { apiRequest } from "../services/api";

interface Subdomain {
  id: string;
  subdomain: string;
  fullDomain: string;
  status: string;
  createdAt: string;
}

export const SubdomainsPage: React.FC = () => {
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [subdomain, setSubdomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubdomains = async () => {
    try {
      const data = await apiRequest<any>("/v1/subdomains");
      const items = Array.isArray(data) ? data : data?.items || [];
      setSubdomains(items);
    } catch (err: any) {
      setError(err.message || "Failed to load subdomains.");
    }
  };

  useEffect(() => {
    fetchSubdomains();
  }, []);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomain.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await apiRequest("/v1/subdomains", {
        method: "POST",
        body: JSON.stringify({ subdomain: subdomain.trim() }),
      });
      setSubdomain("");
      fetchSubdomains();
    } catch (err: any) {
      setError(err.message || "Failed to reserve subdomain.");
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (id: string) => {
    if (!confirm("Are you sure you want to release this subdomain?")) return;
    try {
      await apiRequest(`/v1/subdomains/${id}`, { method: "DELETE" });
      fetchSubdomains();
    } catch (err: any) {
      alert(err.message || "Failed to release subdomain.");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Custom Subdomains</h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>
          Reserve dedicated subdomains on <code>tunnix.local</code> for consistent tunnel URLs.
        </p>
      </div>

      {/* Reservation Form */}
      <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Reserve New Subdomain</h2>

        {error && (
          <div style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#fca5a5", padding: "0.75rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleReserve} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260, display: "flex", alignItems: "center" }}>
            <input
              type="text"
              required
              placeholder="my-cool-app"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              className="input-field"
              style={{ borderRadius: "8px 0 0 8px" }}
            />
            <span style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderLeft: "none", padding: "0.65rem 1rem", borderRadius: "0 8px 8px 0", color: "#94a3b8", fontSize: "0.9rem" }}>
              .tunnix.local
            </span>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            <Plus size={18} />
            {loading ? "Reserving..." : "Reserve Subdomain"}
          </button>
        </form>
      </div>

      {/* Subdomain List */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Your Reserved Subdomains</h2>

        {subdomains.length === 0 ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>
            No subdomains reserved yet. Reserve your first custom subdomain above.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>Subdomain</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Full Domain</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Reserved At</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {subdomains.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#38bdf8" }}>{s.subdomain}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <code className="font-mono">{s.fullDomain}</code>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span className="badge badge-active">Reserved</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8" }}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <button onClick={() => handleRelease(s.id)} className="btn-danger" style={{ padding: "0.35rem 0.6rem" }}>
                        <Trash2 size={15} /> Release
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
