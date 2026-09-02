import React, { useState } from "react";
import { Download, Terminal, Check, Copy, Shield, Cpu } from "lucide-react";

export const DownloadPage: React.FC = () => {
  const [copiedOs, setCopiedOs] = useState<string | null>(null);

  const copyCmd = (cmd: string, osKey: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedOs(osKey);
    setTimeout(() => setCopiedOs(null), 2000);
  };

  const linuxCmd = "curl -fsSL https://tunnix.local/install.sh | sh";
  const macCmd = "brew install tunnix/tap/tunnix";
  const winCmd = "iwr -useb https://tunnix.local/install.ps1 | iex";

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Download Tunnix CLI</h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>
          Install the lightweight Go binary for your operating system.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Linux Card */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Cpu size={24} color="#38bdf8" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Linux (x86_64 / ARM64)</h2>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Install via automated shell script:
          </p>
          <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "rgba(15,23,42,0.9)", padding: "0.65rem 0.85rem", borderRadius: 8 }}>
            <code className="font-mono" style={{ fontSize: "0.8rem", color: "#38bdf8", flex: 1, overflowX: "auto" }}>
              {linuxCmd}
            </code>
            <button onClick={() => copyCmd(linuxCmd, "linux")} className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
              {copiedOs === "linux" ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* macOS Card */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Cpu size={24} color="#818cf8" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>macOS (Intel / Apple Silicon)</h2>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Install via Homebrew tap:
          </p>
          <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "rgba(15,23,42,0.9)", padding: "0.65rem 0.85rem", borderRadius: 8 }}>
            <code className="font-mono" style={{ fontSize: "0.8rem", color: "#818cf8", flex: 1, overflowX: "auto" }}>
              {macCmd}
            </code>
            <button onClick={() => copyCmd(macCmd, "mac")} className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
              {copiedOs === "mac" ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Windows Card */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Cpu size={24} color="#c084fc" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Windows (PowerShell)</h2>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Install via PowerShell script:
          </p>
          <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "rgba(15,23,42,0.9)", padding: "0.65rem 0.85rem", borderRadius: 8 }}>
            <code className="font-mono" style={{ fontSize: "0.8rem", color: "#c084fc", flex: 1, overflowX: "auto" }}>
              {winCmd}
            </code>
            <button onClick={() => copyCmd(winCmd, "win")} className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
              {copiedOs === "win" ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Verification instructions */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Verify Installation</h2>
        <ol style={{ paddingLeft: "1.25rem", color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.8 }}>
          <li>Open terminal and run <code>tunnix version</code> to verify binary is installed.</li>
          <li>Authenticate with your agent token: <code>tunnix login &lt;agent-token&gt;</code></li>
          <li>Start tunneling: <code>tunnix http 3000</code></li>
        </ol>
      </div>
    </div>
  );
};
