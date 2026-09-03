import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Zap, Mail, KeyRound, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react";
import { useAuth } from "../store/authContext";

export const AuthPage: React.FC = () => {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await requestOtp(email.trim());
      setChallengeId(res.challengeId);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await verifyOtp(challengeId, otp.trim());
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#07090e",
        padding: "1.5rem",
        backgroundImage: "radial-gradient(circle at 50% 30%, rgba(99,102,241,0.15) 0%, transparent 60%)",
        position: "relative",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Back to Home Link */}
        <div style={{ marginBottom: "1.25rem" }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#94a3b8",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              boxShadow: "0 0 32px rgba(99,102,241,0.5)",
            }}
          >
            <Zap size={30} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }} className="text-gradient">
            Welcome to Tunnix
          </h1>
          <p style={{ color: "#94a3b8", marginTop: 4, fontSize: "0.9rem" }}>
            Expose local servers to the public internet securely
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: "2rem" }}>
          {error && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                padding: "0.75rem 1rem",
                borderRadius: 8,
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
              }}
            >
              {error}
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleRequestOtp}>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: "#cbd5e1", marginBottom: 6 }}>
                  Work or Personal Email
                </label>
                <div style={{ position: "relative" }}>
                  <Mail size={18} color="#64748b" style={{ position: "absolute", left: 12, top: 12 }} />
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                {loading ? "Sending Code..." : "Continue with Email"}
                <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "#cbd5e1" }}>
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    style={{ background: "none", border: "none", color: "#38bdf8", fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    Change Email
                  </button>
                </div>

                <div style={{ position: "relative" }}>
                  <KeyRound size={18} color="#64748b" style={{ position: "absolute", left: 12, top: 12 }} />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="input-field font-mono"
                    style={{ paddingLeft: 38, letterSpacing: "0.25em", fontSize: "1.1rem" }}
                  />
                </div>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 6 }}>
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
                <p style={{ fontSize: "0.75rem", color: "#38bdf8", marginTop: 4 }}>
                  💡 Local Dev Hint: Enter <strong>000000</strong> or <strong>123456</strong> to sign in instantly.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
                <ShieldCheck size={18} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
