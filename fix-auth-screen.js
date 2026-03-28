const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'frontend/src/components/auth/AuthScreen.tsx');

const content = `"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

type Modal = "login" | "register" | null;

// ─── Animated canvas: neural net + structural frame ────────
function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let t = 0;

    // Frame nodes — a simple portal frame skeleton
    const frameNodes = [
      { x: 0.18, y: 0.82 }, // col base L
      { x: 0.18, y: 0.35 }, // col top L
      { x: 0.82, y: 0.35 }, // col top R
      { x: 0.82, y: 0.82 }, // col base R
      { x: 0.18, y: 0.35 }, // beam L (same as top L)
      { x: 0.50, y: 0.25 }, // beam mid (apex)
      { x: 0.82, y: 0.35 }, // beam R
    ];
    const frameEdges = [[0,1],[2,3],[1,2],[4,5],[5,6]];

    // Neural nodes — scattered cloud
    const N = 22;
    const neurons: { x: number; y: number; vx: number; vy: number; phase: number }[] = [];
    for (let i = 0; i < N; i++) {
      neurons.push({
        x: 0.1 + Math.random() * 0.8,
        y: 0.1 + Math.random() * 0.8,
        vx: (Math.random() - 0.5) * 0.0004,
        vy: (Math.random() - 0.5) * 0.0004,
        phase: Math.random() * Math.PI * 2,
      });
    }
    // Neural connections (nearest pairs)
    const synapses: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = neurons[i].x - neurons[j].x;
        const dy = neurons[i].y - neurons[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.22) synapses.push([i, j]);
      }
    }

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t += 0.008;

      // Move neurons
      neurons.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0.05 || n.x > 0.95) n.vx *= -1;
        if (n.y < 0.05 || n.y > 0.95) n.vy *= -1;
      });

      // Draw synapses (neural links) — gold faint
      synapses.forEach(([a, b]) => {
        const pulse = 0.18 + 0.12 * Math.sin(t * 1.8 + neurons[a].phase);
        ctx.beginPath();
        ctx.moveTo(neurons[a].x * W, neurons[a].y * H);
        ctx.lineTo(neurons[b].x * W, neurons[b].y * H);
        ctx.strokeStyle = \`rgba(200,150,12,\${pulse})\`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // Draw neural nodes
      neurons.forEach((n, i) => {
        const glow = 0.55 + 0.45 * Math.sin(t * 2.2 + n.phase);
        const r = (2.2 + 1.2 * Math.sin(t * 1.6 + n.phase)) * (W / 900);
        const grad = ctx.createRadialGradient(n.x * W, n.y * H, 0, n.x * W, n.y * H, r * 6);
        grad.addColorStop(0, \`rgba(200,150,12,\${glow * 0.9})\`);
        grad.addColorStop(1, \`rgba(200,150,12,0)\`);
        ctx.beginPath();
        ctx.arc(n.x * W, n.y * H, r * 6, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x * W, n.y * H, r, 0, Math.PI * 2);
        ctx.fillStyle = \`rgba(220,170,30,\${glow})\`;
        ctx.fill();
      });

      // Draw structural frame — bright blue/white
      const frameAlpha = 0.55 + 0.1 * Math.sin(t * 0.7);
      frameEdges.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(frameNodes[a].x * W, frameNodes[a].y * H);
        ctx.lineTo(frameNodes[b].x * W, frameNodes[b].y * H);
        ctx.strokeStyle = \`rgba(100,180,255,\${frameAlpha})\`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      // Frame node circles — show joint pins
      [0,1,2,3,5].forEach(i => {
        const glow = 0.7 + 0.3 * Math.sin(t * 1.4 + i);
        ctx.beginPath();
        ctx.arc(frameNodes[i].x * W, frameNodes[i].y * H, 5, 0, Math.PI * 2);
        ctx.fillStyle = \`rgba(120,200,255,\${glow})\`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(frameNodes[i].x * W, frameNodes[i].y * H, 9, 0, Math.PI * 2);
        ctx.strokeStyle = \`rgba(100,180,255,\${glow * 0.4})\`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Travelling signal along frame edges — a dot that traverses the frame
      const edgeCount = frameEdges.length;
      const totalT = (t * 0.6) % edgeCount;
      const edgeIdx = Math.floor(totalT);
      const frac = totalT - edgeIdx;
      const edge = frameEdges[edgeIdx % edgeCount];
      const sx = (frameNodes[edge[0]].x + (frameNodes[edge[1]].x - frameNodes[edge[0]].x) * frac) * W;
      const sy = (frameNodes[edge[0]].y + (frameNodes[edge[1]].y - frameNodes[edge[0]].y) * frac) * H;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
      sg.addColorStop(0, "rgba(255,220,80,0.95)");
      sg.addColorStop(1, "rgba(255,180,0,0)");
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,240,120,1)";
      ctx.fill();

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.7 }}
    />
  );
}

// ─── Floating modal backdrop + card ─────────────────────────
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(5,12,28,0.72)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 20px",
        animation: "fadeIn .18s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "28px 26px",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 32px 80px rgba(0,0,0,.55)",
          animation: "slideUp .22s ease",
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Input helper ─────────────────────────────────────────
function AuthInput({ id, type = "text", placeholder, label, value, onChange, required = false }: {
  id: string; type?: string; placeholder: string; label: string;
  value: string; onChange: (v: string) => void; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: "block", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "#5c4f42", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>
        {label}{required && " *"}
      </label>
      <input
        id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        autoComplete={type === "email" ? "email" : type === "password" ? "current-password" : "off"}
        style={{
          width: "100%", padding: "10px 12px",
          border: \`1.5px solid \${focused ? "#1a4a8a" : "#ddd8cf"}\`,
          borderRadius: 10, fontFamily: "var(--ui)", fontSize: 13, color: "#1a1410",
          background: focused ? "#f0f4fb" : "#f9f7f4",
          boxSizing: "border-box", outline: "none", transition: "all .15s",
        }}
      />
    </div>
  );
}

// ─── Tier badge row ───────────────────────────────────────
function TierRow({ icon, label, items, highlight = false }: {
  icon: string; label: string; items: string[]; highlight?: boolean;
}) {
  return (
    <div style={{
      borderRadius: 10, padding: "9px 12px", marginBottom: 6,
      background: highlight ? "rgba(26,74,138,.07)" : "rgba(0,0,0,.03)",
      border: \`1px solid \${highlight ? "rgba(26,74,138,.25)" : "#e8e3db"}\`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontFamily: "var(--ser)", fontSize: 13, fontWeight: 700, color: "#1a1410" }}>{label}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {items.map(it => (
          <span key={it} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#5c4f42", background: "#ede9e1", borderRadius: 6, padding: "2px 7px" }}>{it}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────
export default function AuthScreen() {
  const { login, loginLocal, loginAsGuest } = useAuth();
  const [modal, setModal] = useState<Modal>(null);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regFirm, setRegFirm] = useState("");
  const [regRole, setRegRole] = useState("");
  const [regCountry, setRegCountry] = useState("");
  const [regAgree, setRegAgree] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginEmail.trim()) { setLoginError("Please enter your email address."); return; }
    setLoginError(null);
    setLoginLoading(true);
    try {
      await login(loginEmail.trim(), "");
    } catch {
      const mockUser = {
        id: \`u_\${Date.now()}\`, email: loginEmail.trim(), fullName: "",
        tier: "trial" as const,
        trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      loginLocal(mockUser);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = () => {
    if (!regName.trim()) { setRegError("Please enter your full name."); return; }
    if (!regEmail.trim() || !regEmail.includes("@")) { setRegError("Please enter a valid email."); return; }
    if (!regRole) { setRegError("Please select your role."); return; }
    if (!regAgree) { setRegError("Please agree to the Terms of Use."); return; }
    setRegError(null);
    setRegLoading(true);
    setTimeout(() => {
      loginLocal({
        id: \`u_\${Date.now()}\`, email: regEmail.trim(), fullName: regName.trim(),
        tier: "trial" as const,
        trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setRegLoading(false);
    }, 800);
  };

  return (
    <>
      {/* ── Keyframes ── */}
      <style>{\`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
        @keyframes titleIn { from { opacity:0; transform:translateY(-18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes btnIn { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .auth-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(0,0,0,.45) !important; }
        .auth-btn:active { transform: scale(.97); }
        .auth-guest-btn:hover { background: rgba(200,150,12,.18) !important; border-color: rgba(200,150,12,.7) !important; }
      \`}</style>

      {/* ── Full-screen stage ── */}
      <div style={{
        minHeight: "100dvh", background: "#050c1c",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>

        {/* Animated background */}
        <HeroCanvas />

        {/* Radial vignette */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(5,12,28,.8) 100%)", pointerEvents: "none", zIndex: 1 }} />

        {/* ── Fixed centred content ── */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "100%", maxWidth: 420, padding: "0 24px" }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 36, animation: "titleIn .6s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 15,
                background: "rgba(200,150,12,.15)", border: "1.5px solid rgba(200,150,12,.55)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 32px rgba(200,150,12,.25)",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <line x1="5" y1="20" x2="5" y2="7" stroke="#c8960c" strokeWidth="2.2" strokeLinecap="round"/>
                  <line x1="19" y1="20" x2="19" y2="3" stroke="#c8960c" strokeWidth="2.2" strokeLinecap="round"/>
                  <line x1="5" y1="11" x2="19" y2="11" stroke="rgba(200,150,12,.5)" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="5" y1="20" x2="19" y2="20" stroke="rgba(200,150,12,.5)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ fontFamily: "var(--ser)", fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-1px", textShadow: "0 2px 20px rgba(200,150,12,.3)" }}>
                SSAD
              </div>
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "rgba(200,150,12,.8)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>
              Smart Structural Analysis &amp; Design
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: ".5px" }}>
              AI · BS 8110 · BS 5950 · EC2
            </div>
          </div>

          {/* ── Three action buttons ── always fixed ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", animation: "btnIn .7s .2s ease both" }}>

            {/* Sign In */}
            <button
              className="auth-btn"
              onClick={() => setModal("login")}
              style={{
                width: "100%", padding: "15px 20px",
                background: "#1a4a8a", border: "none", borderRadius: 14,
                color: "#fff", fontFamily: "var(--ui)", fontSize: 15, fontWeight: 700,
                cursor: "pointer", transition: "all .2s",
                boxShadow: "0 4px 20px rgba(26,74,138,.45), inset 0 1px 0 rgba(255,255,255,.12)",
                letterSpacing: ".1px",
              }}
            >
              Sign In
            </button>

            {/* Register Free */}
            <button
              className="auth-btn"
              onClick={() => setModal("register")}
              style={{
                width: "100%", padding: "15px 20px",
                background: "linear-gradient(135deg,#0f3060,#1a5ca8)", border: "1px solid rgba(100,160,255,.3)", borderRadius: 14,
                color: "#fff", fontFamily: "var(--ui)", fontSize: 15, fontWeight: 700,
                cursor: "pointer", transition: "all .2s",
                boxShadow: "0 4px 20px rgba(10,30,80,.5)",
              }}
            >
              Register Free — 30-day Full Access
            </button>

            {/* Continue as Guest */}
            <button
              className="auth-btn auth-guest-btn"
              onClick={() => loginAsGuest()}
              style={{
                width: "100%", padding: "14px 20px",
                background: "rgba(200,150,12,.1)", border: "1.5px solid rgba(200,150,12,.4)", borderRadius: 14,
                color: "#c8960c", fontFamily: "var(--ui)", fontSize: 14, fontWeight: 600,
                cursor: "pointer", transition: "all .2s",
              }}
            >
              Continue as Guest
              <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 9, color: "rgba(200,150,12,.65)", fontWeight: 400, marginTop: 2 }}>
                RC Beam design only · No sign-up required
              </span>
            </button>

          </div>

          {/* Tier comparison hint */}
          <div style={{ marginTop: 22, animation: "btnIn .7s .35s ease both", width: "100%" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "rgba(255,255,255,.25)", textAlign: "center", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 10 }}>
              Access Levels
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { tier: "Guest", color: "rgba(200,150,12,.7)", items: ["RC Beam only"] },
                { tier: "Free Trial", color: "rgba(100,200,150,.8)", items: ["All elements", "30 days"] },
                { tier: "Pro", color: "rgba(120,180,255,.85)", items: ["All elements", "Unlimited", "Reports"] },
              ].map(t => (
                <div key={t.tier} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "8px 8px" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: t.color, marginBottom: 4 }}>{t.tier}</div>
                  {t.items.map(i => <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 8, color: "rgba(255,255,255,.45)" }}>{i}</div>)}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, fontFamily: "var(--mono)", fontSize: 8, color: "rgba(255,255,255,.2)", letterSpacing: ".5px", textAlign: "center", animation: "btnIn .7s .45s ease both" }}>
            BAE CONSULTING ENGINEERS · CEng MIStructE
          </div>
        </div>
      </div>

      {/* ── LOGIN MODAL ── */}
      {modal === "login" && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: "var(--ser)", fontSize: 20, fontWeight: 700, color: "#1a1410", lineHeight: 1.2 }}>Welcome back</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#8a7d72", marginTop: 3 }}>Enter your registered email to continue</div>
            </div>
            <button onClick={() => setModal(null)} style={{ background: "rgba(0,0,0,.06)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#5c4f42" }}>✕</button>
          </div>

          <AuthInput id="login-email" type="email" label="Email Address" placeholder="engineer@firm.com" value={loginEmail} onChange={setLoginEmail} required />

          {loginError && (
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#c0392b", background: "rgba(192,57,43,.07)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 8, padding: "7px 10px", marginBottom: 12 }}>
              {loginError}
            </div>
          )}

          <button
            onClick={() => void handleLogin()}
            disabled={loginLoading}
            style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: "#1a4a8a", color: "#fff", fontFamily: "var(--ui)", fontSize: 14, fontWeight: 700, cursor: loginLoading ? "not-allowed" : "pointer", opacity: loginLoading ? .7 : 1, transition: "opacity .2s", marginTop: 4 }}
          >
            {loginLoading ? "Signing in\u2026" : "Sign In \u2192"}
          </button>

          <div style={{ textAlign: "center", marginTop: 14, fontFamily: "var(--mono)", fontSize: 9, color: "#8a7d72" }}>
            No account?{" "}
            <span onClick={() => setModal("register")} style={{ color: "#1a4a8a", fontWeight: 700, cursor: "pointer" }}>
              Register free \u2192
            </span>
          </div>
        </Modal>
      )}

      {/* ── REGISTER MODAL ── */}
      {modal === "register" && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <div style={{ fontFamily: "var(--ser)", fontSize: 20, fontWeight: 700, color: "#1a1410" }}>Create free account</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#007a5e", fontWeight: 700, marginTop: 3 }}>
                \u26a1 30-day full access \u00b7 No credit card
              </div>
            </div>
            <button onClick={() => setModal(null)} style={{ background: "rgba(0,0,0,.06)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#5c4f42" }}>✕</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div style={{ gridColumn: "1/-1" }}><AuthInput id="reg-name" label="Full Name" placeholder="Engr. Amara Osei" value={regName} onChange={setRegName} required /></div>
            <div style={{ gridColumn: "1/-1" }}><AuthInput id="reg-email" type="email" label="Email Address" placeholder="engineer@firm.com" value={regEmail} onChange={setRegEmail} required /></div>
            <div style={{ gridColumn: "1/-1" }}><AuthInput id="reg-firm" label="Firm / Organisation" placeholder="BAE Consulting Engineers" value={regFirm} onChange={setRegFirm} /></div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="reg-role" style={{ display: "block", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "#5c4f42", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>Role *</label>
            <select id="reg-role" value={regRole} onChange={e => setRegRole(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #ddd8cf", borderRadius: 10, fontFamily: "var(--ui)", fontSize: 13, color: regRole ? "#1a1410" : "#8a7d72", background: "#f9f7f4", boxSizing: "border-box", appearance: "none" }}>
              <option value="">Select your role\u2026</option>
              <option>Structural Engineer</option>
              <option>Civil Engineer</option>
              <option>Engineering Student</option>
              <option>Lecturer / Academic</option>
              <option>Site Engineer</option>
              <option>Project Manager</option>
              <option>Other</option>
            </select>
          </div>

          <AuthInput id="reg-country" label="Country" placeholder="Nigeria" value={regCountry} onChange={setRegCountry} />

          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 14 }}>
            <input type="checkbox" checked={regAgree} onChange={e => setRegAgree(e.target.checked)} style={{ marginTop: 2, width: 14, height: 14, accentColor: "#1a4a8a", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#5c4f42", lineHeight: 1.6 }}>
              I agree to the <span style={{ color: "#1a4a8a", fontWeight: 700 }}>Terms of Use</span> — outputs must be verified by a qualified engineer before use in construction.
            </span>
          </label>

          {regError && (
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#c0392b", background: "rgba(192,57,43,.07)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 8, padding: "7px 10px", marginBottom: 12 }}>
              {regError}
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={regLoading}
            style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#1a4a8a,#2563b0)", color: "#fff", fontFamily: "var(--ui)", fontSize: 14, fontWeight: 700, cursor: regLoading ? "not-allowed" : "pointer", opacity: regLoading ? .7 : 1 }}
          >
            {regLoading ? "Creating account\u2026" : "Start Free Trial \u2192"}
          </button>

          <div style={{ textAlign: "center", marginTop: 12, fontFamily: "var(--mono)", fontSize: 9, color: "#8a7d72" }}>
            Already registered?{" "}
            <span onClick={() => setModal("login")} style={{ color: "#1a4a8a", fontWeight: 700, cursor: "pointer" }}>Sign in</span>
          </div>
        </Modal>
      )}
    </>
  );
}
`;

fs.writeFileSync(target, content, 'utf8');
console.log('Done. Size:', content.length, 'chars');
