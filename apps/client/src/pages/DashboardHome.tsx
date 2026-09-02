import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, Globe, Key, Copy, Check, Terminal, ArrowUpRight } from "lucide-react";
import { apiRequest } from "../services/api";
import { useAuth } from "../store/authContext";

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const [tokensCount, setTokensCount] = useState(0);
  const [subdomainsCount, setSubdomainsCount] = useState(0);
  const [activeTunnels, setActiveTunnels] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiRequest<any[]>("/v1/agent-tokens").then((res) => setTokensCount(res.length)).catch(() => {});
    apiRequest<any[]>("/v1/subdomains").then((res) => setSubdomainsCount(res.length)).catch(() => {});
    apiRequest<any[]>("/v1/tunnel/sessions").then((res) => setActiveTunnels(res)).catch(() => {});
  }, []);

  const copyQuickStart = () => {
    navigator.clipboard.writeText("tunnix http 3000");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
          Welcome back, <span className="text-gradient">{user?.name || user?.email.split("@")[0]}</span>
        </h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>
          Manage your active tunnels, agent tokens, and custom subdomains.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Active Tunnels</span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Radio size={20} color="#4ade80" />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.5rem" }}>
            {activeTunnels.length} <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 400 }}>/ {user?.maxTunnels} limit</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Reserved Subdomains</span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Globe size={20} color="#818cf8" />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.5rem" }}>
            {subdomainsCount} <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 400 }}>/ {user?.maxSubdomains} limit</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>Agent Tokens</span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(6,182,212,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Key size={20} color="#22d3ee" />
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.5rem" }}>
            {tokensCount}
          </div>
        </div>
      </div>

      {/* Quick Start Card */}
      <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <Terminal size={22} color="#38bdf8" />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Quick Start CLI Command</h2>
        </div>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Expose a web server running locally on port 3000 with a single command:
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "rgba(15,23,42,0.9)", padding: "0.75rem 1rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
          <code className="font-mono" style={{ color: "#38bdf8", flex: 1, fontSize: "0.95rem" }}>
            tunnix http 3000
          </code>
          <button onClick={copyQuickStart} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>
            {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Active Tunnels Table Preview */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Live Active Tunnels</h2>
          <Link to="/tunnels" style={{ color: "#38bdf8", fontSize: "0.85rem", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            View All <ArrowUpRight size={16} />
          </Link>
        </div>

        {activeTunnels.length === 0 ? (
          <div style={{ textDecoration: "none", color: "#64748b", padding: "2rem", textAlign: "center", fontSize: "0.9rem" }}>
            No live tunnels currently connected. Run <code>tunnix http &lt;port&gt;</code> in your terminal.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>Public Domain</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Target Port</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {activeTunnels.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#38bdf8" }}>
                      <a href={t.public_url} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", textDecoration: "none" }}>
                        {t.subdomain}.tunnix.local
                      </a>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>localhost:{t.local_port}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span className="badge badge-active">
                        <span className="pulse-dot"></span> Active
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8" }}>{new Date(t.created_at).toLocaleString()}</td>
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
