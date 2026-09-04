import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  Globe,
  Radio,
  Key,
  ShieldCheck,
  Terminal,
  ArrowRight,
  Download,
  Copy,
  Check,
  Cpu,
  Layers,
  Sparkles,
  Lock,
} from "lucide-react";
import { useAuth } from "../store/authContext";

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedOs, setCopiedOs] = useState<string | null>(null);

  const heroCommand = "tunnix http 3000";

  const copyHeroCmd = () => {
    navigator.clipboard.writeText(heroCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const copyOsCmd = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedOs(key);
    setTimeout(() => setCopiedOs(null), 2000);
  };

  const linuxInstall = "curl -fsSL https://tunnix.local/install.sh | sh";
  const macInstall = "brew install tunnix/tap/tunnix";
  const winInstall = "iwr -useb https://tunnix.local/install.ps1 | iex";

  return (
    <div style={{ backgroundColor: "#07090e", color: "#f8fafc", minHeight: "100vh" }}>
      {/* Navigation Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "rgba(7, 9, 14, 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "1rem 2rem",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(99,102,241,0.5)",
              }}
            >
              <Zap size={24} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
                Tunnix
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "0.65rem",
                  color: "#38bdf8",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}
              >
                Tunnel Platform
              </span>
            </div>
          </Link>

          {/* Navigation Anchors */}
          <nav style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
            <a href="#features" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>
              Features
            </a>
            <a href="#how-it-works" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>
              How It Works
            </a>
            <a href="#cli" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>
              Download CLI
            </a>
          </nav>

          {/* Action Button */}
          <div>
            {user ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="btn-primary"
                id="btn-nav-dashboard"
                style={{ padding: "0.55rem 1.2rem", fontSize: "0.9rem" }}
              >
                Go to Dashboard
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="btn-primary"
                id="btn-nav-signin"
                style={{ padding: "0.55rem 1.2rem", fontSize: "0.9rem" }}
              >
                Sign In / Launch App
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: "5rem 1.5rem 4rem",
          textAlign: "center",
          backgroundImage: "radial-gradient(circle at 50% 20%, rgba(99,102,241,0.18) 0%, transparent 70%)",
        }}
      >
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
          {/* Pill Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#818cf8",
              padding: "0.4rem 1rem",
              borderRadius: 50,
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "1.75rem",
            }}
          >
            <Sparkles size={16} />
            Next-Generation Secure Tunneling Platform
          </div>

          <h1
            style={{
              fontSize: "3.25rem",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              marginBottom: "1.25rem",
            }}
          >
            Expose Local Servers to the Public Internet <span className="text-gradient">Securely</span>
          </h1>

          <p
            style={{
              fontSize: "1.15rem",
              color: "#94a3b8",
              maxWidth: 680,
              margin: "0 auto 2.5rem",
              lineHeight: 1.6,
            }}
          >
            Instant public URLs for your local web applications, APIs, and Webhooks. No complex NAT configuration or firewall port-forwarding required.
          </p>

          {/* Hero CTAs */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginBottom: "3rem", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
              className="btn-primary"
              id="hero-cta-start"
              style={{ padding: "0.75rem 1.75rem", fontSize: "1rem", borderRadius: 10 }}
            >
              {user ? "Open Workspace" : "Get Started Free"}
              <ArrowRight size={18} />
            </button>
            <a
              href="#cli"
              className="btn-secondary"
              id="hero-cta-cli"
              style={{ padding: "0.75rem 1.75rem", fontSize: "1rem", borderRadius: 10, textDecoration: "none" }}
            >
              <Download size={18} />
              Download Agent CLI
            </a>
          </div>

          {/* Terminal Command Widget */}
          <div
            className="glass-card"
            style={{
              maxWidth: 580,
              margin: "0 auto",
              padding: "1rem 1.25rem",
              textAlign: "left",
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 12,
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ef4444" }}></span>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#eab308" }}></span>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22c55e" }}></span>
                <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: 8, fontFamily: "monospace" }}>
                  bash — tunnix cli
                </span>
              </div>
              <button
                onClick={copyHeroCmd}
                className="btn-secondary"
                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
              >
                {copiedCmd ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                {copiedCmd ? "Copied!" : "Copy"}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Terminal size={18} color="#38bdf8" />
              <code className="font-mono" style={{ color: "#38bdf8", fontSize: "1.05rem", flex: 1 }}>
                {heroCommand}
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "#0b0f19",
          padding: "2.5rem 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "2rem",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#38bdf8" }}>99.99%</div>
            <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4 }}>Control Plane Uptime</div>
          </div>
          <div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#818cf8" }}>&lt; 10ms</div>
            <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4 }}>Proxy Ingress Latency</div>
          </div>
          <div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#4ade80" }}>Zero Config</div>
            <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4 }}>Instant Port Forwarding</div>
          </div>
          <div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#c084fc" }}>Cross-Platform</div>
            <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4 }}>Linux, macOS & Windows</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: "5rem 1.5rem", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 700 }}>Built for Developers & Platform Operators</h2>
          <p style={{ color: "#94a3b8", marginTop: "0.5rem", fontSize: "1rem" }}>
            Everything you need to manage secure tunnel connections across teams and infrastructure.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {/* Card 1 */}
          <div className="glass-card" style={{ padding: "1.75rem" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: "rgba(56,189,248,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}
            >
              <Radio size={24} color="#38bdf8" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>Instant Public Routing</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Route public HTTP/HTTPS traffic directly to your local development environment with custom `.tunnix.local` domain URLs.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card" style={{ padding: "1.75rem" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: "rgba(99,102,241,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}
            >
              <Globe size={24} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>Reserved Subdomains</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Lock in dedicated subdomains for your projects so webhook endpoints and team links never change between restarts.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card" style={{ padding: "1.75rem" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: "rgba(34,197,94,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}
            >
              <Key size={24} color="#4ade80" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>Scoped Agent Tokens</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Generate named agent tokens to authenticate CLI instances safely across desktop workstations and CI servers.
            </p>
          </div>

          {/* Card 4 */}
          <div className="glass-card" style={{ padding: "1.75rem" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: "rgba(192,132,252,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}
            >
              <ShieldCheck size={24} color="#c084fc" />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>Admin & Audit Logging</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Full administrative console with user capacity management, rate-limiting, and immutable security audit logs.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        style={{
          backgroundColor: "#0b0f19",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "5rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 700 }}>Get Started in 3 Simple Steps</h2>
            <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>
              From download to live public URL in less than 60 seconds.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
            {/* Step 1 */}
            <div className="glass-card" style={{ padding: "1.75rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Step 01
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.75rem" }}>Download Agent CLI</h3>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Install the lightweight executable for Linux, macOS, or Windows.
              </p>
              <div style={{ backgroundColor: "rgba(15,23,42,0.9)", padding: "0.6rem 0.75rem", borderRadius: 6 }}>
                <code className="font-mono" style={{ fontSize: "0.75rem", color: "#38bdf8" }}>
                  curl -fsSL ... | sh
                </code>
              </div>
            </div>

            {/* Step 2 */}
            <div className="glass-card" style={{ padding: "1.75rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Step 02
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.75rem" }}>Authenticate Agent</h3>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Link your local CLI with your Tunnix account using your agent token.
              </p>
              <div style={{ backgroundColor: "rgba(15,23,42,0.9)", padding: "0.6rem 0.75rem", borderRadius: 6 }}>
                <code className="font-mono" style={{ fontSize: "0.75rem", color: "#818cf8" }}>
                  tunnix login &lt;token&gt;
                </code>
              </div>
            </div>

            {/* Step 3 */}
            <div className="glass-card" style={{ padding: "1.75rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Step 03
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.75rem" }}>Expose Any Local Port</h3>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Tunnel your local web server port and get a secure live domain URL.
              </p>
              <div style={{ backgroundColor: "rgba(15,23,42,0.9)", padding: "0.6rem 0.75rem", borderRadius: 6 }}>
                <code className="font-mono" style={{ fontSize: "0.75rem", color: "#4ade80" }}>
                  tunnix http 3000
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download CLI Section */}
      <section id="cli" style={{ padding: "5rem 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 700 }}>Download Agent CLI</h2>
          <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>
            Choose your preferred installation method: Direct executable binary download or automated terminal script.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {/* Windows */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Cpu size={24} color="#c084fc" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Windows (x64)</h3>
              </div>
              <span className="badge badge-active" style={{ fontSize: "0.7rem" }}>tunnix.exe</span>
            </div>

            <a
              href="http://localhost:4310/v1/download/windows"
              download="tunnix-windows-amd64.exe"
              className="btn-primary"
              id="landing-download-win-exe"
              style={{ width: "100%", justifyContent: "center", padding: "0.55rem", fontSize: "0.85rem", marginBottom: "1rem", textDecoration: "none", background: "linear-gradient(135deg, #c084fc 0%, #6366f1 100%)" }}
            >
              <Download size={16} /> Download tunnix.exe (8.0 MB)
            </a>

            <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.4rem" }}>Or run PowerShell installer script:</div>
            <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "rgba(15,23,42,0.9)", padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <code className="font-mono" style={{ fontSize: "0.72rem", color: "#c084fc", flex: 1, overflowX: "auto", whiteSpace: "nowrap" }}>
                iwr -useb http://localhost:4310/v1/download/install.ps1 | iex
              </code>
              <button onClick={() => copyOsCmd("iwr -useb http://localhost:4310/v1/download/install.ps1 | iex", "win")} className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                {copiedOs === "win" ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Linux */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Cpu size={24} color="#38bdf8" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Linux (x86_64 / ARM64)</h3>
              </div>
              <span className="badge badge-active" style={{ fontSize: "0.7rem" }}>tunnix</span>
            </div>

            <a
              href="http://localhost:4310/v1/download/linux"
              download="tunnix-linux-amd64"
              className="btn-primary"
              id="landing-download-linux-bin"
              style={{ width: "100%", justifyContent: "center", padding: "0.55rem", fontSize: "0.85rem", marginBottom: "1rem", textDecoration: "none" }}
            >
              <Download size={16} /> Download Linux Binary (8.0 MB)
            </a>

            <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.4rem" }}>Or run shell installer script:</div>
            <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "rgba(15,23,42,0.9)", padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <code className="font-mono" style={{ fontSize: "0.72rem", color: "#38bdf8", flex: 1, overflowX: "auto", whiteSpace: "nowrap" }}>
                curl -fsSL http://localhost:4310/v1/download/install.sh | sh
              </code>
              <button onClick={() => copyOsCmd("curl -fsSL http://localhost:4310/v1/download/install.sh | sh", "linux")} className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                {copiedOs === "linux" ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* macOS */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Cpu size={24} color="#818cf8" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>macOS (Intel / Apple Silicon)</h3>
              </div>
              <span className="badge badge-active" style={{ fontSize: "0.7rem" }}>tunnix</span>
            </div>

            <a
              href="http://localhost:4310/v1/download/mac"
              download="tunnix-darwin-arm64"
              className="btn-primary"
              id="landing-download-mac-bin"
              style={{ width: "100%", justifyContent: "center", padding: "0.55rem", fontSize: "0.85rem", marginBottom: "1rem", textDecoration: "none", backgroundColor: "#6366f1" }}
            >
              <Download size={16} /> Download macOS Binary (7.6 MB)
            </a>

            <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.4rem" }}>Or run shell installer script:</div>
            <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "rgba(15,23,42,0.9)", padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <code className="font-mono" style={{ fontSize: "0.72rem", color: "#818cf8", flex: 1, overflowX: "auto", whiteSpace: "nowrap" }}>
                curl -fsSL http://localhost:4310/v1/download/install.sh | sh
              </code>
              <button onClick={() => copyOsCmd("curl -fsSL http://localhost:4310/v1/download/install.sh | sh", "mac")} className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                {copiedOs === "mac" ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "#07090e",
          padding: "2.5rem 1.5rem",
          color: "#64748b",
          fontSize: "0.85rem",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Zap size={20} color="#6366f1" />
            <span style={{ color: "#cbd5e1", fontWeight: 600 }}>Tunnix Ingress Platform</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="pulse-dot"></span>
            <span>Control Plane & Ingress Gateway Operational</span>
          </div>

          <div>&copy; {new Date().getFullYear()} Tunnix. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
