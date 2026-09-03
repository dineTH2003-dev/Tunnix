import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React rendering error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#07090e",
            color: "#f8fafc",
            padding: "2rem",
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: 480,
              width: "100%",
              padding: "2rem",
              textAlign: "center",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              backgroundColor: "rgba(15, 23, 42, 0.95)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
              }}
            >
              <AlertTriangle size={28} color="#ef4444" />
            </div>

            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Something went wrong
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              An unexpected error occurred while rendering this page.
            </p>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: "rgba(0,0,0,0.4)",
                  padding: "0.75rem 1rem",
                  borderRadius: 8,
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  color: "#fca5a5",
                  marginBottom: "1.5rem",
                  wordBreak: "break-word",
                  textAlign: "left",
                  maxHeight: 120,
                  overflowY: "auto",
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary"
                style={{ padding: "0.6rem 1.25rem" }}
              >
                <RefreshCw size={16} /> Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="btn-primary"
                style={{ padding: "0.6rem 1.25rem" }}
              >
                <Home size={16} /> Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
