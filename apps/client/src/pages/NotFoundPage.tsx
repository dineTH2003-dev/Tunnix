import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Home } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "2rem",
      background: "#0a0f1e",
      color: "#f1f5f9",
    }}>
      <AlertTriangle size={56} color="#f59e0b" style={{ marginBottom: "1.5rem" }} />
      <h1 style={{ fontSize: "4rem", fontWeight: 700, color: "#6366f1", marginBottom: "0.5rem" }}>404</h1>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>Page Not Found</h2>
      <p style={{ color: "#94a3b8", maxWidth: 380, marginBottom: "2rem", lineHeight: 1.6 }}>
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          Go Back
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Home size={16} /> Dashboard
        </button>
      </div>
    </div>
  );
};
