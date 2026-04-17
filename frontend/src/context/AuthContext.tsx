"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { UserTier } from "@/types/calc";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ─── Types ────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  tier: UserTier;
  trialExpiresAt?: string;
  firm?: string;
  role?: string;
  country?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  firm?: string;
  role?: string;
  country?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  effectiveTier: UserTier;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
}

// ─── Helpers ──────────────────────────────────────────────

function apiUserToAuthUser(u: Record<string, string>): AuthUser {
  return {
    id:             u.id,
    email:          u.email,
    fullName:       u.full_name ?? "",
    tier:           (u.tier ?? "trial") as UserTier,
    trialExpiresAt: u.trial_expires_at ?? undefined,
    firm:           u.firm ?? "",
    role:           u.role ?? "",
    country:        u.country ?? "",
  };
}

async function authPost(path: string, body: object): Promise<{ token: string; user: Record<string, string> }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as { token?: string; user?: Record<string, string>; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data as { token: string; user: Record<string, string> };
}

// ─── Context ──────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]   = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore persisted session on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("ssad_token");
      const storedUser  = localStorage.getItem("ssad_user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
      }
    } catch {
      // ignore parse errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  const _persist = useCallback((t: string, u: AuthUser) => {
    localStorage.setItem("ssad_token", t);
    localStorage.setItem("ssad_user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token: t, user: u } = await authPost("/api/v1/auth/login", { email, password });
    _persist(t, apiUserToAuthUser(u));
  }, [_persist]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { token: t, user: u } = await authPost("/api/v1/auth/register", payload);
    _persist(t, apiUserToAuthUser(u));
  }, [_persist]);

  const loginAsGuest = useCallback(() => {
    setToken(null);
    setUser({ id: "guest", email: "", fullName: "Guest", tier: "guest" });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ssad_token");
    localStorage.removeItem("ssad_user");
    setToken(null);
    setUser(null);
  }, []);

  const effectiveTier: UserTier =
    user?.tier === "trial" && user.trialExpiresAt && new Date() > new Date(user.trialExpiresAt)
      ? "guest"
      : (user?.tier ?? "guest");

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        effectiveTier,
        login,
        register,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
