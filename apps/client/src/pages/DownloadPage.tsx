import React, { useState } from "react";
import { Download, Terminal, Check, Copy, Cpu, Sparkles, FolderDown } from "lucide-react";

export const DownloadPage: React.FC = () => {
  const [copiedOs, setCopiedOs] = useState<string | null>(null);

  const copyCmd = (cmd: string, osKey: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedOs(osKey);
    setTimeout(() => setCopiedOs(null), 2000);
  };

  const winScript = "iwr -useb http://localhost:4310/v1/download/install.ps1 | iex";
  const linuxScript = "curl -fsSL http://localhost:4310/v1/download/install.sh | sh";
  const macScript = "curl -fsSL http://localhost:4310/v1/download/install.sh | sh";

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Download Tunnix CLI</h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>
          Choose your preferred installation method: Direct executable download or automated terminal one-liner.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Windows Card */}
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Cpu size={24} color="#c084fc" />
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Windows (x64)</h2>
              </div>
              <span className="badge badge-active" style={{ fontSize: "0.75rem" }}>tunnix.exe</span>
            </div>

            {/* Method 1: Direct File Download */}
            <div style={{ backgroundColor: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 10, padding: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#c084fc", marginBottom: "0.4rem" }}>
                <FolderDown size={16} /> Method 1: Direct Executable Download
              </div>
              <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                Download standalone <code>tunnix.exe</code> binary to your Downloads folder and run manually.
              </p>
              <a
                href="http://localhost:4310/v1/download/windows"
                download="tunnix-windows-amd64.exe"
                className="btn-primary"
                id="btn-download-win-exe"
                style={{ width: "100%", justifyContent: "center", padding: "0.6rem", fontSize: "0.85rem", textDecoration: "none", background: "linear-gradient(135deg, #c084fc 0%, #6366f1 100%)" }}
              >
                <Download size={16} /> Download tunnix.exe (8.0 MB)
              </a>
            </div>

            {/* Method 2: One-Line Terminal Script */}
            <div style={{ backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#38bdf8", marginBottom: "0.4rem" }}>
                <Terminal size={16} /> Method 2: PowerShell Terminal One-Liner
              </div>
              <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                Automatically installs <code>tunnix.exe</code> and configures PATH:
              </p>
              <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "#090d16", padding: "0.6rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                <code className="font-mono" style={{ fontSize: "0.75rem", color: "#c084fc", flex: 1, overflowX: "auto", whiteSpace: "nowrap" }}>
                  {winScript}
                </code>
                <button onClick={() => copyCmd(winScript, "win")} className="btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>
                  {copiedOs === "win" ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Linux Card */}
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Cpu size={24} color="#38bdf8" />
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Linux (x86_64 / ARM64)</h2>
              </div>
              <span className="badge badge-active" style={{ fontSize: "0.75rem" }}>tunnix</span>
            </div>

            {/* Method 1: Direct File Download */}
            <div style={{ backgroundColor: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 10, padding: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#38bdf8", marginBottom: "0.4rem" }}>
                <FolderDown size={16} /> Method 1: Direct Binary Download
              </div>
              <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                Download standalone executable binary to run manually on Linux servers or desktop.
              </p>
              <a
                href="http://localhost:4310/v1/download/linux"
                download="tunnix-linux-amd64"
                className="btn-primary"
                id="btn-download-linux-bin"
                style={{ width: "100%", justifyContent: "center", padding: "0.6rem", fontSize: "0.85rem", textDecoration: "none" }}
              >
                <Download size={16} /> Download Linux Binary (8.0 MB)
              </a>
            </div>

            {/* Method 2: One-Line Terminal Script */}
            <div style={{ backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#38bdf8", marginBottom: "0.4rem" }}>
                <Terminal size={16} /> Method 2: Curl Terminal One-Liner
              </div>
              <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                Automatically installs binary to <code>/usr/local/bin/tunnix</code>:
              </p>
              <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "#090d16", padding: "0.6rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                <code className="font-mono" style={{ fontSize: "0.75rem", color: "#38bdf8", flex: 1, overflowX: "auto", whiteSpace: "nowrap" }}>
                  {linuxScript}
                </code>
                <button onClick={() => copyCmd(linuxScript, "linux")} className="btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>
                  {copiedOs === "linux" ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* macOS Card */}
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Cpu size={24} color="#818cf8" />
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>macOS (Intel / Apple Silicon)</h2>
              </div>
              <span className="badge badge-active" style={{ fontSize: "0.75rem" }}>tunnix</span>
            </div>

            {/* Method 1: Direct File Download */}
            <div style={{ backgroundColor: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: 10, padding: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#818cf8", marginBottom: "0.4rem" }}>
                <FolderDown size={16} /> Method 1: Direct Binary Download
              </div>
              <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                Download standalone macOS executable binary for Apple Silicon / Intel Mac.
              </p>
              <a
                href="http://localhost:4310/v1/download/mac"
                download="tunnix-darwin-arm64"
                className="btn-primary"
                id="btn-download-mac-bin"
                style={{ width: "100%", justifyContent: "center", padding: "0.6rem", fontSize: "0.85rem", textDecoration: "none", backgroundColor: "#6366f1" }}
              >
                <Download size={16} /> Download macOS Binary (7.6 MB)
              </a>
            </div>

            {/* Method 2: One-Line Terminal Script */}
            <div style={{ backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#818cf8", marginBottom: "0.4rem" }}>
                <Terminal size={16} /> Method 2: Terminal Script One-Liner
              </div>
              <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                Automated installation script for zsh / bash:
              </p>
              <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "#090d16", padding: "0.6rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                <code className="font-mono" style={{ fontSize: "0.75rem", color: "#818cf8", flex: 1, overflowX: "auto", whiteSpace: "nowrap" }}>
                  {macScript}
                </code>
                <button onClick={() => copyCmd(macScript, "mac")} className="btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>
                  {copiedOs === "mac" ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Instructions */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles size={18} color="#38bdf8" /> How to Run After Downloading
        </h2>
        <ol style={{ paddingLeft: "1.25rem", color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.8 }}>
          <li>If you downloaded the binary manually (Method 1), open your terminal inside the download folder.</li>
          <li>Authenticate with your agent token: <code>tunnix login &lt;agent-token&gt;</code> (or <code>.\tunnix.exe login &lt;agent-token&gt;</code> on Windows).</li>
          <li>Start tunneling any local port: <code>tunnix http 3000</code></li>
        </ol>
      </div>
    </div>
  );
};
