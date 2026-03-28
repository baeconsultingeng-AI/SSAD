"use client";

import { useState, useCallback, useEffect } from "react";
import type { ReactNode, CSSProperties } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  loadProjects, loadCalcs, saveProjects, saveCalcs, createProject as mkProject,
  type StoredProject, type StoredCalc, type ProjectInfo,
} from "@/lib/calc-storage";

// --- Helpers -----------------------------------------------------------------

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    );
  } catch { return iso; }
}

const vc  = (v: string) => v === "pass" ? "#15803d" : v === "warn" ? "#b45309" : "#b91c1c";
const vbg = (v: string) => v === "pass" ? "#f0fdf4" : v === "warn" ? "#fffbeb" : "#fff1f2";
const vbd = (v: string) => v === "pass" ? "#bbf7d0" : v === "warn" ? "#fde68a" : "#fecdd3";
const vi  = (v: string) => v === "pass" ? "✓ PASS" : v === "warn" ? "⚠ WARN" : "✗ FAIL";

// --- Main component ----------------------------------------------------------

export default function ProjectsScreen() {
  const { setCalcResult, setReportProjectInfo, goScreen } = useWorkspace();

  const [projects,      setProjects]      = useState<StoredProject[]>([]);
  const [calcs,         setCalcs]         = useState<StoredCalc[]>([]);
  const [expanded,      setExpanded]      = useState<Record<string, boolean>>({});
  const [projectsOpen,  setProjectsOpen]  = useState(true);
  const [standaloneOpen, setStandaloneOpen] = useState(true);
  const [showCreate,    setShowCreate]    = useState(false);
  const [newInfo,       setNewInfo]       = useState<ProjectInfo>({ firmName: "", projectName: "", refId: "", designEngineer: "", approvingEngineer: "" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setProjects(loadProjects());
    setCalcs(loadCalcs());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openCalc = useCallback((calc: StoredCalc) => {
    setCalcResult(calc.calcResult);
    setReportProjectInfo(calc.projectInfo ?? null);
    goScreen("report");
  }, [setCalcResult, setReportProjectInfo, goScreen]);

  const doCreate = useCallback(() => {
    if (!newInfo.firmName.trim() || !newInfo.projectName.trim() || !newInfo.designEngineer.trim()) return;
    mkProject(newInfo);
    setNewInfo({ firmName: "", projectName: "", refId: "", designEngineer: "", approvingEngineer: "" });
    setShowCreate(false);
    refresh();
  }, [newInfo, refresh]);

  const doDeleteProject = useCallback((projectId: string) => {
    saveProjects(loadProjects().filter(p => p.id !== projectId));
    saveCalcs(loadCalcs().filter(c => c.projectId !== projectId));
    setConfirmDelete(null);
    refresh();
  }, [refresh]);

  const doDeleteCalc = useCallback((calcId: string) => {
    saveCalcs(loadCalcs().filter(c => c.id !== calcId));
    refresh();
  }, [refresh]);

  const toggle = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const standalone = calcs
    .filter(c => c.projectId === null)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#eceae5", overflow: "hidden" }}>

      {/* Status bar */}
      <div className="sb">
        <span style={{ fontSize: 15, fontWeight: 700 }}>9:41</span>
        <span style={{ fontSize: 11 }}>●●● 🔋</span>
      </div>

      {/* Header */}
      <div style={{ background: "#1a4a8a", padding: "11px 15px 12px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 14px rgba(0,0,0,.3)" }}>
        <div>
          <div style={{ fontFamily: "var(--ser)", fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-.2px" }}>My Projects</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(200,150,12,.85)", marginTop: 2, letterSpacing: ".5px" }}>CALCULATION LIBRARY</div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(200,150,12,.2)", border: "1.5px solid rgba(200,150,12,.5)", color: "#fff", padding: "7px 13px", borderRadius: 10, fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Project
        </button>
      </div>

      {/* Scrollable body */}
      <div className="scr" style={{ background: "#eceae5" }}>
        <div style={{ padding: "14px 13px 32px" }}>

          {/* Project Folders section */}
          <div
            onClick={() => setProjectsOpen(o => !o)}
            style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, cursor: "pointer", userSelect: "none", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800, color: "#1a4a8a", textTransform: "uppercase", letterSpacing: ".7px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
            Project Folders
            <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 600, color: "var(--dim)" }}>
              {projects.length} folder{projects.length !== 1 ? "s" : ""}
            </span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a4a8a" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: projectsOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {projectsOpen && (projects.length === 0 ? (
            <EmptyMsg>No project folders yet. Tap «New Project» to create one, then save calculations to it.</EmptyMsg>
          ) : (
            <>
              {projects.map(proj => {
                const projCalcs = calcs
                  .filter(c => c.projectId === proj.id)
                  .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
                const isOpen = !!expanded[proj.id];
                return (
                  <div key={proj.id} style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: "1.5px solid #ddd8cf", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
                    <div
                      onClick={() => toggle(proj.id)}
                      role="button" tabIndex={0}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", userSelect: "none" }}
                    >
                      <span style={{ fontSize: 19, flexShrink: 0, lineHeight: 1 }}>{isOpen ? "📂" : "📁"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--ui)", fontSize: 14, fontWeight: 700, color: "#1a1410", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {proj.projectName}
                        </div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)", marginTop: 1 }}>
                          {proj.firmName} {proj.refId ? `· ${proj.refId}` : ""} · {projCalcs.length} calc{projCalcs.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDelete(proj.id); }}
                          style={{ padding: "5px 9px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 7, color: "#b91c1c", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, cursor: "pointer" }}
                        >
                          Delete
                        </button>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ background: "#faf9f7", borderTop: "1px solid #ede9e1" }}>
                        {projCalcs.length === 0 ? (
                          <div style={{ padding: "18px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", textAlign: "center" }}>
                            No calculations saved to this project yet.
                          </div>
                        ) : projCalcs.map((calc, idx) => (
                          <CalcRow
                            key={calc.id}
                            calc={calc}
                            isLast={idx === projCalcs.length - 1}
                            onOpen={() => openCalc(calc)}
                            onDelete={() => doDeleteCalc(calc.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}

          {/* Standalone Calculations section */}
          <div
            onClick={() => setStandaloneOpen(o => !o)}
            style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 20, marginBottom: 10, cursor: "pointer", userSelect: "none", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800, color: "#1a4a8a", textTransform: "uppercase", letterSpacing: ".7px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Standalone Calculations
            <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 600, color: "var(--dim)" }}>
              {standalone.length} calc{standalone.length !== 1 ? "s" : ""}
            </span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a4a8a" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: standaloneOpen ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {standaloneOpen && (standalone.length === 0 ? (
            <EmptyMsg>No standalone calculations yet. Save a calculation without selecting a project to see it here.</EmptyMsg>
          ) : (
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1.5px solid #ddd8cf", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
              {standalone.map((calc, idx) => (
                <CalcRow
                  key={calc.id}
                  calc={calc}
                  isLast={idx === standalone.length - 1}
                  onOpen={() => openCalc(calc)}
                  onDelete={() => doDeleteCalc(calc.id)}
                />
              ))}
            </div>
          ))}

        </div>
      </div>

      {/* Bottom nav */}
      <div className="bnav">
        <div className="bni" onClick={() => goScreen("workspace")} role="button" tabIndex={0}>
          <div className="bni-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg></div>
          <span>Home</span>
        </div>
        <div className="bni on">
          <div className="bni-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 7h18M3 12h18M3 17h18"/></svg></div>
          <span>Projects</span>
        </div>
        <div className="bni" onClick={() => goScreen("settings")} role="button" tabIndex={0}>
          <div className="bni-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></div>
          <span>Settings</span>
        </div>
      </div>

      {/* Create project modal */}
      {showCreate && (
        <ProjModal onClose={() => { setShowCreate(false); setNewInfo({ firmName: "", projectName: "", refId: "", designEngineer: "", approvingEngineer: "" }); }}>
          <div style={{ fontFamily: "var(--ser)", fontSize: 16, fontWeight: 700, color: "#1a1410", marginBottom: 14 }}>
            New Project Folder
          </div>
          {([
            ["firmName",          "Name of Firm",               "e.g. Bae Consulting Engineers"],
            ["projectName",       "Name of Project",            "e.g. Office Block Phase 2"],
            ["refId",             "Project Reference ID",       "e.g. BCe-2024-031"],
            ["designEngineer",    "Design Engineer",            "e.g. Eng. A. Osei"],
            ["approvingEngineer", "Approving Engineer",         "e.g. Dr. K. Mensah CEng"],
          ] as [keyof ProjectInfo, string, string][]).map(([key, label, placeholder]) => (
            <div key={key} style={{ marginBottom: 9 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</div>
              <input
                value={newInfo[key]}
                onChange={e => setNewInfo(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ width: "100%", padding: "9px 11px", border: "1.5px solid #ddd8cf", borderRadius: 8, fontFamily: "var(--ui)", fontSize: 13, color: "#1a1410", outline: "none", boxSizing: "border-box", background: "#fafaf9" }}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              onClick={() => { setShowCreate(false); setNewInfo({ firmName: "", projectName: "", refId: "", designEngineer: "", approvingEngineer: "" }); }}
              style={{ flex: 1, padding: "11px 0", border: "1.5px solid #ddd8cf", borderRadius: 9, background: "#f5f1eb", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--mut)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={doCreate}
              disabled={!newInfo.firmName.trim() || !newInfo.projectName.trim() || !newInfo.designEngineer.trim()}
              style={{ flex: 2, padding: "11px 0", border: "none", borderRadius: 9, background: (newInfo.firmName.trim() && newInfo.projectName.trim() && newInfo.designEngineer.trim()) ? "#1a4a8a" : "#d1cdc7", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "#fff", cursor: (newInfo.firmName.trim() && newInfo.projectName.trim() && newInfo.designEngineer.trim()) ? "pointer" : "not-allowed" }}
            >
              Create Folder
            </button>
          </div>
        </ProjModal>
      )}

      {/* Delete project confirmation modal */}
      {confirmDelete && (() => {
        const proj = projects.find(p => p.id === confirmDelete);
        const cnt  = calcs.filter(c => c.projectId === confirmDelete).length;
        return (
          <ProjModal onClose={() => setConfirmDelete(null)}>
            <div style={{ fontFamily: "var(--ser)", fontSize: 16, fontWeight: 700, color: "#b91c1c", marginBottom: 10 }}>
              Delete Project?
            </div>
            <p style={{ fontFamily: "var(--ui)", fontSize: 14, color: "var(--txt)", lineHeight: 1.6, margin: "0 0 16px" }}>
              Delete <strong>&quot;{proj?.projectName}&quot;</strong> and its{" "}
              <strong>{cnt} saved calculation{cnt !== 1 ? "s" : ""}</strong>?{" "}
              This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: "11px 0", border: "1.5px solid #ddd8cf", borderRadius: 9, background: "#f5f1eb", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--mut)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => doDeleteProject(confirmDelete)}
                style={{ flex: 2, padding: "11px 0", border: "none", borderRadius: 9, background: "#b91c1c", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}
              >
                Delete Project
              </button>
            </div>
          </ProjModal>
        );
      })()}

    </div>
  );
}

// --- Sub-components ----------------------------------------------------------

function SecLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800, color: "#1a4a8a", textTransform: "uppercase", letterSpacing: ".7px", ...style }}>
      <span style={{ display: "flex", alignItems: "center" }}>{children}</span>
    </div>
  );
}

function EmptyMsg({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: "18px 16px", background: "#fff", border: "1.5px dashed #d4cfc8", borderRadius: 10, fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", textAlign: "center", lineHeight: 1.6, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function CalcRow({ calc, isLast, onOpen, onDelete }: {
  calc: StoredCalc; isLast: boolean; onOpen: () => void; onDelete: () => void;
}) {
  const verdict = calc.verdict ?? "pass";
  return (
    <div style={{ padding: "10px 14px", borderBottom: isLast ? "none" : "1px solid #f0ece6", display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800, color: vc(verdict), background: vbg(verdict), border: `1px solid ${vbd(verdict)}`, padding: "3px 7px", borderRadius: 7, whiteSpace: "nowrap" }}>
          {vi(verdict)}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--ui)", fontSize: 13, fontWeight: 600, color: "#1a1410", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {calc.moduleLabel}
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)", marginTop: 2 }}>
          {fmtDate(calc.savedAt)} · {calc.utilization}% utilization
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <button
          onClick={onOpen}
          style={{ padding: "5px 10px", background: "#1a4a8a", border: "none", borderRadius: 7, color: "#fff", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, cursor: "pointer" }}
        >
          Open
        </button>
        <button
          onClick={onDelete}
          style={{ padding: "5px 9px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 7, color: "#b91c1c", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, cursor: "pointer" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ProjModal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,12,28,.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, padding: "24px 22px", width: "100%", maxWidth: 400, boxShadow: "0 28px 80px rgba(0,0,0,.45)", animation: "rptFadeIn .18s ease" }}
      >
        {children}
      </div>
    </div>
  );
}
