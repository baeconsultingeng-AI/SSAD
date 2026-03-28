const fs = require('fs');
const path = require('path');

// ── 1. DesktopShell ────────────────────────────────────────────────────────────
const shellPath = path.join(__dirname, 'frontend/src/components/layout/DesktopShell.tsx');
const shellContent = `"use client";

import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";

function SteelIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" width="18" height="18">
      <circle cx="24" cy="24" r="23" fill="#0f2d5a"/>
      <circle cx="24" cy="24" r="23" stroke="#c8960c" strokeWidth="2"/>
      <line x1="6" y1="36" x2="6" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="18" y1="36" x2="18" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="14" x2="18" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="25" x2="18" y2="25" stroke="rgba(200,150,12,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="28" y1="36" x2="42" y2="36" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="35" y1="36" x2="35" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function RcIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" width="18" height="18">
      <circle cx="24" cy="24" r="23" fill="#1a4a8a"/>
      <circle cx="24" cy="24" r="23" stroke="#c8960c" strokeWidth="2"/>
      <rect x="13" y="12" width="22" height="17" rx="4" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
      <rect x="16" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
      <rect x="26" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
      <rect x="16" y="24" width="16" height="3" rx="1" fill="rgba(200,150,12,0.4)" stroke="rgba(200,150,12,0.7)" strokeWidth="1"/>
      <rect x="11" y="32" width="26" height="10" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
    </svg>
  );
}

function AncilIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" width="18" height="18">
      <circle cx="24" cy="24" r="23" fill="#1a3a2a"/>
      <circle cx="24" cy="24" r="23" stroke="#c8960c" strokeWidth="2"/>
      <rect x="10" y="28" width="28" height="10" rx="2" fill="rgba(255,255,255,0.12)" stroke="white" strokeWidth="1.5"/>
      <line x1="18" y1="28" x2="18" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="30" y1="28" x2="30" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="18" y1="12" x2="30" y2="18" stroke="rgba(200,150,12,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
    </svg>
  );
}

export default function DesktopShell({ children }: { children: React.ReactNode }) {
  const { screen, goScreen } = useWorkspace();
  const { user, logout } = useAuth();

  const navItems = [
    {
      section: "Workspace",
      items: [
        {
          id: "workspace", label: "Home", action: () => goScreen("workspace"),
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg>
        },
        {
          id: "projects", label: "Projects", action: () => goScreen("projects"),
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        },
      ]
    },
    {
      section: "AI Design Assistants",
      items: [
        { id: "rc", label: "RC Design Assistant", action: () => goScreen("ai"), icon: <RcIcon /> },
        { id: "steel", label: "Steel Design Assistant", action: () => goScreen("ai"), icon: <SteelIcon /> },
        { id: "ancil", label: "Ancillaries Assistant", action: () => goScreen("ai"), icon: <AncilIcon /> },
      ]
    },
    {
      section: "Account",
      items: [
        {
          id: "settings", label: "Settings", action: () => goScreen("settings"),
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        },
        {
          id: "upgrade", label: "Upgrade to Pro", action: () => goScreen("upgrade"),
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="#c8960c" strokeWidth="1.8" strokeLinecap="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
        },
      ]
    },
  ];

  const activeId = ["rc", "steel", "ancil"].includes(screen) ? "rc" : screen;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#0d1b2e" }}>

      {/* ── TOP BAR ── */}
      <div style={{
        background: "linear-gradient(135deg,#0a1f3d,#0d2a50 60%,#0f2d5a)",
        borderBottom: "1px solid rgba(200,150,12,.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 64,
        flexShrink: 0,
        zIndex: 100,
        position: "sticky",
        top: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, background: "rgba(200,150,12,.2)", border: "1.5px solid rgba(200,150,12,.45)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 40 40" fill="none" width="22" height="22">
              <line x1="6" y1="36" x2="6" y2="8" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="34" y1="36" x2="34" y2="8" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="6" y1="8" x2="34" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="22" x2="17" y2="20" stroke="rgba(200,150,12,0.55)" strokeWidth="0.8"/>
              <line x1="17" y1="20" x2="23" y2="20" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
              <line x1="23" y1="20" x2="34" y2="22" stroke="rgba(200,150,12,0.55)" strokeWidth="0.8"/>
              <circle cx="6" cy="22" r="2.5" fill="rgba(200,150,12,0.3)" stroke="#c8960c" strokeWidth="1"/>
              <circle cx="17" cy="20" r="2.5" fill="rgba(200,150,12,0.2)" stroke="#c8960c" strokeWidth="0.9"/>
              <circle cx="23" cy="20" r="2.5" fill="rgba(200,150,12,0.2)" stroke="#c8960c" strokeWidth="0.9"/>
              <circle cx="34" cy="22" r="2.5" fill="rgba(200,150,12,0.3)" stroke="#c8960c" strokeWidth="1"/>
              <circle cx="6" cy="8" r="2.5" fill="rgba(200,150,12,0.35)" stroke="#c8960c" strokeWidth="1.2"/>
              <circle cx="34" cy="8" r="2.5" fill="rgba(200,150,12,0.35)" stroke="#c8960c" strokeWidth="1.2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-.3px" }}>SSAD</div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 9, color: "rgba(200,150,12,.85)", fontStyle: "italic", marginTop: 1 }}>
              <em>Smart Structural Analysis &amp; Design</em>
            </div>
          </div>
        </div>

        {/* Right — user pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "6px 14px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "rgba(255,255,255,.8)", fontWeight: 600 }}>
                {user.fullName || user.email || "Guest"}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(200,150,12,.85)", background: "rgba(200,150,12,.15)", border: "1px solid rgba(200,150,12,.3)", borderRadius: 4, padding: "2px 6px", textTransform: "uppercase" }}>
                {user.tier}
              </span>
            </div>
          )}
          <button
            onClick={logout}
            style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: "6px 12px", color: "rgba(255,255,255,.6)", fontFamily: "var(--mono)", fontSize: 11, cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── BODY ROW ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{
          flexDirection: "column",
          background: "linear-gradient(180deg,#0d2240 0%,#0f2d5a 40%,#112f5e 100%)",
          borderRight: "1px solid rgba(200,150,12,.2)",
          width: 260,
          overflowY: "auto",
          flexShrink: 0,
          display: "flex",
        }}>
          {navItems.map((group) => (
            <div key={group.section}>
              <div style={{ padding: "20px 20px 10px", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "rgba(200,150,12,.6)", letterSpacing: "1px", textTransform: "uppercase" }}>
                {group.section}
              </div>
              {group.items.map((item) => (
                <div
                  key={item.id}
                  onClick={item.action}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 20px", cursor: "pointer",
                    transition: "all .18s",
                    color: activeId === item.id ? "#fff" : "rgba(255,255,255,.55)",
                    fontFamily: "var(--ui)", fontSize: 13, fontWeight: activeId === item.id ? 600 : 500,
                    borderLeft: \`3px solid \${activeId === item.id ? "var(--gold)" : "transparent"}\`,
                    background: activeId === item.id ? "rgba(200,150,12,.12)" : "transparent",
                    margin: "1px 0",
                  }}
                >
                  <div style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </div>
              ))}
              <div style={{ height: 1, background: "rgba(255,255,255,.07)", margin: "4px 20px" }} />
            </div>
          ))}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(shellPath, shellContent, 'utf8');
console.log('DesktopShell written:', shellContent.length, 'chars');
