import React, { useState, useEffect } from "react";
import {
  User,
  HardDrive,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Save,
  Shield,
  Clock,
  Terminal,
  LucideIcon,
} from "lucide-react";
import { useAuth } from "../store/authContext";
import { useTheme, Theme } from "../store/themeContext";
import { AccountIdenticon } from "../components/AccountIdenticon";
import { apiRequest } from "../services/api";

function formatAllowedPlatforms(platformsStr?: string): string {
  if (!platformsStr) return "All Platforms";
  const map: Record<string, string> = {
    windows: "Windows",
    linux: "Linux",
    mac: "macOS",
    "mac-intel": "macOS (Intel)",
  };
  return platformsStr
    .split(",")
    .map((p) => map[p.trim()] ?? p.trim())
    .join(", ");
}

export const SettingsPage: React.FC = () => {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 80) {
      setErrorMsg("Display name must be between 2 and 80 characters.");
      setSuccessMsg("");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const updated = await apiRequest<{
        id: string;
        email: string;
        role: "admin" | "user";
        status: "pending" | "active" | "suspended";
        name: string;
        maxTunnels: number;
        maxSubdomains: number;
        createdAt: string;
      }>("/v1/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name: trimmed }),
      });

      if (user) {
        setUser({
          ...user,
          name: updated.name,
        });
      }

      setSuccessMsg("Profile display name saved successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const themeOptions: { value: Theme; label: string; icon: LucideIcon }[] = [
    { value: "dark", label: "Dark Mode", icon: Moon },
    { value: "light", label: "Light Mode", icon: Sun },
    { value: "system", label: "System Sync", icon: Laptop },
  ];

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Account & Preferences</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Manage your personal profile, workspace appearance, and account capacity limits.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* Profile Card & Avatar */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <User size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Profile Information</h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", background: "var(--bg-card-hover)", borderRadius: 10 }}>
            <AccountIdenticon identifier={user?.id || user?.email} size={56} />
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>{user?.name || "Anonymous User"}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{user?.email}</p>
              <div style={{ display: "flex", gap: "0.4rem", marginTop: 4 }}>
                <span className={user?.role === "admin" ? "badge badge-admin" : "badge badge-active"}>
                  {user?.role}
                </span>
                <span className="badge badge-active">{user?.status}</span>
              </div>
            </div>
          </div>

          {successMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0.75rem 1rem",
                borderRadius: 8,
                background: "rgba(34, 197, 94, 0.15)",
                color: "#4ade80",
                fontSize: "0.875rem",
                marginBottom: "1rem",
                border: "1px solid rgba(34, 197, 94, 0.3)",
              }}
            >
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0.75rem 1rem",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.15)",
                color: "#fca5a5",
                fontSize: "0.875rem",
                marginBottom: "1rem",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 6 }}>
                Full Name / Display Name
              </label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 6 }}>
                Email Address
              </label>
              <input
                className="input"
                type="email"
                value={user?.email || ""}
                disabled
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
              <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                Email cannot be modified directly in the passwordless OTP security model.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="submit"
                disabled={saving || name.trim() === (user?.name || "")}
                className="btn-primary"
              >
                <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Theme Preference Card */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <Sun size={22} color="var(--accent-purple)" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Workspace Appearance</h2>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            Customize your visual theme across the Tunnix Control Plane dashboard.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "1rem 0.5rem",
                    borderRadius: 10,
                    border: isSelected ? "2px solid var(--accent-indigo)" : "1px solid var(--border-subtle)",
                    backgroundColor: isSelected ? "rgba(99, 102, 241, 0.15)" : "var(--bg-card-hover)",
                    color: isSelected ? "var(--accent-indigo)" : "var(--text-main)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  <Icon size={20} />
                  <span style={{ fontSize: "0.8rem" }}>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={15} /> Member Since
              </span>
              <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <Terminal size={15} /> Agent Platforms
              </span>
              <span style={{ fontWeight: 500 }}>{formatAllowedPlatforms(user?.role === "admin" ? "All Platforms" : "windows,linux,mac")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <Shield size={15} /> Authentication
              </span>
              <span style={{ color: "#4ade80" }}>OTP Verified</span>
            </div>
          </div>
        </div>

        {/* Resource Limits & Quotas Card */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <HardDrive size={22} color="var(--accent-indigo)" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Capacity Quotas</h2>
          </div>

          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            Your account limits are governed by the platform administrator.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Concurrent Live Tunnels</span>
                <span style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{user?.maxTunnels ?? 3} Max</span>
              </div>
              <div style={{ height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%", backgroundColor: "var(--accent-cyan)" }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Reserved Custom Subdomains</span>
                <span style={{ fontWeight: 700, color: "var(--accent-indigo)" }}>{user?.maxSubdomains ?? 3} Max</span>
              </div>
              <div style={{ height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%", backgroundColor: "var(--accent-indigo)" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
