"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

type Modal = "login" | "register" | null;

// ─── Animated canvas: neural net + ephemeral mini frames ───
// ─── 3-D isometric 6-storey frame + neural net ────────────
function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let frame = 0;

    // ── Isometric projection helpers ──
    // 3-D grid: cols along X, bays along Z, storeys along Y (up)
    const COLS = 3;   // columns in X direction (0..2)
    const BAYS = 2;   // bays in Z direction  (0..1)
    const STOREYS = 6;

    // iso angles: 30° for classic iso
    const ISO_AX = Math.cos(Math.PI / 6);
    const ISO_AY = Math.sin(Math.PI / 6);

    // project 3-D (gx, gy_up, gz) → canvas (cx, cy) normalised 0-1
    // origin sits at bottom-centre of the building
    function iso(gx: number, gy: number, gz: number, W: number, H: number) {
      // scale so full 6-storey building fits nicely
      const scaleX = W * 0.088;
      const scaleY = H * 0.072;
      // iso projection
      const cx = 0.5 * W + (gx - gz) * ISO_AX * scaleX;
      const cy = 0.72 * H - gy * scaleY - (gx + gz) * ISO_AY * scaleX * 0.5;
      return { cx, cy };
    }

    // ── Build node list ──
    // Each node: { gx, gy, gz } in grid units
    type Node3 = { gx: number; gy: number; gz: number };
    const nodes: Node3[] = [];
    for (let gz = 0; gz <= BAYS; gz++)
      for (let gx = 0; gx <= COLS; gx++)
        for (let gy = 0; gy <= STOREYS; gy++)
          nodes.push({ gx, gy, gz });

    const nodeIndex = (gx: number, gy: number, gz: number) =>
      gz * (COLS + 1) * (STOREYS + 1) + gx * (STOREYS + 1) + gy;

    // ── Build edge list (columns + beams) ──
    type Edge = { a: number; b: number; kind: "col" | "beamX" | "beamZ" };
    const edges: Edge[] = [];
    for (let gz = 0; gz <= BAYS; gz++) {
      for (let gx = 0; gx <= COLS; gx++) {
        for (let gy = 0; gy < STOREYS; gy++) {
          // vertical column
          edges.push({ a: nodeIndex(gx, gy, gz), b: nodeIndex(gx, gy + 1, gz), kind: "col" });
        }
      }
    }
    for (let gz = 0; gz <= BAYS; gz++) {
      for (let gx = 0; gx < COLS; gx++) {
        for (let gy = 1; gy <= STOREYS; gy++) {
          // beam along X
          edges.push({ a: nodeIndex(gx, gy, gz), b: nodeIndex(gx + 1, gy, gz), kind: "beamX" });
        }
      }
    }
    for (let gz = 0; gz < BAYS; gz++) {
      for (let gx = 0; gx <= COLS; gx++) {
        for (let gy = 1; gy <= STOREYS; gy++) {
          // beam along Z
          edges.push({ a: nodeIndex(gx, gy, gz), b: nodeIndex(gx, gy, gz + 1), kind: "beamZ" });
        }
      }
    }

    // slow rotation angle
    let rotAngle = 0;

    // ── Neurons ──────────────────────────────────────────
    const N = 22;
    type Neuron = { x: number; y: number; vx: number; vy: number; phase: number };
    const neurons: Neuron[] = Array.from({ length: N }, () => ({
      x: 0.08 + Math.random() * 0.84,
      y: 0.08 + Math.random() * 0.84,
      vx: (Math.random() - 0.5) * 0.00032,
      vy: (Math.random() - 0.5) * 0.00032,
      phase: Math.random() * Math.PI * 2,
    }));

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
      frame++;
      rotAngle += 0.003; // gentle slow spin

      // ── Projected nodes with rotation around Y axis ──
      const projected = nodes.map(({ gx, gy, gz }) => {
        // centre the grid
        const cx3 = gx - COLS / 2;
        const cz3 = gz - BAYS / 2;
        // rotate around Y
        const rx = cx3 * Math.cos(rotAngle) - cz3 * Math.sin(rotAngle);
        const rz = cx3 * Math.sin(rotAngle) + cz3 * Math.cos(rotAngle);
        return iso(rx, gy, rz, W, H);
      });

      // ── Draw edges ──
      edges.forEach(({ a, b, kind }) => {
        const pa = projected[a], pb = projected[b];
        // depth sort approximation: average Y screen coord (higher = further back → draw first)
        const isCol = kind === "col";
        ctx.beginPath();
        ctx.moveTo(pa.cx, pa.cy);
        ctx.lineTo(pb.cx, pb.cy);
        if (isCol) {
          ctx.strokeStyle = "rgba(140,210,255,0.26)";
          ctx.lineWidth = 1.0;
        } else if (kind === "beamX") {
          ctx.strokeStyle = "rgba(140,210,255,0.26)";
          ctx.lineWidth = 1.0;
        } else {
          ctx.strokeStyle = "rgba(140,210,255,0.18)";
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();
      });

      // ── Draw joint nodes ──
      nodes.forEach((n, i) => {
        if (n.gy === 0) return; // skip base slab nodes
        const p = projected[i];
        const pulse = 0.35 + 0.25 * Math.sin(frame * 0.02 + n.gx + n.gz);
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160,220,255,${pulse})`;
        ctx.fill();
      });

      // ── Neural net ──
      neurons.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0.05 || n.x > 0.95) n.vx *= -1;
        if (n.y < 0.05 || n.y > 0.95) n.vy *= -1;
      });

      // synaptic links
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = neurons[i].x - neurons[j].x;
          const dy = neurons[i].y - neurons[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 0.18) {
            ctx.beginPath();
            ctx.moveTo(neurons[i].x * W, neurons[i].y * H);
            ctx.lineTo(neurons[j].x * W, neurons[j].y * H);
            ctx.strokeStyle = `rgba(200,150,12,${(1 - d / 0.18) * 0.18})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // neuron dots
      neurons.forEach(n => {
        const t = frame * 0.012;
        const glow = 0.4 + 0.3 * Math.sin(t * 2.2 + n.phase);
        const r = (1.6 + 0.8 * Math.sin(t * 1.6 + n.phase)) * (W / 900);
        const grad = ctx.createRadialGradient(n.x * W, n.y * H, 0, n.x * W, n.y * H, r * 7);
        grad.addColorStop(0, `rgba(200,150,12,${glow * 0.45})`);
        grad.addColorStop(1, "rgba(200,150,12,0)");
        ctx.beginPath();
        ctx.arc(n.x * W, n.y * H, r * 7, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x * W, n.y * H, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,170,30,${glow})`;
        ctx.fill();
      });

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
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.72 }}
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
          border: `1.5px solid ${focused ? "#1a4a8a" : "#ddd8cf"}`,
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
      border: `1px solid ${highlight ? "rgba(26,74,138,.25)" : "#e8e3db"}`,
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
  const { login, register, loginAsGuest } = useAuth();
  const [modal, setModal] = useState<Modal>(null);

  // Login state
  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError]       = useState<string | null>(null);
  const [loginLoading, setLoginLoading]   = useState(false);

  // Register state
  const [regName, setRegName]       = useState("");
  const [regEmail, setRegEmail]     = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFirm, setRegFirm]       = useState("");
  const [regRole, setRegRole]       = useState("");
  const [regCountry, setRegCountry] = useState("");
  const [regAgree, setRegAgree]     = useState(false);
  const [regError, setRegError]     = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginEmail.trim()) { setLoginError("Please enter your email address."); return; }
    if (!loginPassword.trim()) { setLoginError("Please enter your password."); return; }
    setLoginError(null);
    setLoginLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim())  { setRegError("Please enter your full name."); return; }
    if (!regEmail.trim() || !regEmail.includes("@")) { setRegError("Please enter a valid email."); return; }
    if (regPassword.length < 8) { setRegError("Password must be at least 8 characters."); return; }
    if (!regRole) { setRegError("Please select your role."); return; }
    if (!regAgree) { setRegError("Please agree to the Terms of Use."); return; }
    setRegError(null);
    setRegLoading(true);
    try {
      await register({
        email: regEmail.trim(),
        password: regPassword,
        full_name: regName.trim(),
        firm: regFirm.trim(),
        role: regRole,
        country: regCountry.trim(),
      });
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <>
      {/* ── Keyframes ── */}
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
        @keyframes titleIn { from { opacity:0; transform:translateY(-18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes btnIn { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .auth-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(0,0,0,.45) !important; background: rgba(200,150,12,.18) !important; border-color: rgba(200,150,12,.7) !important; }
        .auth-btn:active { transform: scale(.97); }
        .auth-guest-btn:hover { background: rgba(200,150,12,.18) !important; border-color: rgba(200,150,12,.7) !important; }
      `}</style>

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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 10 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 15,
                background: "rgba(200,150,12,.15)", border: "1.5px solid rgba(200,150,12,.55)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                boxShadow: "0 0 32px rgba(200,150,12,.25)",
              }}>
                <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
                  {/* Isometric portal frame — floor plane */}
                  <line x1="20" y1="36" x2="8" y2="30" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeLinecap="round"/>
                  <line x1="20" y1="36" x2="32" y2="30" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeLinecap="round"/>
                  {/* Back column (depth hint) */}
                  <line x1="20" y1="36" x2="20" y2="26" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2"/>
                  {/* Left column */}
                  <line x1="8" y1="30" x2="8" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  {/* Right column */}
                  <line x1="32" y1="30" x2="32" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  {/* Top beam — front */}
                  <line x1="8" y1="12" x2="32" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  {/* Depth edges at top */}
                  <line x1="8" y1="12" x2="20" y2="6" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinecap="round"/>
                  <line x1="32" y1="12" x2="20" y2="6" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinecap="round"/>
                  {/* Back column top */}
                  <line x1="20" y1="26" x2="20" y2="6" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 2"/>
                  {/* Bending moment diagram on front beam */}
                  <line x1="8" y1="19" x2="16" y2="17.2" stroke="rgba(200,150,12,0.7)" strokeWidth="0.9"/>
                  <line x1="16" y1="17.2" x2="24" y2="17.2" stroke="rgba(255,255,255,0.5)" strokeWidth="0.9"/>
                  <line x1="24" y1="17.2" x2="32" y2="19" stroke="rgba(200,150,12,0.7)" strokeWidth="0.9"/>
                  {/* Nodes */}
                  <circle cx="8" cy="12" r="2.2" fill="rgba(200,150,12,0.4)" stroke="#c8960c" strokeWidth="1.2"/>
                  <circle cx="32" cy="12" r="2.2" fill="rgba(200,150,12,0.4)" stroke="#c8960c" strokeWidth="1.2"/>
                  <circle cx="8" cy="19" r="2" fill="rgba(200,150,12,0.3)" stroke="#c8960c" strokeWidth="1"/>
                  <circle cx="16" cy="17.2" r="2" fill="rgba(200,150,12,0.2)" stroke="#c8960c" strokeWidth="0.9"/>
                  <circle cx="24" cy="17.2" r="2" fill="rgba(200,150,12,0.2)" stroke="#c8960c" strokeWidth="0.9"/>
                  <circle cx="32" cy="19" r="2" fill="rgba(200,150,12,0.3)" stroke="#c8960c" strokeWidth="1"/>
                  {/* Iso top apex */}
                  <circle cx="20" cy="6" r="2" fill="rgba(200,150,12,0.35)" stroke="#c8960c" strokeWidth="1"/>
                </svg>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "var(--ser)", fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-1px", lineHeight: 1, textShadow: "1px 1px 0 #9a7200, 2px 2px 0 #7a5800, 3px 3px 0 #5e4300, 4px 4px 0 #3d2c00, 5px 5px 0 #1e1600, 6px 6px 10px rgba(0,0,0,.65)" }}>
                  SSAD
                </div>
                <div style={{ fontFamily: "var(--ser)", fontSize: 12, color: "rgba(200,150,12,.85)", fontStyle: "italic", marginTop: 4 }}>
                  <em>Smart Structural Analysis &amp; Design</em>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tagline ── */}
          <div style={{ textAlign: "center", marginBottom: 28, marginTop: -8, animation: "titleIn .7s .1s ease both", padding: "0 8px" }}>
            <span style={{ fontFamily: "var(--ser)", fontSize: 15, fontStyle: "italic", fontWeight: 500, color: "rgba(255,255,255,.7)", letterSpacing: ".15px", lineHeight: 1.5 }}>
              From prompt to calculation — structural engineering, reimagined.
            </span>
          </div>

          {/* ── Three action buttons ── always fixed ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", animation: "btnIn .7s .2s ease both" }}>

            {/* Sign In */}
            <button
              className="auth-btn"
              onClick={() => setModal("login")}
              style={{
                width: "100%", padding: "15px 20px",
                background: "rgba(200,150,12,.1)", border: "1.5px solid rgba(26,74,138,.65)", borderRadius: 14,
                color: "#fff", fontFamily: "var(--ui)", fontSize: 15, fontWeight: 700,
                cursor: "pointer", transition: "all .2s",
                boxShadow: "0 4px 20px rgba(26,74,138,.25), inset 0 1px 0 rgba(255,255,255,.08)",
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
                background: "rgba(200,150,12,.1)", border: "1.5px solid rgba(26,74,138,.65)", borderRadius: 14,
                color: "#fff", fontFamily: "var(--ui)", fontSize: 15, fontWeight: 700,
                cursor: "pointer", transition: "all .2s",
                boxShadow: "0 4px 20px rgba(26,74,138,.25)",
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
                background: "rgba(200,150,12,.1)", border: "1.5px solid rgba(26,74,138,.65)", borderRadius: 14,
                color: "#fff", fontFamily: "var(--ui)", fontSize: 14, fontWeight: 600,
                cursor: "pointer", transition: "all .2s",
              }}
            >
              Continue as Guest
              <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.55)", fontWeight: 400, marginTop: 2 }}>
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
                { tier: "Pro", color: "rgba(120,180,255,.85)", items: ["All elements", "Unlimited", "Reports"] },
                { tier: "Free Trial", color: "rgba(100,200,150,.8)", items: ["All elements", "30 days"] },
                { tier: "Guest", color: "rgba(200,150,12,.7)", items: ["RC Beam only"] },
              ].map(t => (
                <div key={t.tier} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "8px 8px" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: t.color, marginBottom: 4 }}>{t.tier}</div>
                  {t.items.map(i => <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.45)" }}>{i}</div>)}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, fontFamily: "var(--ser)", fontSize: 17, color: "rgba(200,150,12,.65)", letterSpacing: "0.5px", textAlign: "center", animation: "btnIn .7s .45s ease both", fontStyle: "italic", fontWeight: 600 }}>
            Designed by Bae Consulting Engineers
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
          <AuthInput id="login-password" type="password" label="Password" placeholder="••••••••" value={loginPassword} onChange={setLoginPassword} required />

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
            {loginLoading ? "Signing in…" : "Sign In →"}
          </button>

          <div style={{ textAlign: "center", marginTop: 14, fontFamily: "var(--mono)", fontSize: 9, color: "#8a7d72" }}>
            No account?{" "}
            <span onClick={() => setModal("register")} style={{ color: "#1a4a8a", fontWeight: 700, cursor: "pointer" }}>
              Register free →
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
                ⚡ 30-day full access · No credit card
              </div>
            </div>
            <button onClick={() => setModal(null)} style={{ background: "rgba(0,0,0,.06)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#5c4f42" }}>✕</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div style={{ gridColumn: "1/-1" }}><AuthInput id="reg-name" label="Full Name" placeholder="Engr. Amara Osei" value={regName} onChange={setRegName} required /></div>
            <div style={{ gridColumn: "1/-1" }}><AuthInput id="reg-email" type="email" label="Email Address" placeholder="engineer@firm.com" value={regEmail} onChange={setRegEmail} required /></div>
            <div style={{ gridColumn: "1/-1" }}><AuthInput id="reg-password" type="password" label="Password (min 8 chars)" placeholder="••••••••" value={regPassword} onChange={setRegPassword} required /></div>
            <div style={{ gridColumn: "1/-1" }}><AuthInput id="reg-firm" label="Firm / Organisation" placeholder="BAE Consulting Engineers" value={regFirm} onChange={setRegFirm} /></div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="reg-role" style={{ display: "block", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "#5c4f42", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>Role *</label>
            <select id="reg-role" value={regRole} onChange={e => setRegRole(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #ddd8cf", borderRadius: 10, fontFamily: "var(--ui)", fontSize: 13, color: regRole ? "#1a1410" : "#8a7d72", background: "#f9f7f4", boxSizing: "border-box", appearance: "none" }}>
              <option value="">Select your role…</option>
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
            onClick={() => void handleRegister()}
            disabled={regLoading}
            style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#1a4a8a,#2563b0)", color: "#fff", fontFamily: "var(--ui)", fontSize: 14, fontWeight: 700, cursor: regLoading ? "not-allowed" : "pointer", opacity: regLoading ? .7 : 1 }}
          >
            {regLoading ? "Creating account…" : "Start Free Trial →"}
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
