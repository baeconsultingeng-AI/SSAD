"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import { loadProjects, type StoredProject } from "@/lib/calc-storage";
import PaymentModal from "@/components/payment/PaymentModal";

function SteelIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" width="18" height="18">
      <circle cx="24" cy="24" r="23" fill="#1a3a5c"/>
      <circle cx="24" cy="24" r="23" stroke="#c8960c" strokeWidth="1.5"/>
      {/* Top flange – brow */}
      <rect x="9" y="11" width="30" height="7" rx="2" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2"/>
      {/* Web – nose column */}
      <rect x="21" y="18" width="6" height="12" rx="1" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      {/* Bottom flange – jaw / mouth */}
      <rect x="9" y="30" width="30" height="7" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      {/* Gold eyes */}
      <rect x="12" y="13" width="6" height="3" rx="1.5" fill="#c8960c"/>
      <rect x="30" y="13" width="6" height="3" rx="1.5" fill="#c8960c"/>
      {/* Mouth line */}
      <line x1="16" y1="34" x2="32" y2="34" stroke="rgba(200,150,12,0.65)" strokeWidth="1.3" strokeLinecap="round"/>
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
      <circle cx="24" cy="24" r="23" stroke="#c8960c" strokeWidth="1.5"/>
      {/* Face panel */}
      <rect x="12" y="10" width="24" height="21" rx="3" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/>
      {/* Porthole eyes */}
      <circle cx="18.5" cy="19" r="3.5" fill="rgba(200,150,12,0.18)" stroke="#c8960c" strokeWidth="1.3"/>
      <circle cx="29.5" cy="19" r="3.5" fill="rgba(200,150,12,0.18)" stroke="#c8960c" strokeWidth="1.3"/>
      <circle cx="18.5" cy="19" r="1.4" fill="#c8960c"/>
      <circle cx="29.5" cy="19" r="1.4" fill="#c8960c"/>
      {/* Mouth slot */}
      <rect x="17" y="25" width="14" height="3" rx="1.2" fill="rgba(255,255,255,0.28)"/>
      {/* Foundation base */}
      <rect x="9" y="33" width="30" height="5" rx="1.5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
      {/* Ground hatch lines */}
      <line x1="11" y1="40" x2="15" y2="38" stroke="rgba(200,150,12,0.55)" strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="18" y1="40" x2="22" y2="38" stroke="rgba(200,150,12,0.55)" strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="25" y1="40" x2="29" y2="38" stroke="rgba(200,150,12,0.55)" strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="32" y1="40" x2="36" y2="38" stroke="rgba(200,150,12,0.55)" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}

