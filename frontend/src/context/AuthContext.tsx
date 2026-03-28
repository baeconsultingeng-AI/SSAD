"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { UserTier } from "@/types/calc";

// ─── Types ────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  tier: UserTier;
  trialExpiresAt?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  effectiveTier: UserTier;
  login: (email: string, password: string) => Promise<void>;
  loginLocal: (user: AuthUser) => void;
  loginAsGuest: () => void;
  logout: () => void;
}

// ─── Context ──────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sprint 1 stub: restore from localStorage; real Supabase auth in Sprint 2
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ssad_user");
      if (stored) {
        setUser(JSON.parse(stored) as AuthUser);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (_email: string, _password: string) => {
      // Sprint 1 stub: will be replaced with Supabase auth
      throw new Error("Auth not yet connected — Sprint 2 implementation");
    },
    []
  );

  const loginLocal = useCallback((u: AuthUser) => {
    localStorage.setItem("ssad_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const loginAsGuest = useCallback(() => {
    // Guest users are session-only — not persisted to localStorage
    setUser({ id: "guest", email: "", fullName: "Guest", tier: "guest" });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ssad_user");
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
        isLoading,
        isAuthenticated: !!user,
        effectiveTier,
        login,
        loginLocal,
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
