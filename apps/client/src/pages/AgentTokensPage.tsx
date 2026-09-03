import React, { useEffect, useState } from "react";
import { Key, Plus, Trash2, Copy, Check, ShieldAlert, X } from "lucide-react";
import { apiRequest } from "../services/api";

interface AgentToken {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export const AgentTokensPage: React.FC = () => {
  const [tokens, setTokens] = useState<AgentToken[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single-view generated token modal state
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTokens = async () => {
    try {
      const data = await apiRequest<any>("/v1/agent-tokens");
      const items = Array.isArray(data) ? data : data?.items || [];
      setTokens(items);
    } catch (err: any) {
      setError(err.message || "Failed to load agent tokens.");
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ id: string; name: string; token: string }>("/v1/agent-tokens", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setCreatedToken(res.token);
      setName("");
      fetchTokens();
    } catch (err: any) {
      setError(err.message || "Failed to create agent token.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this agent token?")) return;
    try {
      await apiRequest(`/v1/agent-tokens/${id}`, { method: "DELETE" });
      fetchTokens();
    } catch (err: any) {
      alert(err.message || "Failed to revoke token.");
    }
  };

  const copyToken = () => {
    if (!createdToken) return;
    navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Agent Tokens</h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>
          Generate named tokens to authenticate the <code>tunnix</code> CLI on your development machines.
        </p>
      </div>

      {/* Creation Form */}
      <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Create New Agent Token</h2>

        {error && (
          <div style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#fca5a5", padding: "0.75rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input
            type="text"
            required
            placeholder="e.g. macbook-pro-cli"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            style={{ flex: 1, minWidth: 240 }}
          />
          <button type="submit" disabled={loading} className="btn-primary">
            <Plus size={18} />
            {loading ? "Generating..." : "Generate Token"}
          </button>
        </form>
      </div>

      {/* Token List */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Your Active Agent Tokens</h2>

        {tokens.length === 0 ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>
            No agent tokens found. Create one above to get started.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>Name</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Prefix</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Last Used</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Created At</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{t.name}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <code className="font-mono" style={{ color: "#38bdf8" }}>{t.tokenPrefix}...</code>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8" }}>
                      {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : "Never"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8" }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <button onClick={() => handleRevoke(t.id)} className="btn-danger" style={{ padding: "0.35rem 0.6rem" }}>
                        <Trash2 size={15} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generated Token Modal */}
      {createdToken && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div className="glass-card" style={{ maxWidth: 500, width: "100%", padding: "2rem", position: "relative", backgroundColor: "#0f172a" }}>
            <button onClick={() => setCreatedToken(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", color: "#fbbf24" }}>
              <ShieldAlert size={26} />
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc" }}>Copy Agent Token Now</h3>
            </div>

            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Make sure to copy your agent token now. You won't be able to see it again!
            </p>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <input type="text" readOnly value={createdToken} className="input-field font-mono" style={{ fontSize: "0.85rem", color: "#38bdf8" }} />
              <button onClick={copyToken} className="btn-primary">
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <button onClick={() => setCreatedToken(null)} className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
              I have saved this token safely
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