export default function DesktopShell({ children }: { children: React.ReactNode }) {
  const { screen, goScreen, projectId, setActiveProject } = useWorkspace();
  const { user, logout } = useAuth();

  const [projMenuOpen, setProjMenuOpen]     = useState(false);
  const [projects, setProjects]             = useState<StoredProject[]>([]);
  const [paymentOpen, setPaymentOpen]       = useState(false);
  const projMenuRef = useRef<HTMLDivElement>(null);

  // Trial countdown
  const trialDaysLeft = (() => {
    if (!user || user.tier !== "trial" || !user.trialExpiresAt) return null;
    const ms = new Date(user.trialExpiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
  })();

  useEffect(() => {
    if (projMenuOpen) setProjects(loadProjects());
  }, [projMenuOpen]);

  useEffect(() => {
    if (!projMenuOpen) return;
    function handler(e: MouseEvent) {
      if (projMenuRef.current && !projMenuRef.current.contains(e.target as Node)) {
        setProjMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [projMenuOpen]);

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
        {
          id: "settings", label: "Settings", action: () => goScreen("settings"),
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        },
      ]
    },
    {
      section: "AI Design Assistants",
      items: [
        { id: "rc",    label: "RC Design Assistant",          action: () => goScreen("ai"),        icon: <RcIcon /> },
        { id: "steel", label: "Steel Design Assistant",       action: () => goScreen("steel"),     icon: <SteelIcon /> },
        { id: "ancil", label: "Ancillaries Design Assistant", action: () => goScreen("workspace"), icon: <AncilIcon /> },
      ]
    },
    {
      section: "Account",
      items: [
        {
          id: "upgrade", label: "Upgrade to Pro", action: () => goScreen("upgrade"),
          icon: <svg viewBox="0 0 24 24" fill="none" stroke="#c8960c" strokeWidth="1.8" strokeLinecap="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
        },
      ]
    },
  ];

  const activeId = screen === "ai" ? "rc" : screen === "steel" ? "steel" : screen;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxHeight: "100dvh", overflow: "hidden", background: "#0d1b2e" }}>
      {paymentOpen && <PaymentModal onClose={() => setPaymentOpen(false)} />}

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
              {/* Iso floor */}
              <line x1="20" y1="36" x2="8" y2="30" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeLinecap="round"/>
              <line x1="20" y1="36" x2="32" y2="30" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeLinecap="round"/>
              <line x1="20" y1="36" x2="20" y2="26" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2"/>
              {/* Columns */}
              <line x1="8" y1="30" x2="8" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="32" y1="30" x2="32" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              {/* Front beam */}
              <line x1="8" y1="12" x2="32" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              {/* Depth edges at top */}
              <line x1="8" y1="12" x2="20" y2="6" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="32" y1="12" x2="20" y2="6" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="20" y1="26" x2="20" y2="6" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 2"/>
              {/* BM diagram */}
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
              <circle cx="20" cy="6" r="2" fill="rgba(200,150,12,0.35)" stroke="#c8960c" strokeWidth="1"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-.3px", textShadow: "1px 1px 0 #9a7200, 2px 2px 0 #5e4300, 3px 3px 0 #1e1600, 4px 4px 7px rgba(0,0,0,.55)" }}>SSAD</div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 12, color: "rgba(200,150,12,.85)", fontStyle: "italic", marginTop: 1 }}>
              <em>Smart Structural Analysis &amp; Design</em>
            </div>
          </div>
        </div>

        {/* Right — active project + user pill + upgrade + sign out */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

          {/* Active Project picker */}
          <div ref={projMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setProjMenuOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: projectId ? "rgba(200,150,12,.18)" : "rgba(255,255,255,.07)",
                border: `1px solid ${projectId ? "rgba(200,150,12,.55)" : "rgba(255,255,255,.15)"}`,
                borderRadius: 8, padding: "6px 13px", cursor: "pointer",
                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700,
                color: projectId ? "#e0a820" : "rgba(255,255,255,.65)", letterSpacing: ".3px",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
              {projectId
                ? (projects.find(p => p.id === projectId)?.projectName ?? "Project")
                : "Active Project"}
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: projMenuOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {projMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 7px)", right: 0,
                background: "#0d2240", border: "1px solid rgba(200,150,12,.3)",
                borderRadius: 12, padding: "6px 0", minWidth: 240,
                boxShadow: "0 16px 48px rgba(0,0,0,.6)", zIndex: 300,
              }}>
                <div style={{ padding: "6px 14px 9px", fontFamily: "var(--mono)", fontSize: 9, color: "rgba(200,150,12,.7)", textTransform: "uppercase", letterSpacing: ".8px", borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 4 }}>
                  Save calculations to:
                </div>
                {/* None / Standalone */}
                <div
                  onClick={() => { setActiveProject(null); setProjMenuOpen(false); }}
                  style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 9,
                    fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
                    color: projectId === null ? "#c8960c" : "rgba(255,255,255,.65)",
                    background: projectId === null ? "rgba(200,150,12,.12)" : "transparent" }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>📋</span>
                  <span style={{ flex: 1 }}>Standalone (no project)</span>
                  {projectId === null && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c8960c" strokeWidth="2.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
                {/* Divider if projects exist */}
                {projects.length > 0 && (
                  <div style={{ margin: "4px 0", borderTop: "1px solid rgba(255,255,255,.07)" }} />
                )}
                {projects.length === 0 && (
                  <div style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 10, color: "rgba(255,255,255,.3)", fontStyle: "italic" }}>
                    No project folders — create one in Projects
                  </div>
                )}
                {projects.map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => { setActiveProject(proj.id); setProjMenuOpen(false); }}
                    style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 9,
                      fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
                      color: projectId === proj.id ? "#c8960c" : "rgba(255,255,255,.75)",
                      background: projectId === proj.id ? "rgba(200,150,12,.12)" : "transparent" }}
                  >
                    <span style={{ fontSize: 15, lineHeight: 1 }}>{projectId === proj.id ? "📂" : "📁"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{proj.projectName}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", marginTop: 1 }}>{proj.firmName}</div>
                    </div>
                    {projectId === proj.id && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c8960c" strokeWidth="2.8" strokeLinecap="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "6px 14px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "rgba(255,255,255,.8)", fontWeight: 600 }}>
                {user.fullName || user.email || "Guest"}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(200,150,12,.85)", background: "rgba(200,150,12,.15)", border: "1px solid rgba(200,150,12,.3)", borderRadius: 4, padding: "2px 6px", textTransform: "uppercase" }}>
                {user.tier}
              </span>
              {trialDaysLeft !== null && (
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700,
                  color: trialDaysLeft <= 5 ? "#ef4444" : trialDaysLeft <= 10 ? "#f97316" : "rgba(255,255,255,.5)",
                  background: trialDaysLeft <= 5 ? "rgba(239,68,68,.12)" : trialDaysLeft <= 10 ? "rgba(249,115,22,.12)" : "rgba(255,255,255,.06)",
                  border: `1px solid ${trialDaysLeft <= 5 ? "rgba(239,68,68,.35)" : trialDaysLeft <= 10 ? "rgba(249,115,22,.35)" : "rgba(255,255,255,.12)"}`,
                  borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap",
                }}>
                  {trialDaysLeft === 0 ? "Expires today" : `${trialDaysLeft}d left`}
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => setPaymentOpen(true)}
            style={{
              background: trialDaysLeft !== null && trialDaysLeft <= 5
                ? "linear-gradient(135deg,rgba(239,68,68,.3),rgba(239,68,68,.18))"
                : "linear-gradient(135deg,rgba(200,150,12,.25),rgba(224,168,32,.18))",
              border: `1px solid ${trialDaysLeft !== null && trialDaysLeft <= 5 ? "rgba(239,68,68,.6)" : "rgba(200,150,12,.55)"}`,
              borderRadius: 8, padding: "6px 14px", cursor: "pointer",
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700,
              color: trialDaysLeft !== null && trialDaysLeft <= 5 ? "#f87171" : "#e0a820",
              letterSpacing: ".4px",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" width="11" height="11">
              <polygon points="8,1 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6" fill="#e0a820"/>
            </svg>
            Upgrade to Pro
          </button>
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
                    borderLeft: `3px solid ${activeId === item.id ? "var(--gold)" : "transparent"}`,
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
