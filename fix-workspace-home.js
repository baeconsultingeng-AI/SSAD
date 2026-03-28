const fs = require('fs');
const path = require('path');

const outPath = path.join(__dirname, 'frontend/src/components/workspace/WorkspaceScreen.tsx');

const content = `"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import DesktopShell from "@/components/layout/DesktopShell";

import AIChatPanel from "@/components/workspace/AIChatPanel";
import ResultPanel from "@/components/workspace/ResultPanel";
import ReportPanel from "@/components/workspace/ReportPanel";
import DetailingPanel from "@/components/workspace/DetailingPanel";
import ProjectsScreen from "@/components/projects/ProjectsScreen";
import SettingsScreen from "@/components/settings/SettingsScreen";
import UpgradeScreen from "@/components/upgrade/UpgradeScreen";
import AuthScreen from "@/components/auth/AuthScreen";

function LoadingSpinner() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1b2e" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "rgba(255,255,255,.4)", letterSpacing: ".1em" }}>Loading…</div>
    </div>
  );
}

/* ─── Neural-net canvas (neurons only, no 3-D frame) ────────────────────────── */
function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // neurons
    const N = 42;
    type Neuron = { x: number; y: number; vx: number; vy: number; r: number; pulse: number; phase: number };
    const neurons: Neuron[] = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - .5) * .28,
      vy: (Math.random() - .5) * .28,
      r: Math.random() * 2.5 + 1.2,
      pulse: 0,
      phase: Math.random() * Math.PI * 2,
    }));

    const LINK_DIST = 140;

    const draw = (t: number) => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // update
      for (const n of neurons) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.001 + n.phase));
      }

      // links
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = neurons[i].x - neurons[j].x;
          const dy = neurons[i].y - neurons[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > LINK_DIST) continue;
          const alpha = (1 - dist / LINK_DIST) * 0.18;
          ctx.beginPath();
          ctx.moveTo(neurons[i].x, neurons[i].y);
          ctx.lineTo(neurons[j].x, neurons[j].y);
          ctx.strokeStyle = \`rgba(200,150,12,\${alpha})\`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // nodes
      for (const n of neurons) {
        // glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
        grd.addColorStop(0, \`rgba(180,140,255,\${0.10 * n.pulse})\`);
        grd.addColorStop(1, "rgba(180,140,255,0)");
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * n.pulse, 0, Math.PI * 2);
        ctx.fillStyle = \`rgba(180,140,255,\${0.55 * n.pulse})\`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
    />
  );
}

/* ─── Animated Marketing Panel ───────────────────────────────────────────────── */
function MarketingPanel() {
  const [visibleFeatures, setVisibleFeatures] = useState<number[]>([]);
  const [stats, setStats] = useState([0, 0, 0]);

  const features = [
    "Natural language parameter extraction",
    "Deterministic BS 8110 / BS 5950 engine",
    "7-section professional report output",
    "SVG detailing sketches + bar schedule",
    "Instant PDF export & sharing",
  ];

  const targetStats = [98, 12, 7];
  const statLabels = ["Accuracy %", "Sec avg calc", "Report sections"];

  useEffect(() => {
    // reveal features one by one
    features.forEach((_, i) => {
      setTimeout(() => setVisibleFeatures(prev => [...prev, i]), 400 + i * 320);
    });

    // tick-up counters
    const steps = 40;
    const interval = 40;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const t = Math.min(step / steps, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setStats(targetStats.map(v => Math.round(v * ease)));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const [glowPhase, setGlowPhase] = useState(0);
  useEffect(() => {
    let raf: number;
    const tick = () => { setGlowPhase(p => p + 0.02); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const glowSize = 8 + 4 * Math.sin(glowPhase);
  const glowOpacity = 0.7 + 0.3 * Math.sin(glowPhase);

  return (
    <div className="ws-marketing" style={{
      flex: "0 0 340px",
      background: "linear-gradient(160deg,#0a1f3d 0%,#0d2a50 60%,#0f2d5a 100%)",
      borderLeft: "1px solid rgba(200,150,12,.2)",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "36px 32px", overflow: "hidden", position: "relative",
    }}>
      {/* subtle animated gradient sweep */}
      <div style={{
        position: "absolute", inset: 0,
        background: \`radial-gradient(ellipse 60% 50% at \${50 + 20 * Math.sin(glowPhase * .2)}% \${40 + 20 * Math.cos(glowPhase * .15)}%, rgba(200,150,12,.06) 0%, transparent 70%)\`,
        pointerEvents: "none", transition: "background .1s",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* label row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <div style={{ width: glowSize, height: glowSize, borderRadius: "50%", background: "var(--gold2)", opacity: glowOpacity, transition: "all .05s", boxShadow: \`0 0 \${glowSize * 2}px rgba(200,150,12,.6)\` }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "rgba(200,150,12,.9)", letterSpacing: "1.2px", textTransform: "uppercase" }}>
            AI-Powered Structural Design
          </span>
        </div>

        {/* headline */}
        <div style={{ fontFamily: "var(--ser)", fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-.5px", lineHeight: 1.2, marginBottom: 14 }}>
          The Future of<br/>Structural Engineering<br/>
          <span style={{ color: "var(--gold2)" }}>Is Here.</span>
        </div>

        <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.7, marginBottom: 26 }}>
          Describe your element in plain English. SSAD extracts parameters, runs BS 8110 calculations, and delivers a signed report — in seconds.
        </div>

        {/* animated stat counters */}
        <div style={{ display: "flex", gap: 20, marginBottom: 28 }}>
          {stats.map((val, i) => (
            <div key={statLabels[i]} style={{ textAlign: "center", flex: 1, background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "10px 6px", border: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ fontFamily: "var(--ser)", fontSize: 22, fontWeight: 700, color: i === 0 ? "rgba(200,150,12,.9)" : "#fff", lineHeight: 1 }}>{val}{i === 0 ? "%" : ""}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "rgba(255,255,255,.38)", letterSpacing: ".5px", marginTop: 4 }}>{statLabels[i]}</div>
            </div>
          ))}
        </div>

        {/* animated feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {features.map((text, i) => (
            <div key={text} style={{
              display: "flex", alignItems: "center", gap: 10,
              opacity: visibleFeatures.includes(i) ? 1 : 0,
              transform: visibleFeatures.includes(i) ? "translateX(0)" : "translateX(-12px)",
              transition: "opacity .4s ease, transform .4s ease",
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                background: visibleFeatures.includes(i) ? "rgba(200,150,12,.2)" : "transparent",
                border: \`1.5px solid \${visibleFeatures.includes(i) ? "#c8960c" : "rgba(255,255,255,.15)"}\`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "all .35s",
              }}>
                {visibleFeatures.includes(i) && (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#c8960c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span style={{ fontFamily: "var(--ui)", fontSize: 12, color: "rgba(255,255,255,.7)" }}>{text}</span>
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: ".5px" }}>BAE CONSULTING ENGINEERS · CEng MIStructE</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Workspace Home ─────────────────────────────────────────────────────────── */
function WorkspaceHome() {
  const { goScreen } = useWorkspace();
  const { effectiveTier, user } = useAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = (user as any)?.fullName || (user as any)?.email?.split("@")[0] || "Engineer";

  const tierColor = effectiveTier === "pro" ? "#22c55e" : effectiveTier === "trial" ? "#3b82f6" : "rgba(255,255,255,.4)";
  const tierLabel = effectiveTier === "pro" ? "PRO" : effectiveTier === "trial" ? "TRIAL" : "GUEST";

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "#0d1b2e", position: "relative" }}>

      {/* Left content column */}
      <div className="ws-agents" style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", position: "relative" }}>
        {/* Neural net canvas fills behind everything */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <NeuralCanvas />
        </div>

        <div style={{ position: "relative", zIndex: 1, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 28 }}>

          {/* ── Welcome Banner ── */}
          <div style={{
            background: "linear-gradient(135deg,rgba(26,74,138,.55) 0%,rgba(15,45,90,.45) 100%)",
            border: "1px solid rgba(200,150,12,.3)",
            borderRadius: 18, padding: "24px 28px",
            backdropFilter: "blur(12px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "var(--ser)", fontSize: 13, color: "rgba(255,255,255,.5)", fontStyle: "italic", marginBottom: 4 }}>{greeting},</div>
                <div style={{ fontFamily: "var(--ser)", fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-.4px", lineHeight: 1.1 }}>{name}</div>
                <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 6, lineHeight: 1.5 }}>
                  Ready to design? Select an AI assistant below to get started.
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "8px 14px" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: tierColor, boxShadow: \`0 0 8px \${tierColor}\` }} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.75)", letterSpacing: ".5px" }}>{tierLabel}</span>
                </div>
                {effectiveTier === "guest" && (
                  <button
                    onClick={() => goScreen("upgrade")}
                    style={{ background: "linear-gradient(135deg,#c8960c,#e0a820)", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "#0a1f3d", letterSpacing: ".5px" }}
                  >
                    UPGRADE ⭐
                  </button>
                )}
              </div>
            </div>

            {/* Workflow steps */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.08)" }}>
              {["Describe", "Extract", "Confirm", "Calculate", "Report"].map((step, i, arr) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.45)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)" }}>
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5h6M6 2l3 3-3 3" stroke="rgba(200,150,12,.55)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Agent Cards ── */}
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "rgba(200,150,12,.6)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 14 }}>
              AI Design Assistants
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* RC Design Assistant */}
              <div
                className="ws-agent-card"
                onClick={() => goScreen("ai")}
                style={{
                  background: "rgba(255,255,255,.055)", backdropFilter: "blur(10px)",
                  border: "1px solid rgba(200,150,12,.3)", borderRadius: 18,
                  padding: "22px 22px", cursor: "pointer", transition: "all .22s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(26,74,138,.5)", border: "2px solid rgba(200,150,12,.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 30 }}>🏗️</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <div style={{ fontFamily: "var(--ser)", fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-.2px" }}>RC Design Assistant</div>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: "rgba(200,150,12,.9)", background: "rgba(200,150,12,.12)", border: "1px solid rgba(200,150,12,.35)", borderRadius: 20, padding: "2px 8px", letterSpacing: ".5px" }}>AI</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,.5)", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "2px 8px" }}>BS 8110 · EC2</span>
                    </div>
                    <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.6, marginBottom: 14 }}>
                      Reinforced concrete beams, slabs, columns and foundations. Designed to BS 8110 — describe your element in plain English.
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {["Simply Supported Beam", "Continuous Slab", "Braced Column", "Pad Foundation", "Retaining Beam"].map(s => (
                        <span key={s} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(200,150,12,.8)", background: "rgba(200,150,12,.08)", border: "1px solid rgba(200,150,12,.2)", borderRadius: 12, padding: "3px 10px" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, alignSelf: "center" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "rgba(200,150,12,.8)" }}>Open</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7h8M8 4l3 3-3 3" stroke="#c8960c" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Steel Design Assistant */}
              <div
                className="ws-agent-card"
                onClick={() => effectiveTier === "guest" ? goScreen("upgrade") : goScreen("ai")}
                style={{
                  background: "rgba(255,255,255,.055)", backdropFilter: "blur(10px)",
                  border: "1px solid rgba(100,140,220,.32)", borderRadius: 18,
                  padding: "22px 22px", cursor: "pointer", transition: "all .22s",
                  opacity: effectiveTier === "guest" ? 0.55 : 1, position: "relative",
                }}
              >
                {effectiveTier === "guest" && (
                  <span style={{ position: "absolute", top: 14, right: 14, fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: "#c8960c", background: "rgba(200,150,12,.15)", border: "1px solid rgba(200,150,12,.4)", borderRadius: 6, padding: "3px 8px", letterSpacing: ".8px" }}>PRO</span>
                )}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(10,30,80,.55)", border: "2px solid rgba(100,140,220,.45)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 30 }}>🔩</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <div style={{ fontFamily: "var(--ser)", fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-.2px" }}>Steel Design Assistant</div>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: "rgba(100,180,255,.9)", background: "rgba(100,180,255,.1)", border: "1px solid rgba(100,180,255,.25)", borderRadius: 20, padding: "2px 8px", letterSpacing: ".5px" }}>AI</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,.5)", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "2px 8px" }}>BS 5950</span>
                    </div>
                    <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.6, marginBottom: 14 }}>
                      Structural steel beams, columns and trusses to BS 5950. UB, UC, RHS and CHS sections — just describe your requirement.
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {["UB Steel Beam", "UC Column", "RHS Truss Member", "CHS Section"].map(s => (
                        <span key={s} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(100,180,255,.75)", background: "rgba(100,180,255,.06)", border: "1px solid rgba(100,180,255,.18)", borderRadius: 12, padding: "3px 10px" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, alignSelf: "center" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: effectiveTier === "guest" ? "rgba(255,255,255,.35)" : "rgba(100,180,255,.8)" }}>
                      {effectiveTier === "guest" ? "Locked" : "Open"}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7h8M8 4l3 3-3 3" stroke={effectiveTier === "guest" ? "rgba(255,255,255,.3)" : "rgba(100,180,255,.8)"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Ancillaries Structures Design Assistant – Coming Soon */}
              <div
                className="ws-agent-card"
                style={{
                  background: "rgba(255,255,255,.03)", backdropFilter: "blur(10px)",
                  border: "1px solid rgba(100,200,150,.2)", borderRadius: 18,
                  padding: "22px 22px", cursor: "not-allowed", transition: "all .22s",
                  opacity: 0.6, position: "relative",
                }}
              >
                <span style={{ position: "absolute", top: 14, right: 14, fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: "rgba(100,220,160,.9)", background: "rgba(100,220,160,.1)", border: "1px solid rgba(100,220,160,.3)", borderRadius: 6, padding: "3px 8px", letterSpacing: ".8px" }}>COMING SOON</span>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(10,40,25,.45)", border: "2px solid rgba(100,200,150,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 30 }}>🏛️</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <div style={{ fontFamily: "var(--ser)", fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,.7)", letterSpacing: "-.2px" }}>Ancillaries Structures Assistant</div>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: "rgba(100,220,160,.7)", background: "rgba(100,220,160,.08)", border: "1px solid rgba(100,220,160,.2)", borderRadius: 20, padding: "2px 8px", letterSpacing: ".5px" }}>AI</span>
                    </div>
                    <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.6, marginBottom: 14 }}>
                      Retaining walls, shear walls, staircases, ground beams and ancillary structural elements. AI-assisted design coming in the next release.
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {["Retaining Wall", "Shear Wall", "Staircase", "Ground Beam", "Pile Cap"].map(s => (
                        <span key={s} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(100,220,160,.55)", background: "rgba(100,220,160,.05)", border: "1px solid rgba(100,220,160,.15)", borderRadius: 12, padding: "3px 10px" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── Recent Projects ── */}
          <div style={{
            background: "rgba(255,255,255,.04)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "22px 22px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "rgba(200,150,12,.6)", letterSpacing: "1.2px", textTransform: "uppercase" }}>
                Recent Projects
              </div>
              <button
                onClick={() => goScreen("projects")}
                style={{ background: "none", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.5)", letterSpacing: ".5px" }}
              >
                View All →
              </button>
            </div>

            {effectiveTier === "guest" ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: "rgba(255,255,255,.35)", marginBottom: 12 }}>
                  Sign in to save and access your projects
                </div>
                <button
                  onClick={() => goScreen("upgrade")}
                  style={{ background: "rgba(200,150,12,.15)", border: "1px solid rgba(200,150,12,.35)", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "rgba(200,150,12,.9)", letterSpacing: ".5px" }}
                >
                  GET STARTED
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {[
                  { name: "Project Alpha — RC Beam", type: "RC Design", date: "Today", status: "Complete" },
                  { name: "Project Beta — Steel UB", type: "Steel Design", date: "Yesterday", status: "In Progress" },
                  { name: "Site Office Foundation", type: "RC Design", date: "3 days ago", status: "Complete" },
                ].map((proj, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)",
                    cursor: "pointer", transition: "all .18s", marginBottom: 6,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: proj.status === "Complete" ? "#22c55e" : "#f59e0b", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>{proj.name}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{proj.type} · {proj.date}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: proj.status === "Complete" ? "rgba(34,197,94,.8)" : "rgba(245,158,11,.8)", background: proj.status === "Complete" ? "rgba(34,197,94,.1)" : "rgba(245,158,11,.1)", border: \`1px solid \${proj.status === "Complete" ? "rgba(34,197,94,.3)" : "rgba(245,158,11,.3)"}\`, borderRadius: 6, padding: "2px 8px" }}>
                      {proj.status}
                    </span>
                  </div>
                ))}
                <div style={{ textAlign: "center", padding: "8px 0 0", fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.25)" }}>
                  Showing placeholder data — real projects coming soon
                </div>
              </div>
            )}
          </div>

        </div>{/* /inner padding */}
      </div>{/* /left column */}

      {/* Right: animated marketing panel */}
      <MarketingPanel />
    </div>
  );
}

/* ─── Root WorkspaceScreen ───────────────────────────────────────────────────── */
export default function WorkspaceScreen() {
  const { screen, goScreen } = useWorkspace();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && screen !== "auth") {
      goScreen("auth");
    }
  }, [isLoading, isAuthenticated, screen, goScreen]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && screen === "auth") {
      goScreen("workspace");
    }
  }, [isLoading, isAuthenticated, screen, goScreen]);

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <AuthScreen />;

  let content: React.ReactNode;
  if (screen === "ai")             content = <AIChatPanel />;
  else if (screen === "result")    content = <ResultPanel />;
  else if (screen === "report")    content = <ReportPanel />;
  else if (screen === "detailing") content = <DetailingPanel />;
  else if (screen === "projects")  content = <ProjectsScreen />;
  else if (screen === "settings")  content = <SettingsScreen />;
  else if (screen === "upgrade")   content = <UpgradeScreen />;
  else content = <WorkspaceHome />;

  return <DesktopShell>{content}</DesktopShell>;
}
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log('WorkspaceScreen written:', content.length, 'chars');
