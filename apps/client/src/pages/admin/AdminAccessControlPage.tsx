import React, { useEffect, useState } from "react";
import { Lock, Globe, Plus, Trash2, RefreshCw, Save } from "lucide-react";
import { apiRequest } from "../../services/api";

interface AuthSettings {
  otpTtlSeconds: number;
  otpRequestCooldownSeconds: number;
  otpEmailWindowSeconds: number;
  otpEmailWindowMax: number;
  otpIpWindowSeconds: number;
  otpIpWindowMax: number;
  otpMaxFailedAttempts: number;
  defaultUserMaxTunnels: number;
  defaultUserMaxSubdomains: number;
  requireAdminApproval: boolean;
  restrictEmailDomains: boolean;
}

interface AllowedDomain {
  id: string;
  domain: string;
  created_by_user_email: string | null;
  created_at: string;
}

export const AdminAccessControlPage: React.FC = () => {
  const [settings, setSettings] = useState<AuthSettings | null>(null);
  const [domains, setDomains] = useState<AllowedDomain[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [form, setForm] = useState<AuthSettings | null>(null);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const data = await apiRequest<any>("/v1/admin/auth-settings");
      const s = data?.settings ?? data;
      setSettings(s);
      setForm(s);
    } catch {
      setSettings(null);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchDomains = async () => {
    setLoadingDomains(true);
    try {
      const data = await apiRequest<any>("/v1/admin/allowed-email-domains");
      const items = Array.isArray(data) ? data : data?.domains ?? data?.items ?? [];
      setDomains(items);
    } catch {
      setDomains([]);
    } finally {
      setLoadingDomains(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchDomains();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSavingSettings(true);
    try {
      await apiRequest("/v1/admin/auth-settings", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      fetchSettings();
    } catch (err: any) {
      alert(err.message || "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = newDomain.trim().toLowerCase();
    if (!d) return;
    setAddingDomain(true);
    try {
      await apiRequest("/v1/admin/allowed-email-domains", {
        method: "POST",
        body: JSON.stringify({ domain: d }),
      });
      setNewDomain("");
      fetchDomains();
    } catch (err: any) {
      alert(err.message || "Failed to add domain.");
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteDomain = async (id: string, domain: string) => {
    if (!confirm(`Remove allowed domain "${domain}"? Users with this domain may lose access.`)) return;
    try {
      await apiRequest(`/v1/admin/allowed-email-domains/${id}`, { method: "DELETE" });
      fetchDomains();
    } catch (err: any) {
      alert(err.message || "Failed to remove domain.");
    }
  };

  const updateForm = (key: keyof AuthSettings, value: number | boolean) => {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Lock size={22} color="#6366f1" /> Access Control
        </h1>
        <p style={{ color: "#94a3b8", marginTop: 4 }}>Manage allowed email domains and authentication security settings.</p>
      </div>

      {/* Allowed Email Domains */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 6 }}>
          <Globe size={16} /> Allowed Email Domains
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Only users with email addresses from these domains can sign in.
        </p>

        <form onSubmit={handleAddDomain} style={{ display: "flex", gap: 12, marginBottom: "1.5rem" }}>
          <input
            className="input"
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={addingDomain} className="btn-primary" style={{ whiteSpace: "nowrap" }}>
            <Plus size={14} /> {addingDomain ? "Adding..." : "Add Domain"}
          </button>
        </form>

        {loadingDomains ? (
          <div style={{ color: "#64748b" }}>Loading domains...</div>
        ) : domains.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: "0.875rem" }}>No domains configured — all email domains are allowed.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b", color: "#64748b" }}>
                <th style={{ textAlign: "left", padding: "6px 12px" }}>Domain</th>
                <th style={{ textAlign: "left", padding: "6px 12px" }}>Added By</th>
                <th style={{ textAlign: "left", padding: "6px 12px" }}>Added At</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid #0f172a" }}>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#a5b4fc" }}>{d.domain}</td>
                  <td style={{ padding: "8px 12px", color: "#94a3b8", fontSize: "0.8rem" }}>{d.created_by_user_email ?? "—"}</td>
                  <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{new Date(d.created_at).toLocaleString()}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <button
                      onClick={() => handleDeleteDomain(d.id, d.domain)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Auth Security Settings */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={16} /> Security Settings
        </h2>

        {loadingSettings || !form ? (
          <div style={{ color: "#64748b" }}>Loading settings...</div>
        ) : (
          <form onSubmit={handleSaveSettings}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: "1.5rem" }}>
              {[
                { label: "OTP TTL (seconds)", key: "otpTtlSeconds" as const },
                { label: "OTP Cooldown (seconds)", key: "otpRequestCooldownSeconds" as const },
                { label: "OTP Email Window (seconds)", key: "otpEmailWindowSeconds" as const },
                { label: "Max OTPs per Email/Window", key: "otpEmailWindowMax" as const },
                { label: "OTP IP Window (seconds)", key: "otpIpWindowSeconds" as const },
                { label: "Max OTPs per IP/Window", key: "otpIpWindowMax" as const },
                { label: "Max Failed OTP Attempts", key: "otpMaxFailedAttempts" as const },
                { label: "Default Max Tunnels", key: "defaultUserMaxTunnels" as const },
                { label: "Default Max Subdomains", key: "defaultUserMaxSubdomains" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>{label}</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form[key] as number}
                    onChange={(e) => updateForm(key, Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 24, marginBottom: "1.5rem", flexWrap: "wrap" }}>
              {[
                { label: "Require Admin Approval for new users", key: "requireAdminApproval" as const },
                { label: "Restrict email domains (use allowlist above)", key: "restrictEmailDomains" as const },
              ].map(({ label, key }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.875rem" }}>
                  <input
                    type="checkbox"
                    checked={form[key] as boolean}
                    onChange={(e) => updateForm(key, e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  {label}
                </label>
              ))}
            </div>

            <button type="submit" disabled={savingSettings} className="btn-primary">
              <Save size={14} /> {savingSettings ? "Saving..." : "Save Settings"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
