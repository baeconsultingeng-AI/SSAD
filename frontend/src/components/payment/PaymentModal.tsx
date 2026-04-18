"use client";

/**
 * PaymentModal
 * ─────────────
 * Shows plan options and triggers a Paystack payment via the backend.
 * After initialize, opens the Paystack-hosted checkout page in a new tab.
 * On return, calls /api/v1/payment/verify/<ref> to upgrade the tier.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

interface Props {
  onClose: () => void;
}

const PLANS = [
  {
    key: "pro_monthly",
    label: "Pro Monthly",
    price: "₦29,000",
    period: "/ month",
    features: ["All 8 BS modules", "Unlimited calculations", "PDF reports", "AI-assisted input", "Priority support"],
    highlight: false,
  },
  {
    key: "pro_annual",
    label: "Pro Annual",
    price: "₦290,000",
    period: "/ year",
    badge: "Save 17%",
    features: ["All 8 BS modules", "Unlimited calculations", "PDF reports", "AI-assisted input", "Priority support", "Early access to new modules"],
    highlight: true,
  },
];

export default function PaymentModal({ onClose }: Props) {
  const { user, token, updateUser } = useAuth();
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess]     = useState(false);

  // When the user returns from Paystack checkout (tab focuses again), verify.
  useEffect(() => {
    if (!pendingRef) return;
    const handleFocus = async () => {
      if (!pendingRef) return;
      setVerifying(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/payment/verify/${pendingRef}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json() as { status?: string; tier?: string; error?: string; user?: Record<string, string> };
        if (res.ok && json.status === "success") {
          // Persist updated tier to localStorage before reload
          if (json.user) updateUser(json.user);
          setSuccess(true);
          setPendingRef(null);
          // Reload page so tier updates everywhere
          setTimeout(() => window.location.reload(), 1800);
        } else {
          setError(json.error ?? "Payment verification failed. Please contact support.");
        }
      } catch {
        setError("Could not verify payment. Please contact support.");
      } finally {
        setVerifying(false);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [pendingRef, token]);

  const handleChoosePlan = async (planKey: string) => {
    if (!user) {
      setError("You must be logged in to subscribe.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/payment/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_id: user.id, email: user.email, plan: planKey }),
      });
      const json = await res.json() as { authorization_url?: string; reference?: string; error?: string };
      if (!res.ok || !json.authorization_url) {
        setError(json.error ?? "Could not initialise payment.");
        return;
      }
      setPendingRef(json.reference ?? null);
      window.open(json.authorization_url, "_blank");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(5,12,28,0.75)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "28px 24px",
          width: "100%",
          maxWidth: 560,
          boxShadow: "0 32px 80px rgba(0,0,0,.55)",
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 20, fontWeight: 700, color: "#1a1410" }}>Upgrade to Pro</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#5c4f42", marginTop: 2 }}>
              Full access to all BS calculation modules
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(0,0,0,.06)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#5c4f42" }}>✕</button>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 18, fontWeight: 700, color: "#007a5e", marginBottom: 6 }}>
              Payment successful!
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#5c4f42" }}>
              Your account has been upgraded to Pro. Reloading…
            </div>
          </div>
        ) : (
          <>
            {/* Plans */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {PLANS.map(plan => (
                <div
                  key={plan.key}
                  style={{
                    borderRadius: 14,
                    border: `2px solid ${plan.highlight ? "#1a4a8a" : "#e8e3db"}`,
                    padding: "16px 14px",
                    background: plan.highlight ? "rgba(26,74,138,.04)" : "#faf9f7",
                    position: "relative",
                  }}
                >
                  {plan.badge && (
                    <div style={{
                      position: "absolute", top: -10, right: 12,
                      background: "#1a4a8a", color: "#fff",
                      fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700,
                      padding: "3px 8px", borderRadius: 20,
                    }}>
                      {plan.badge}
                    </div>
                  )}
                  <div style={{ fontFamily: "var(--ser)", fontSize: 14, fontWeight: 700, color: "#1a1410", marginBottom: 2 }}>
                    {plan.label}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--ser)", fontSize: 22, fontWeight: 900, color: "#1a4a8a" }}>{plan.price}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#8a7d72" }}>{plan.period}</span>
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, marginBottom: 14 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#5c4f42", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ color: "#007a5e", fontWeight: 700 }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => void handleChoosePlan(plan.key)}
                    disabled={loading || verifying}
                    style={{
                      width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
                      background: plan.highlight ? "#1a4a8a" : "#f0f4fb",
                      color: plan.highlight ? "#fff" : "#1a4a8a",
                      fontFamily: "var(--ui)", fontSize: 13, fontWeight: 700,
                      cursor: loading || verifying ? "not-allowed" : "pointer",
                      opacity: loading || verifying ? 0.7 : 1,
                      transition: "all .15s",
                    }}
                  >
                    {loading ? "Please wait…" : "Choose Plan →"}
                  </button>
                </div>
              ))}
            </div>

            {verifying && (
              <div style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 9, color: "#1a4a8a", padding: "8px 0" }}>
                Verifying payment…
              </div>
            )}

            {pendingRef && !verifying && (
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#5c4f42", background: "rgba(26,74,138,.06)", border: "1px solid rgba(26,74,138,.18)", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                Paystack checkout opened in a new tab. Return here after completing payment — we&apos;ll verify automatically.
              </div>
            )}

            {error && (
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#c0392b", background: "rgba(192,57,43,.07)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 8, padding: "7px 10px" }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: 14, fontFamily: "var(--mono)", fontSize: 8, color: "#aaa", textAlign: "center" }}>
              Secure payment via Paystack · Cancel anytime · No hidden fees
            </div>
          </>
        )}
      </div>
    </div>
  );
}
