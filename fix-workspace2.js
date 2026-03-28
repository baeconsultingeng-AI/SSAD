const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'frontend/src/components/workspace/WorkspaceScreen.tsx');

const content = `"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import DesktopShell from "@/components/layout/DesktopShell";

import AIChatPanel from "@/components/workspace/AIChatPanel";
import ResultPanel from "@/components/workspace/ResultPanel";
import ReportPanel from "@/components/workspace/ReportPanel";
import DetailingPanel from "@/components/workspace/DetailingPanel";
import SteelBeamForm from "@/components/workspace/forms/SteelBeamForm";
import SteelColForm from "@/components/workspace/forms/SteelColForm";
import SteelTrussForm from "@/components/workspace/forms/SteelTrussForm";
import ProjectsScreen from "@/components/projects/ProjectsScreen";
import SettingsScreen from "@/components/settings/SettingsScreen";
import UpgradeScreen from "@/components/upgrade/UpgradeScreen";
import AuthScreen from "@/components/auth/AuthScreen";

function LoadingSpinner() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1b2e" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "rgba(255,255,255,.4)", letterSpacing: ".1em" }}>
        Loading\u2026
      </div>
    </div>
  );
}

// Marketing panel — right column on desktop workspace
function MarketingPanel() {
  return (
    <div className="ws-marketing" style={{
      flex: "0 0 340px",
      background: "linear-gradient(160deg,#0a1f3d 0%,#0d2a50 60%,#0f2d5a 100%)",
      borderLeft: "1px solid rgba(200,150,12,.15)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "36px 32px",
      overflow: "hidden",
      position: "relative",
    }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--gold2)", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "rgba(200,150,12,.9)", letterSpacing: "1.2px", textTransform: "uppercase" }}>
            AI-Powered Structural Design
          </span>
        </div>
        <div style={{ fontFamily: "var(--ser)", fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-.5px", lineHeight: 1.15, marginBottom: 14 }}>
          The Future of<br/>Structural Engineering<br/>
          <span style={{ color: "var(--gold2)" }}>Is Here.</span>
        </div>
        <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.7, marginBottom: 28 }}>
          Describe your element in plain English. SSAD extracts parameters, runs BS 8110 calculations, and delivers a signed report \u2014 in seconds.
        </div>
        <div style={{ display: "flex", gap: 28, marginBottom: 32 }}>
          {[
            { val: "AI", sub: "POWERED" },
            { val: "BS8110", sub: "STANDARD" },
            { val: "v1.0", sub: "BETA" },
          ].map(s => (
            <div key={s.sub}>
              <div style={{ fontFamily: "var(--ser)", fontSize: 24, fontWeight: 700, color: s.sub === "POWERED" ? "rgba(200,150,12,.9)" : "#fff" }}>{s.val}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "rgba(255,255,255,.4)", letterSpacing: ".5px", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "\u2713", text: "Natural language parameter extraction" },
            { icon: "\u2713", text: "Deterministic BS 8110 / BS 5950 engine" },
            { icon: "\u2713", text: "7-section professional report output" },
            { icon: "\u2713", text: "SVG detailing sketches + bar schedule" },
          ].map(f => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--gold2)", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700 }}>{f.icon}</span>
              <span style={{ fontFamily: "var(--ui)", fontSize: 12, color: "rgba(255,255,255,.7)" }}>{f.text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: ".5px" }}>
            BAE CONSULTING ENGINEERS \u00b7 CEng MIStructE
          </div>
        </div>
      </div>
    </div>
  );
}

// Workspace home — agent cards + classic mode grid
function WorkspaceHome() {
  const { goScreen } = useWorkspace();
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "linear-gradient(160deg,#0d1b2e 0%,#12294a 100%)" }}>
      {/* Left: agent cards + classic mode */}
      <div className="ws-agents" style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "24px 0 16px" }}>
        {/* Greeting */}
        <div style={{ padding: "0 24px 16px" }}>
          <div style={{ fontFamily: "var(--ser)", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-.3px", marginBottom: 10 }}>
            What are you designing today?
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            {["Describe", "Extract", "Confirm", "Design"].map((step, i, arr) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontFamily: "var(--ser)", fontSize: 9, fontWeight: 600, fontStyle: "italic", color: "rgba(255,255,255,.45)", padding: "3px 8px", borderRadius: 20, border: "1px solid rgba(255,255,255,.1)" }}>
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5h6M6 2l3 3-3 3" stroke="rgba(200,150,12,.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RC Agent card */}
        <div className="ws-agent-card" onClick={() => goScreen("ai")} style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,150,12,0.28)",
          borderRadius: 16, padding: "18px 16px", margin: "0 16px 12px", cursor: "pointer", transition: "all .22s",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(26,74,138,.4)", border: "1.5px solid rgba(200,150,12,.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 22 }}>🏗️</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontFamily: "var(--ser)", fontSize: 15, fontWeight: 700, color: "#fff" }}>SSAD RC Agent</div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "2px 8px" }}>AI</span>
              </div>
              <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.5, marginBottom: 10 }}>
                RC beams, slabs, columns, foundations \u2014 BS 8110. Describe in plain English.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {["Simply Supported Beam", "Two-Way Slab", "Pad Foundation", "Braced Column"].map(s => (
                  <span key={s} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.55)", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "3px 8px" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Steel Agent card */}
        <div className="ws-agent-card" onClick={() => goScreen("ai")} style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(100,140,200,0.28)",
          borderRadius: 16, padding: "18px 16px", margin: "0 16px 20px", cursor: "pointer", transition: "all .22s",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,30,80,.5)", border: "1.5px solid rgba(100,140,200,.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 22 }}>🔩</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontFamily: "var(--ser)", fontSize: 15, fontWeight: 700, color: "#fff" }}>SSAD Steel Agent</div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "2px 8px" }}>AI</span>
              </div>
              <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.5, marginBottom: 10 }}>
                UB/UC beams, columns, trusses \u2014 BS 5950. Input in natural language.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {["Steel Beam UB", "UC Column", "RHS Truss", "CHS Member"].map(s => (
                  <span key={s} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.55)", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "3px 8px" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Classic mode */}
        <div style={{ padding: "0 16px 8px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "rgba(200,150,12,.6)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10, padding: "0 8px" }}>
            Classic Mode
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Steel Beam", screen: "steel-beam" as const, icon: "\u2501" },
              { label: "Steel Col", screen: "steel-col" as const, icon: "\u2551" },
              { label: "Steel Truss", screen: "steel-truss" as const, icon: "\u25b3" },
            ].map((item) => (
              <button
                key={item.screen}
                onClick={() => goScreen(item.screen)}
                style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.13)", borderRadius: 10, padding: "14px 6px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
              >
                <span style={{ fontSize: 18, fontFamily: "var(--mono)", color: "rgba(200,150,12,.9)" }}>{item.icon}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.7)", textAlign: "center", lineHeight: 1.3 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: marketing panel */}
      <MarketingPanel />
    </div>
  );
}

export default function WorkspaceScreen() {
  const { screen, goScreen } = useWorkspace();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && screen !== "auth") {
      goScreen("auth");
    }
  }, [isLoading, isAuthenticated, screen, goScreen]);

  if (isLoading) return <LoadingSpinner />;
  if (screen === "auth" || !isAuthenticated) return <AuthScreen />;

  // Authenticated — wrap in desktop shell
  let content: React.ReactNode;
  if (screen === "ai")          content = <AIChatPanel />;
  else if (screen === "result") content = <ResultPanel />;
  else if (screen === "report") content = <ReportPanel />;
  else if (screen === "detailing")   content = <DetailingPanel />;
  else if (screen === "steel-beam")  content = <SteelBeamForm />;
  else if (screen === "steel-col")   content = <SteelColForm />;
  else if (screen === "steel-truss") content = <SteelTrussForm />;
  else if (screen === "projects")    content = <ProjectsScreen />;
  else if (screen === "settings")    content = <SettingsScreen />;
  else if (screen === "upgrade")     content = <UpgradeScreen />;
  else content = <WorkspaceHome />;

  return <DesktopShell>{content}</DesktopShell>;
}
`;

fs.writeFileSync(target, content, 'utf8');
console.log('Done. Size:', content.length);
