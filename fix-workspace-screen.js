const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'frontend/src/components/workspace/WorkspaceScreen.tsx');

const content = `"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";

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
        Loading…
      </div>
    </div>
  );
}

function WorkspaceHome() {
  const { goScreen } = useWorkspace();
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(160deg,#0d1b2e 0%,#1a3a6a 100%)", overflow: "auto" }}>
      {/* Status bar */}
      <div className="sb" style={{ background: "transparent", color: "#fff" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>9:41</span>
        <span style={{ fontSize: 11 }}>●●● 🔋</span>
      </div>

      {/* Header */}
      <div style={{ padding: "24px 20px 12px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--ser)", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-.3px" }}>SSAD</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(200,150,12,.8)", letterSpacing: ".5px", marginTop: 2 }}>
          STRUCTURAL ANALYSIS &amp; DESIGN · BAE CONSULTING
        </div>
      </div>

      {/* AI cards */}
      <div style={{ padding: "0 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={() => goScreen("ai")}
          style={{ background: "rgba(200,150,12,.15)", border: "1.5px solid rgba(200,150,12,.4)", borderRadius: 14, padding: "14px 16px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
        >
          <span style={{ fontSize: 22 }}>🏗️</span>
          <div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 14, fontWeight: 700, color: "#fff" }}>RC Design — AI Chat</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "rgba(255,255,255,.55)", marginTop: 2 }}>Describe your element, AI extracts parameters</div>
          </div>
        </button>
        <button
          onClick={() => goScreen("ai")}
          style={{ background: "rgba(100,140,200,.15)", border: "1.5px solid rgba(100,140,200,.35)", borderRadius: 14, padding: "14px 16px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
        >
          <span style={{ fontSize: 22 }}>🔩</span>
          <div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 14, fontWeight: 700, color: "#fff" }}>Steel Design — AI Chat</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "rgba(255,255,255,.55)", marginTop: 2 }}>Natural language input for beams, columns, trusses</div>
          </div>
        </button>
      </div>

      {/* Classic mode */}
      <div style={{ padding: "4px 16px 8px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: ".5px", marginBottom: 8, textTransform: "uppercase" }}>Classic Mode</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "Steel Beam", screen: "steel-beam" as const, icon: "━" },
            { label: "Steel Col", screen: "steel-col" as const, icon: "║" },
            { label: "Steel Truss", screen: "steel-truss" as const, icon: "△" },
          ].map((item) => (
            <button
              key={item.screen}
              onClick={() => goScreen(item.screen)}
              style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.13)", borderRadius: 10, padding: "12px 6px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
            >
              <span style={{ fontSize: 18, fontFamily: "var(--mono)", color: "rgba(200,150,12,.9)" }}>{item.icon}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.7)", textAlign: "center", lineHeight: 1.3 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="bnav" style={{ background: "rgba(0,0,0,.4)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,.1)", padding: "8px 0 4px", display: "flex", justifyContent: "space-around", flexShrink: 0 }}>
        {[
          { label: "Home", icon: "⌂", screen: "workspace" as const },
          { label: "AI Chat", icon: "💬", screen: "ai" as const },
          { label: "Projects", icon: "📁", screen: "projects" as const },
          { label: "Settings", icon: "⚙", screen: "settings" as const },
        ].map((item) => (
          <button
            key={item.screen}
            onClick={() => goScreen(item.screen)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "4px 12px" }}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "rgba(255,255,255,.55)" }}>{item.label}</span>
          </button>
        ))}
      </div>
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
  if (screen === "ai")          return <AIChatPanel />;
  if (screen === "result")      return <ResultPanel />;
  if (screen === "report")      return <ReportPanel />;
  if (screen === "detailing")   return <DetailingPanel />;
  if (screen === "steel-beam")  return <SteelBeamForm />;
  if (screen === "steel-col")   return <SteelColForm />;
  if (screen === "steel-truss") return <SteelTrussForm />;
  if (screen === "projects")    return <ProjectsScreen />;
  if (screen === "settings")    return <SettingsScreen />;
  if (screen === "upgrade")     return <UpgradeScreen />;
  return <WorkspaceHome />;
}
`;

fs.writeFileSync(target, content, 'utf8');
console.log('Done. Size:', content.length, 'chars');
