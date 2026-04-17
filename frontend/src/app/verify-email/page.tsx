"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type Status = "loading" | "success" | "expired" | "invalid";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [status, setStatus]   = useState<Status>("loading");
  const [email, setEmail]     = useState<string>("");
  const [resendDone, setResendDone]   = useState(false);
  const [resendBusy, setResendBusy]   = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) { setStatus("invalid"); return; }

    fetch(`${API_BASE}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json() as { success?: boolean; error?: string; code?: string; email?: string };
        if (res.ok && data.success) {
          setStatus("success");
        } else if (data.code === "TOKEN_EXPIRED") {
          setEmail(data.email ?? "");
          setStatus("expired");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [searchParams]);

  const handleResend = async () => {
    if (!email) return;
    setResendBusy(true);
    try {
      await fetch(`${API_BASE}/api/v1/auth/resend-verification`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      setResendDone(true);
    } catch {
      // server always returns 200 for resend
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0;transform:translateY(20px) } to { opacity:1;transform:translateY(0) } }
        body { margin:0; background:#050c1c; font-family: system-ui, -apple-system, sans-serif; }
      `}</style>

      <div style={{
        minHeight: "100dvh", background: "#050c1c",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
      }}>
        <div style={{
          background: "#fff", borderRadius: 20, padding: "40px 32px",
          maxWidth: 420, width: "100%",
          boxShadow: "0 32px 80px rgba(0,0,0,.55)",
          animation: "fadeUp .3s ease",
          textAlign: "center",
        }}>

          {/* SSAD header */}
          <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 900, color: "#1a1410", letterSpacing: "-0.5px", marginBottom: 24 }}>
            SSAD
          </div>

          {status === "loading" && (
            <>
              <div style={{ fontSize: 44, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1410", marginBottom: 8 }}>Verifying…</div>
              <div style={{ fontSize: 13, color: "#8a7d72" }}>Please wait while we confirm your email.</div>
            </>
          )}

          {status === "success" && (
            <>
              <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1410", marginBottom: 8 }}>Email verified!</div>
              <div style={{ fontSize: 13, color: "#5c4f42", lineHeight: 1.6, marginBottom: 28 }}>
                Your account is now active. Sign in to start your free 30-day trial.
              </div>
              <button
                onClick={() => router.push("/")}
                style={{
                  width: "100%", padding: 13, borderRadius: 12, border: "none",
                  background: "#1a4a8a", color: "#fff",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                Sign In →
              </button>
            </>
          )}

          {status === "expired" && (
            <>
              <div style={{ fontSize: 52, marginBottom: 16 }}>⏰</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1410", marginBottom: 8 }}>Link expired</div>
              <div style={{ fontSize: 13, color: "#5c4f42", lineHeight: 1.6, marginBottom: 24 }}>
                Your verification link has expired (links are valid for 24 hours).
                Request a new one below.
              </div>

              {resendDone ? (
                <div style={{
                  fontSize: 12, color: "#007a5e", background: "rgba(0,122,94,.07)",
                  border: "1px solid rgba(0,122,94,.25)", borderRadius: 10, padding: "10px 14px",
                  marginBottom: 20,
                }}>
                  ✓ New verification email sent — please check your inbox.
                </div>
              ) : (
                <button
                  onClick={() => void handleResend()}
                  disabled={resendBusy}
                  style={{
                    width: "100%", padding: 13, borderRadius: 12, border: "none",
                    background: "#1a4a8a", color: "#fff",
                    fontSize: 14, fontWeight: 700,
                    cursor: resendBusy ? "not-allowed" : "pointer",
                    opacity: resendBusy ? .65 : 1, marginBottom: 12,
                  }}
                >
                  {resendBusy ? "Sending…" : "Resend verification email"}
                </button>
              )}

              <button
                onClick={() => router.push("/")}
                style={{
                  width: "100%", padding: 12, borderRadius: 12,
                  border: "1.5px solid #ddd8cf", background: "transparent",
                  color: "#5c4f42", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Back to Sign In
              </button>
            </>
          )}

          {status === "invalid" && (
            <>
              <div style={{ fontSize: 52, marginBottom: 16 }}>❌</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1410", marginBottom: 8 }}>Invalid link</div>
              <div style={{ fontSize: 13, color: "#5c4f42", lineHeight: 1.6, marginBottom: 28 }}>
                This verification link is invalid or has already been used.
                If you need a new link, sign in and request one from there.
              </div>
              <button
                onClick={() => router.push("/")}
                style={{
                  width: "100%", padding: 13, borderRadius: 12, border: "none",
                  background: "#1a4a8a", color: "#fff",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                Back to Sign In
              </button>
            </>
          )}

        </div>
      </div>
    </>
  );
}
