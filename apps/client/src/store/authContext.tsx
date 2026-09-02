import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest, setAccessToken, getAccessToken } from "../services/api";

export interface UserProfile {
  id: string;
  email: string;
  role: "admin" | "user";
  status: "pending" | "active" | "suspended";
  name: string | null;
  maxTunnels: number;
  maxSubdomains: number;
  createdAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  requestOtp: (email: string, turnstileToken?: string) => Promise<{ challengeId: string }>;
  verifyOtp: (challengeId: string, otp: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const profile = await apiRequest<UserProfile>("/v1/auth/me");
      setUser(profile);
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getAccessToken()) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const requestOtp = async (email: string, turnstileToken: string = "dev-bypass") => {
    return apiRequest<{ challengeId: string }>("/v1/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ email, turnstileToken }),
    });
  };

  const verifyOtp = async (challengeId: string, otp: string) => {
    const res = await apiRequest<{ accessToken: string; user: UserProfile }>(
      "/v1/auth/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({ challengeId, otp }),
      },
    );
    setAccessToken(res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await apiRequest("/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore error on logout
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        requestOtp,
        verifyOtp,
        logout,
        refreshProfile: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
