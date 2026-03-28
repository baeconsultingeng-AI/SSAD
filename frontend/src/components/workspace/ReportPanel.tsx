"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { CalcCheck, CalcStep } from "@/types/calc";
import {
  loadProjects, appendCalc, createProject as mkProject,
  type StoredProject, type ProjectInfo,
} from "@/lib/calc-storage";

// --- Constants ----------------------------------------------------------------

const MODULE_LABELS: Record<string, string> = {
  rc_beam_bs_v1:       "RC Beam Design � BS 8110",
  rc_slab_bs_v1:       "RC Slab Design � BS 8110",
  rc_column_bs_v1:     "RC Column Design � BS 8110",
  rc_foundation_bs_v1: "Pad Foundation Design � BS 8110",
  steel_beam_bs_v1:    "Steel Beam Design � BS 5950",
  steel_column_bs_v1:  "Steel Column Design � BS 5950",
  steel_truss_bs_v1:   "Steel Truss Design � BS 5950",
  steel_portal_bs_v1:  "Steel Portal Frame � BS 5950",
};

const MODULE_SHORT: Record<string, string> = {
  rc_beam_bs_v1:       "RC-Beam",
  rc_slab_bs_v1:       "RC-Slab",
  rc_column_bs_v1:     "RC-Column",
  rc_foundation_bs_v1: "Pad-Foundation",
  steel_beam_bs_v1:    "Steel-Beam",
  steel_column_bs_v1:  "Steel-Column",
  steel_truss_bs_v1:   "Steel-Truss",
  steel_portal_bs_v1:  "Steel-Portal",
};

// Friendly name for a raw key: "fcu_Nmm2" ? "fcu (N/mm�)"
function prettyKey(k: string): string {
  return k
    .replace(/_Nmm2$/,  " (N/mm�)")
    .replace(/_kNm2$/,  " (kN/m�)")
    .replace(/_kNm$/,   " (kN�m)")
    .replace(/_kN$/,    " (kN)")
    .replace(/_mm2$/,   " (mm�)")
    .replace(/_mm$/,    " (mm)")
    .replace(/_m$/,     " (m)")
    .replace(/_cm4$/,   " (cm4)")
    .replace(/_cm2$/,   " (cm�)")
    .replace(/_cm3$/,   " (cm�)")
    .replace(/_MPa$/,   " (MPa)")
    .replace(/_deg$/,   " (�)")
    .replace(/_/g,      " ");
}

function fmtVal(val: unknown): string {
  if (val === null || val === undefined) return "�";
  if (typeof val === "boolean")  return val ? "Yes" : "No";
  if (typeof val === "number")   return Number.isInteger(val) ? String(val) : val.toFixed(4);
  if (typeof val === "string")   return val;
  return JSON.stringify(val);
}

// --- Word / PDF HTML generator ------------------------------------------------

type RptSection = { title: string; content: Record<string, unknown> };

function buildWordHTML(p: {
  moduleLabel: string; module: string; code: string; version: string; today: string;
  verdict: string; util: number; summary: string;
  steps: CalcStep[]; checks: CalcCheck[]; sections: RptSection[]; warnings: string[];
}): string {
  const hdr  = p.module.startsWith("steel_") ? "#1a3a5c" : "#1a4a8a";
  const vc   = p.verdict === "pass" ? "#15803d" : p.verdict === "warn" ? "#b45309" : "#b91c1c";
  const vbg  = p.verdict === "pass" ? "#f0fdf4" : p.verdict === "warn" ? "#fffbeb" : "#fff1f2";
  const vbd  = p.verdict === "pass" ? "#bbf7d0" : p.verdict === "warn" ? "#fde68a" : "#fecdd3";
  const vi   = p.verdict === "pass" ? "PASS ?" : p.verdict === "warn" ? "WARN ?" : "FAIL ?";

  const stepRows = p.steps.map((s, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#fafafa"}">
      <td style="text-align:center;color:#aaa;font-size:9pt;padding:5px 8px;border-bottom:1px solid #eee;">${String(i + 1).padStart(2, "0")}</td>
      <td style="font-weight:600;padding:5px 8px;border-bottom:1px solid #eee;">${s.label}</td>
      <td style="font-family:Consolas,monospace;font-size:9pt;color:${hdr};padding:5px 8px;border-bottom:1px solid #eee;border-left:3px solid ${hdr};">${s.expression || "�"}</td>
      <td style="text-align:right;font-weight:700;padding:5px 8px;border-bottom:1px solid #eee;">${s.value != null ? (typeof s.value === "number" && !Number.isInteger(s.value) ? s.value.toFixed(4) : s.value) : "�"}${s.unit ? ` <span style="font-size:8pt;color:#999;">${s.unit}</span>` : ""}</td>
      <td style="font-size:8pt;color:#999;padding:5px 8px;border-bottom:1px solid #eee;">${s.clause ?? ""}</td>
    </tr>`).join("");

  const checkRows = p.checks.map((c, i) => {
    const cc = c.status === "pass" ? "#15803d" : c.status === "warn" ? "#b45309" : "#b91c1c";
    const ci = c.status === "pass" ? "? PASS" : c.status === "warn" ? "? WARN" : "? FAIL";
    const util = c.limit > 0 ? Math.round((c.value / c.limit) * 100) : 0;
    return `<tr style="background:${i % 2 === 0 ? "#fff" : "#fafafa"}">
      <td style="font-family:Consolas,monospace;font-size:9pt;color:${cc};font-weight:700;padding:5px 8px;border-bottom:1px solid #eee;">${ci}</td>
      <td style="font-weight:600;padding:5px 8px;border-bottom:1px solid #eee;">${c.label}</td>
      <td style="text-align:right;padding:5px 8px;border-bottom:1px solid #eee;">${c.value != null ? c.value.toFixed(4) : "�"}</td>
      <td style="text-align:right;padding:5px 8px;border-bottom:1px solid #eee;">${c.limit != null ? c.limit.toFixed(4) : "�"}</td>
      <td style="text-align:right;font-weight:700;color:${cc};padding:5px 8px;border-bottom:1px solid #eee;">${util}%</td>
      <td style="font-size:8pt;color:#999;padding:5px 8px;border-bottom:1px solid #eee;">${c.clause ?? ""}</td>
    </tr>`;
  }).join("");

  const sectHTML = p.sections.map((sec, i) => `
    <h3 style="color:${hdr};font-size:11pt;margin:18px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px;">${String.fromCharCode(65 + i)}. ${sec.title}</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10pt;">
      ${Object.entries(sec.content).map(([k, v]) => `
      <tr><td style="width:42%;padding:4px 8px;border:1px solid #eee;color:#666;">${k.replace(/_/g, " ")}</td>
          <td style="padding:4px 8px;border:1px solid #eee;font-family:Consolas,monospace;font-weight:600;">${v ?? "�"}</td>
      </tr>`).join("")}
    </table>`).join("");

  const warnHTML = p.warnings.length > 0 ? `
    <div style="background:#fffbeb;border:1.5px solid #fde68a;padding:10px 14px;margin:12px 0;border-radius:4px;">
      <strong style="color:#b45309;font-size:10pt;">? Design Warnings</strong>
      <ul style="margin:6px 0 0;padding-left:18px;">
        ${p.warnings.map(w => `<li style="font-size:9pt;color:#78350f;margin-bottom:3px;">${w}</li>`).join("")}
      </ul>
    </div>` : "";

  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Structural Calculation � ${p.moduleLabel}</title>
  <!--[if gte mso 9]><xml>
  <w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument>
  </xml><![endif]-->
  <style>
    body { font-family: Calibri, 'Segoe UI', sans-serif; font-size:11pt; margin:2cm; color:#1a1a1a; }
    h2 { font-size:12pt; color:${hdr}; border-bottom:2px solid ${hdr}; padding-bottom:5px; margin-top:24px; }
    table { border-collapse:collapse; width:100%; }
    th { background:${hdr}; color:#fff; padding:7px 10px; font-size:9pt; text-align:left; }
    .lhd { background:${hdr}; padding:14px 18px 12px; margin:-2cm -2cm 20px; }
    .lhd-co { font-size:18pt; font-weight:900; color:#e8c04a; letter-spacing:-.3px; }
    .lhd-sub { font-size:8pt; color:rgba(255,255,255,.75); letter-spacing:1px; margin-top:3px; }
    .lhd-title { font-size:12pt; font-weight:700; color:rgba(255,255,255,.9); font-style:italic; margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,.2); }
    .lhd-meta { font-size:8.5pt; color:rgba(255,255,255,.65); margin-top:5px; }
    .verdict { background:${vbg}; border:1.5px solid ${vbd}; border-radius:5px; padding:9px 12px; margin-bottom:18px; }
  </style>
</head>
<body>
  <div class="lhd">
    <div class="lhd-co">BAE CONSULTING ENGINEERS</div>
    <div class="lhd-sub">STRUCTURAL � CIVIL � GEOTECHNICAL</div>
    <div class="lhd-title">Structural Design Calculation � ${p.moduleLabel}</div>
    <div class="lhd-meta">Design Code: ${p.code} &nbsp;|&nbsp; Date: ${p.today} &nbsp;|&nbsp; SSAD v${p.version}</div>
  </div>

  <div class="verdict">
    <span style="font-family:Consolas,monospace;font-size:12pt;font-weight:700;color:${vc};">${vi}</span>
    <span style="margin-left:14px;font-size:10pt;color:#333;">${p.summary}</span>
    <span style="float:right;font-family:Consolas,monospace;font-weight:700;color:${vc};border:1.5px solid ${vbd};padding:2px 10px;border-radius:20px;">${p.util}%</span>
  </div>

  <h2>1. Calculation Steps (Handcalc)</h2>
  <table>
    <thead><tr>
      <th style="width:30px">#</th>
      <th>Description</th>
      <th>Formula / Expression</th>
      <th style="text-align:right;width:110px">Value</th>
      <th style="width:90px">Ref.</th>
    </tr></thead>
    <tbody>${stepRows}</tbody>
  </table>

  <h2>2. Code Compliance Checks</h2>
  <table>
    <thead><tr>
      <th style="width:80px">Status</th>
      <th>Check</th>
      <th style="text-align:right;width:100px">Calculated</th>
      <th style="text-align:right;width:100px">Limit</th>
      <th style="text-align:right;width:60px">Util.</th>
      <th style="width:90px">Ref.</th>
    </tr></thead>
    <tbody>${checkRows}</tbody>
  </table>

  <h2>3. Design Input Summary</h2>
  ${sectHTML}

  ${warnHTML}

  <p style="font-size:8pt;color:#aaa;border-top:1px solid #ddd;padding-top:10px;margin-top:24px;line-height:1.5;">
    <strong>IMPORTANT:</strong> Calculations independently computed by SSAD-v1.0 using Python handcalcs engine.
    Parameters extracted by AI (${p.moduleLabel}). This output <u>must</u> be reviewed, verified and
    certified by a Chartered Structural Engineer before use in construction.
    Bae Consulting Engineers accepts no liability for any uncertified outputs.
  </p>
</body>
</html>`;
}

// --- Main component -----------------------------------------------------------

export default function ReportPanel() {
  const { calcResult, goScreen, reportProjectInfo, setReportProjectInfo, designElementId, projectId } = useWorkspace();
  const [toast,          setToast]          = useState<string | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  if (!calcResult || !calcResult.reportPayload) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f1eb" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "#8a7d72" }}>No report available.</div>
      </div>
    );
  }

  const payload      = calcResult.reportPayload as Record<string, unknown>;
  const today        = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const isSteel      = calcResult.module.startsWith("steel_");
  const accent       = isSteel ? "#1a3a5c" : "#1a4a8a";
  const headerBg     = isSteel
    ? "linear-gradient(135deg,#0d2240 0%,#1a3a5c 50%,#1e4976 100%)"
    : "linear-gradient(135deg,#0f2d5a 0%,#1a4a8a 50%,#1e40af 100%)";

  const verdict       = calcResult.results.verdict;
  const verdictColor  = verdict === "pass" ? "#15803d" : verdict === "warn" ? "#b45309" : "#b91c1c";
  const verdictBg     = verdict === "pass" ? "#f0fdf4" : verdict === "warn" ? "#fffbeb" : "#fff1f2";
  const verdictBorder = verdict === "pass" ? "#bbf7d0" : verdict === "warn" ? "#fde68a" : "#fecdd3";
  const verdictIcon   = verdict === "pass" ? "? PASS" : verdict === "warn" ? "? WARN" : "? FAIL";
  const util          = Math.round(calcResult.results.utilization * 100);
  const moduleLabel   = MODULE_LABELS[calcResult.module] ?? calcResult.module.replace(/_/g, " ");
  const moduleShort   = MODULE_SHORT[calcResult.module]  ?? calcResult.module;
  const utilBarColor  = util >= 100 ? "#b91c1c" : util >= 85 ? "#b45309" : "#15803d";

  const sections = Array.isArray((payload as { sections?: unknown[] }).sections)
    ? (payload as { sections: RptSection[] }).sections
    : [];

  // -- Action handlers ------------------------------------------------------

  // Called from SaveDialog OR directly by handleSave
  const performSave = useCallback((destProjectId: string | null, info: ProjectInfo) => {
    setSaving(true);
    try {
      appendCalc({
        savedAt: new Date().toISOString(),
        module: calcResult.module,
        moduleLabel,
        projectId: destProjectId,
        projectInfo: info,
        verdict,
        utilization: util,
        calcResult,
      });
      const destName = destProjectId
        ? (loadProjects().find(p => p.id === destProjectId)?.projectName ?? "project")
        : "Standalone";
      setReportProjectInfo(info);
      setShowSaveDialog(false);
      showToast(`Saved to "${destName}" ✓`);
    } catch {
      showToast("Save failed — storage unavailable");
    } finally {
      setSaving(false);
    }
  }, [calcResult, moduleLabel, verdict, util, setReportProjectInfo, showToast]);

  // Save button handler — skips dialog when active project/mode already selected
  const handleSave = useCallback(() => {
    if (projectId !== null) {
      // Active project selected in nav bar — save immediately
      const proj = loadProjects().find(p => p.id === projectId);
      if (proj) {
        const info: ProjectInfo = {
          firmName: proj.firmName, projectName: proj.projectName,
          refId: proj.refId, designEngineer: proj.designEngineer,
          approvingEngineer: proj.approvingEngineer,
        };
        performSave(projectId, info);
      } else {
        // Project deleted since selection — fall back to dialog
        setShowSaveDialog(true);
      }
    } else {
      // Standalone mode — save directly, no panel needed
      performSave(null, EMPTY_INFO);
    }
  }, [projectId, performSave]);

  const handlePDF = useCallback(() => {
    showToast("Opening print / save as PDF�");
    setTimeout(() => window.print(), 250);
  }, [showToast]);

  const handleWord = useCallback(() => {
    const html = buildWordHTML({
      moduleLabel, module: calcResult.module,
      code: calcResult.code, version: calcResult.version,
      today, verdict, util,
      summary: calcResult.results.summary,
      steps: calcResult.steps,
      checks: calcResult.checks,
      sections,
      warnings: calcResult.warnings,
    });
    const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `BaeConsulting_${moduleShort}_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Word document downloaded ?");
  }, [calcResult, moduleLabel, moduleShort, today, verdict, util, sections, showToast]);


  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#eceae5", overflow: "hidden" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 64, left: "50%", transform: "translateX(-50%)",
          background: "#111827", color: "#fff", padding: "9px 20px",
          borderRadius: 22, fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
          zIndex: 9999, boxShadow: "0 4px 24px rgba(0,0,0,.35)",
          animation: "rptFadeIn .2s ease",
        }}>{toast}</div>
      )}

      {/* Save dialog (bottom sheet) */}
      {showSaveDialog && (
        <SaveDialog
          calcLabel={moduleLabel}
          onSave={performSave}
          onClose={() => setShowSaveDialog(false)}
        />
      )}

      {/* Status bar */}
      <div className="sb" style={{ background: accent, color: "#fff" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>9:41</span>
        <span style={{ fontSize: 11 }}>??? ??</span>
      </div>

      {/* Gradient header */}
      <div className="no-print" style={{ background: headerBg, padding: "11px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, boxShadow: "0 2px 14px rgba(0,0,0,.28)" }}>
        <button onClick={() => goScreen(isSteel ? "steel" : "ai")}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", color: "#fff", padding: "6px 11px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          � Back
        </button>
        <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <div style={{ fontFamily: "var(--ser)", fontSize: 14, fontWeight: 700, color: "#fff" }}>Calculation Report</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(200,150,12,.9)", marginTop: 1, letterSpacing: ".5px" }}>{moduleLabel}</div>
        </div>
        <button onClick={() => goScreen("detailing")}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(200,150,12,.18)", border: "1.5px solid rgba(200,150,12,.48)", color: "rgba(200,150,12,.95)", padding: "6px 10px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
            <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
          Detailing
        </button>
      </div>

      {/* Action bar */}
      <div className="no-print" style={{ background: "#fff", borderBottom: "1.5px solid #e8e2d9", padding: "10px 14px", display: "flex", gap: 9, flexShrink: 0 }}>
        <RptActionBtn
          icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>}
          label="Save" color="#334155" bg="#f1f5f9" border="#cbd5e1"
          onClick={handleSave} disabled={saving} />
        <RptActionBtn
          icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6M9 11h3"/></svg>}
          label="Export PDF" color="#b91c1c" bg="#fff1f2" border="#fca5a5"
          onClick={handlePDF} />
        <RptActionBtn
          icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="13" height="18" rx="2"/><path d="M8 7h5M8 11h5M8 15h3"/><path d="M16 8l4-1v13l-4-1"/></svg>}
          label="Export Word" color="#15803d" bg="#f0fdf4" border="#86efac"
          onClick={handleWord} />
      </div>

      {/* -- Scrollable document -- */}
      <div className="scr" style={{ background: "#ddd9d2" }}>
        <div style={{ margin: "14px 14px 32px", background: "#fff", border: "1px solid #d4cfc8", borderRadius: 14, overflow: "hidden", boxShadow: "0 6px 30px rgba(0,0,0,.12)" }}>

          {/* -- Letterhead -- */}
          <div className="rpt-lhd" style={{ background: headerBg }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, background: "rgba(255,255,255,.12)", border: "2px solid rgba(200,150,12,.45)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <line x1="5" y1="20" x2="5" y2="8" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity=".9"/>
                  <line x1="19" y1="20" x2="19" y2="8" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity=".9"/>
                  <line x1="5" y1="8" x2="19" y2="8" stroke="white" strokeWidth="1.9" strokeLinecap="round"/>
                  <line x1="5" y1="14" x2="19" y2="14" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity=".5"/>
                  <circle cx="5" cy="8" r="2.3" fill="white" opacity=".95"/>
                  <circle cx="19" cy="8" r="2.3" fill="white" opacity=".95"/>
                  <circle cx="5" cy="14" r="1.7" fill="white" opacity=".65"/>
                  <circle cx="19" cy="14" r="1.7" fill="white" opacity=".65"/>
                  <line x1="2" y1="22" x2="8" y2="22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".55"/>
                  <line x1="16" y1="22" x2="22" y2="22" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".55"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="rpt-co" style={{ fontSize: 18 }}>Bae Consulting Engineers</div>
                <div className="rpt-co-sub">STRUCTURAL � CIVIL � GEOTECHNICAL</div>
              </div>
            </div>
            <div className="rpt-title">Structural Design Calculation � {moduleLabel}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, gap: 8, flexWrap: "wrap" }}>
              <div className="rpt-meta-row" style={{ gap: 10 }}>
                <div className="rpt-meta-item">Design Code: {calcResult.code}</div>
                <div className="rpt-meta-item">Date: {today}</div>
              </div>
              <div className="rpt-meta-item">SSAD v{calcResult.version}</div>
            </div>
          </div>

          {/* -- � 1  Project Information -- */}
          <RptSection num={1} title="Project Information" accent={accent}>
            {reportProjectInfo ? (
              <>
                <KVRow label="Name of Firm"          value={reportProjectInfo.firmName} />
                <KVRow label="Project Name"          value={reportProjectInfo.projectName} />
                <KVRow label="Project Reference"     value={reportProjectInfo.refId} />
                <KVRow label="Design Engineer"       value={reportProjectInfo.designEngineer} />
                <KVRow label="Approving Engineer"    value={reportProjectInfo.approvingEngineer} />
              </>
            ) : (
              <KVRow label="Project Info" value="Save the calculation to populate firm and engineer details." highlight />
            )}
            {designElementId && <KVRow label="Element Reference" value={designElementId} />}
            <KVRow label="Element Type"  value={moduleLabel} />
            <KVRow label="Design Code"   value={calcResult.code} />
            <KVRow label="SSAD Version"  value={`v${calcResult.version}`} />
            <KVRow label="Date"          value={today} />
            <KVRow label="Certification" value="Requires Chartered Engineer Review" highlight />
          </RptSection>

          {/* -- � 2  Design Input -- */}
          <RptSection num={2} title="Design Input" accent={accent}>
            {sections.length === 0 ? (
              <p style={{ fontFamily: "var(--ui)", fontSize: 14, color: "var(--dim)", margin: 0, padding: "4px 0" }}>
                No input summary available.
              </p>
            ) : sections.map((sec, si) => (
              <div key={si} style={{ marginBottom: si < sections.length - 1 ? 14 : 0 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${accent}28` }}>
                  {String.fromCharCode(65 + si)}. {sec.title}
                </div>
                {Object.entries(sec.content).map(([k, v]) => (
                  <KVRow key={k} label={prettyKey(k)} value={fmtVal(v)} />
                ))}
              </div>
            ))}
          </RptSection>

          {/* -- � 3  Design Output -- */}
          <RptSection num={3} title="Design Output" accent={accent}>
            {/* Utilization gauge */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px" }}>Overall Utilization</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 800, color: utilBarColor }}>{util}% � {verdict.toUpperCase()}</span>
              </div>
              <div style={{ height: 10, background: "#e5e0d8", borderRadius: 6, overflow: "hidden", marginBottom: 5 }}>
                <div style={{ height: "100%", width: `${Math.min(util, 100)}%`, background: `linear-gradient(90deg,${utilBarColor}cc,${utilBarColor})`, borderRadius: 6 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {[0, 25, 50, 75, 100].map(t => (
                  <span key={t} style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>{t}%</span>
                ))}
              </div>
            </div>
            {/* Design summary */}
            <KVRow label="Overall Verdict"    value={verdictIcon} />
            <KVRow label="Governing Util."    value={`${util}%`} />
            <KVRow label="Design Summary"     value={calcResult.results.summary} />
            {/* Key result values from calc steps */}
            {calcResult.steps.slice(-4).map((s, i) => s.value != null && (
              <KVRow key={i} label={s.label} value={`${typeof s.value === "number" && !Number.isInteger(s.value) ? s.value.toFixed(4) : s.value}${s.unit ? ` ${s.unit}` : ""}`} />
            ))}
          </RptSection>

          {/* -- � 4  Design Checks -- */}
          <RptSection num={4} title="Design Checks" accent={accent}>
            {/* Summary strip */}
            {calcResult.checks.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {(() => {
                  const passN = calcResult.checks.filter(c => c.status === "pass").length;
                  const failN = calcResult.checks.filter(c => c.status === "fail").length;
                  const warnN = calcResult.checks.filter(c => c.status === "warn").length;
                  return <>
                    <StatusPill color="#15803d" bg="#f0fdf4" border="#bbf7d0">? {passN} Pass</StatusPill>
                    {warnN > 0 && <StatusPill color="#b45309" bg="#fffbeb" border="#fde68a">? {warnN} Warn</StatusPill>}
                    {failN > 0 && <StatusPill color="#b91c1c" bg="#fff1f2" border="#fecdd3">? {failN} Fail</StatusPill>}
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", alignSelf: "center", marginLeft: "auto" }}>{calcResult.checks.length} checks total</span>
                  </>;
                })()}
              </div>
            )}
            {calcResult.checks.length === 0 ? (
              <p style={{ fontFamily: "var(--ui)", fontSize: 14, color: "var(--dim)", margin: 0 }}>No checks available.</p>
            ) : calcResult.checks.map((check, i) => {
              const cc  = check.status === "pass" ? "#15803d" : check.status === "warn" ? "#b45309" : "#b91c1c";
              const cbg = check.status === "pass" ? "#f0fdf4" : check.status === "warn" ? "#fffbeb" : "#fff1f2";
              const cbd = check.status === "pass" ? "#bbf7d0" : check.status === "warn" ? "#fde68a" : "#fecdd3";
              const ci  = check.status === "pass" ? "?" : check.status === "warn" ? "?" : "?";
              const ut  = check.limit > 0 ? Math.round((check.value / check.limit) * 100) : 0;
              return (
                <div key={i} style={{ padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${cbd}`, background: cbg, marginBottom: 9 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 800, color: cc, flexShrink: 0, width: 22, textAlign: "center" }}>{ci}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--ui)", fontSize: 14, fontWeight: 600, color: "var(--txt)", lineHeight: 1.3 }}>{check.label}</div>
                      {check.clause && <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{check.clause}</div>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 800, color: "var(--txt)" }}>{check.value != null ? check.value.toFixed(3) : "�"}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)" }}>/ {check.limit != null ? check.limit.toFixed(3) : "�"}</div>
                    </div>
                  </div>
                  {check.limit > 0 && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: "rgba(0,0,0,.08)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(ut, 100)}%`, background: cc, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: cc, fontWeight: 700, flexShrink: 0 }}>{ut}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </RptSection>

          {/* -- � 5  Quantities -- */}
          <RptSection num={5} title="Quantities" accent={accent}>
            {(() => {
              // Extract quantity-like fields from detailingPayload and normalizedInputs
              const dp = (calcResult.detailingPayload ?? {}) as Record<string, unknown>;
              const ni = (calcResult.normalizedInputs ?? {}) as Record<string, Record<string, unknown>>;
              const rows: Array<{ k: string; v: unknown }> = [];

              // From detailingPayload � reinforcement / section quantities
              const rein = dp.reinforcement as Record<string, unknown> | undefined;
              if (rein) Object.entries(rein).forEach(([k, v]) => rows.push({ k, v }));

              const dims = dp.dimensions as Record<string, unknown> | undefined;
              if (dims) Object.entries(dims).forEach(([k, v]) => rows.push({ k, v }));

              const shear = dp.shear as Record<string, unknown> | undefined;
              if (shear) Object.entries(shear).forEach(([k, v]) => rows.push({ k, v }));

              const moment = dp.moment as Record<string, unknown> | undefined;
              if (moment) Object.entries(moment).forEach(([k, v]) => rows.push({ k, v }));

              // From normalizedInputs loads/geometry if no detailing
              if (rows.length === 0 && ni.loads) Object.entries(ni.loads).forEach(([k, v]) => rows.push({ k, v }));
              if (rows.length === 0 && ni.geometry) Object.entries(ni.geometry).forEach(([k, v]) => rows.push({ k, v }));

              if (rows.length === 0) return <p style={{ fontFamily: "var(--ui)", fontSize: 14, color: "var(--dim)", margin: 0 }}>Quantities not available for this module.</p>;

              return rows.map(({ k, v }) => (
                <KVRow key={k} label={prettyKey(k)} value={fmtVal(v)} />
              ));
            })()}
          </RptSection>

          {/* -- � 6  Detailing -- */}
          <RptSection num={6} title="Detailing" accent={accent}>
            {(() => {
              const dp = (calcResult.detailingPayload ?? {}) as Record<string, unknown>;
              const hasDP = Object.keys(dp).length > 0;
              if (!hasDP) return <p style={{ fontFamily: "var(--ui)", fontSize: 14, color: "var(--dim)", margin: 0 }}>Detailing data not available. View the Detailing screen for full rebar / connection drawings.</p>;

              const skip = new Set(["element", "reinforcement", "dimensions", "shear", "moment"]);
              const rows: Array<{ k: string; v: unknown }> = [];
              Object.entries(dp).forEach(([k, v]) => {
                if (skip.has(k)) return;
                if (typeof v === "object" && v !== null) {
                  Object.entries(v as Record<string, unknown>).forEach(([k2, v2]) => rows.push({ k: k2, v: v2 }));
                } else {
                  rows.push({ k, v });
                }
              });
              if (rows.length === 0) rows.push({ k: "element", v: dp.element });

              const el = dp.element as string | undefined;
              return <>
                {el && <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>{el.replace(/_/g, " ")}</div>}
                {rows.map(({ k, v }) => <KVRow key={k} label={prettyKey(k)} value={fmtVal(v)} />)}
                <div style={{ marginTop: 12, padding: "9px 12px", background: `${accent}0a`, border: `1px solid ${accent}28`, borderRadius: 7, fontFamily: "var(--ui)", fontSize: 13, color: accent, lineHeight: 1.5 }}>
                  For full detailing drawings (rebar schedule, bar bending diagrams, connection details) navigate to the <strong>Detailing</strong> screen.
                </div>
              </>;
            })()}
          </RptSection>

          {/* -- � 7  General Interpretation -- */}
          <RptSection num={7} title="General Interpretation" accent={accent}>
            <div style={{ fontFamily: "var(--ui)", fontSize: 14, color: "var(--txt)", lineHeight: 1.7, marginBottom: 12 }}>
              {calcResult.results.summary}
            </div>
            {calcResult.warnings.length > 0 && (
              <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 8, padding: "10px 13px", marginBottom: 12 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800, color: "#b45309", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".8px" }}>
                  ? Design Warnings ({calcResult.warnings.length})
                </div>
                {calcResult.warnings.map((w, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: i < calcResult.warnings.length - 1 ? 7 : 0 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "#b45309", flexShrink: 0, marginTop: 2 }}>?</span>
                    <span style={{ fontFamily: "var(--ui)", fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>{w}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Verdict interpretation */}
            <div style={{ background: verdictBg, border: `1.5px solid ${verdictBorder}`, borderRadius: 8, padding: "10px 13px" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 800, color: verdictColor, marginBottom: 5 }}>{verdictIcon}</div>
              <div style={{ fontFamily: "var(--ui)", fontSize: 14, color: "var(--txt)", lineHeight: 1.6 }}>
                {verdict === "pass"
                  ? `The element satisfies all code requirements at ${util}% utilization. The design is considered adequate under the applied loading. It is recommended that an engineer verify the applied inputs and review all sections prior to use in construction.`
                  : verdict === "warn"
                  ? `The element is marginal with a utilization of ${util}%. One or more checks returned a warning status. An engineer should review the flagged items and confirm suitability. Consider increasing section size or reducing loads.`
                  : `One or more code checks have FAILED. The element does not satisfy the code requirements at ${util}% utilization. Do not proceed to construction documentation without full engineer review and redesign.`}
              </div>
            </div>
          </RptSection>

          {/* -- � 8  Design Optimisation -- */}
          <RptSection num={8} title="Design Optimisation" accent={accent}>
            {(() => {
              // Derive optimisation hints from utilization and check results
              const hints: string[] = [];
              const failedChecks = calcResult.checks.filter(c => c.status === "fail");
              const warnChecks   = calcResult.checks.filter(c => c.status === "warn");
              const govUtil      = util;

              if (govUtil < 50) hints.push(`The governing utilization is ${govUtil}%, indicating significant over-design. Consider reducing the section size or reinforcement to achieve a utilization closer to 70�85% for material efficiency.`);
              else if (govUtil >= 85 && govUtil < 100) hints.push(`Utilization of ${govUtil}% is close to the limit. A modest increase in section depth or reinforcement area would provide additional safety margin if loads increase in future.`);
              else if (govUtil >= 100) hints.push(`The element is over-stressed at ${govUtil}% utilization. Increase the section dimensions, concrete/steel grade, or reduce the applied loading.`);

              if (failedChecks.length > 0) hints.push(`Failed checks: ${failedChecks.map(c => c.label).join(", ")}. Address these by reviewing the governing parameter for each check.`);
              if (warnChecks.length > 0) hints.push(`Warning checks: ${warnChecks.map(c => c.label).join(", ")}. Monitor these items carefully.`);

              const dp = (calcResult.detailingPayload ?? {}) as Record<string, unknown>;
              if (dp.element === "rc_beam" || dp.element === "rc_column" || dp.element === "rc_slab") {
                hints.push("For RC elements, increasing the effective depth (d) is typically more efficient than increasing width � a 10% increase in d reduces the required steel area by approximately 15�20%.");
              }
              if ((calcResult.module ?? "").startsWith("steel_")) {
                hints.push("For steel elements, consider a deeper but lighter Universal Beam/Column section. Reducing span or adding intermediate restraints can significantly reduce the required section class.");
              }
              if (hints.length === 0) hints.push("No specific optimisation recommendations. The design appears efficient. Maintain the current section and reinforcement, and confirm input loads are representative of the final design intent.");

              return hints.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: i < hints.length - 1 ? 11 : 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${accent}18`, border: `1.5px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 800, color: accent, flexShrink: 0, marginTop: 1 }}>
                    {i + 1}
                  </div>
                  <p style={{ margin: 0, fontFamily: "var(--ui)", fontSize: 14, color: "var(--txt)", lineHeight: 1.65 }}>{h}</p>
                </div>
              ));
            })()}
          </RptSection>

          {/* -- Detailed Calculation Steps (audit trail) -- */}
          <div style={{ borderTop: "3px solid #ede9e1" }}>
            <div style={{ padding: "14px 18px 10px", background: "#f5f3f0", borderBottom: "2px solid #e8e2d9", display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 900, color: accent }}>APPENDIX A</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: "var(--txt)" }}>� Detailed Calculation Audit Trail</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", marginLeft: "auto" }}>{calcResult.steps.length} steps � Python handcalcs</span>
            </div>
            <CalcStepsBlock steps={calcResult.steps} accent={accent} />
          </div>

          {/* -- Signature / disclaimer -- */}
          <div style={{ padding: "16px 18px", background: "#f8f7f5", borderTop: "2px solid #e8e2d9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "var(--ser)", fontSize: 17, color: accent, fontStyle: "italic", fontWeight: 700 }}>Bae Consulting Engineers</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", marginTop: 3 }}>For Chartered Engineer Certification</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 800, color: verdictColor, background: verdictBg, border: `1.5px solid ${verdictBorder}`, padding: "5px 14px", borderRadius: 20, display: "inline-block" }}>{verdictIcon} � {util}%</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)", marginTop: 5 }}>{today}</div>
              </div>
            </div>
            <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: "var(--dim)", lineHeight: 1.7, borderTop: "1px solid #e0dbd4", paddingTop: 10 }}>
              <strong>IMPORTANT:</strong> Calculations independently computed by SSAD-v1.0 using the Python <em>handcalcs</em> engine. Parameters extracted by AI ({moduleShort}). This output <u>must</u> be reviewed, verified, and certified by a Chartered Structural Engineer before any use in construction or as a basis for design decisions. Bae Consulting Engineers accepts no liability for uncertified outputs.
            </div>
          </div>

        </div>
        <div style={{ height: 14 }} />
      </div>

      {/* Bottom nav */}
      <div className="bnav no-print">
        <div className="bni" onClick={() => goScreen("workspace")} role="button" tabIndex={0}>
          <div className="bni-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg></div>
          <span>Home</span>
        </div>
        <div className="bni" onClick={() => goScreen("result")} role="button" tabIndex={0}>
          <div className="bni-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg></div>
          <span>Results</span>
        </div>
        <div className="bni on">
          <div className="bni-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/></svg></div>
          <span>Report</span>
        </div>
        <div className="bni" onClick={() => goScreen("projects")} role="button" tabIndex={0}>
          <div className="bni-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 7h18M3 12h18M3 17h18"/></svg></div>
          <span>Projects</span>
        </div>
      </div>
    </div>
  );
}

// --- Section wrapper ----------------------------------------------------------

function RptSection({ num, title, accent, children }: { num: number; title: string; accent: string; children: ReactNode }) {
  return (
    <div style={{ borderTop: `3px solid ${num === 1 ? "transparent" : "#ede9e1"}`, padding: "0 0" }}>
      {/* Section heading */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 18px 10px", background: "#f7f5f2", borderBottom: `1px solid ${accent}25` }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 900, color: "#fff" }}>{num}</span>
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: ".8px" }}>{title}</span>
      </div>
      {/* Section body */}
      <div style={{ padding: "13px 18px" }}>
        {children}
      </div>
    </div>
  );
}

// --- Key-value row ------------------------------------------------------------

function KVRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", borderBottom: "1px solid rgba(0,0,0,.045)" }}>
      <span style={{ fontFamily: "var(--ui)", fontSize: 14, color: "var(--mut)", flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: highlight ? "#b45309" : "var(--txt)", textAlign: "right" }}>{value}</span>
    </div>
  );
}

// --- Status pill --------------------------------------------------------------

function StatusPill({ children, color, bg, border }: { children: ReactNode; color: string; bg: string; border: string }) {
  return (
    <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 800, color, background: bg, border: `1.5px solid ${border}`, padding: "4px 11px", borderRadius: 10 }}>
      {children}
    </span>
  );
}



// --- Appendix A � Calculation steps block ------------------------------------

function CalcStepsBlock({ steps, accent }: { steps: CalcStep[]; accent: string }) {
  if (steps.length === 0) {
    return (
      <div style={{ padding: "28px 18px", textAlign: "center", fontFamily: "var(--mono)", fontSize: 14, color: "var(--dim)" }}>
        No calculation steps recorded.
      </div>
    );
  }

  const fBg  = `${accent}0d`;
  const fBdr = `${accent}38`;

  return (
    <div style={{ padding: "10px 16px 16px" }}>
      {steps.map((step, i) => (
        <div key={i} style={{ border: `1px solid ${fBdr}`, borderRadius: 9, overflow: "hidden", boxShadow: "0 1px 5px rgba(0,0,0,.05)", marginBottom: 10 }}>
          {/* Step header */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 13px", background: `linear-gradient(90deg,${accent}18,${accent}06)`, borderBottom: `1px solid ${fBdr}` }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <span style={{ fontFamily: "var(--ui)", fontSize: 14, fontWeight: 700, color: accent, flex: 1 }}>{step.label}</span>
            {step.clause && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#fff", background: accent, padding: "2px 8px", borderRadius: 10, flexShrink: 0 }}>{step.clause}</span>
            )}
          </div>

          {/* Formula */}
          {step.expression && (
            <div style={{ padding: "8px 13px", background: fBg, borderBottom: `1px solid ${fBdr}` }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 5 }}>Formula / Substitution:</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: accent, background: "rgba(255,255,255,.7)", border: `1px solid ${fBdr}`, borderLeft: `4px solid ${accent}`, padding: "7px 11px", borderRadius: 5, lineHeight: 1.7, wordBreak: "break-word" }}>
                = &nbsp;{step.expression}
              </div>
            </div>
          )}

          {/* Result */}
          <div style={{ padding: "8px 13px", background: `${accent}07`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".7px" }}>Result:</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              {step.value != null ? (
                <>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 900, color: "var(--txt)" }}>
                    {typeof step.value === "number" && !Number.isInteger(step.value) ? step.value.toFixed(4) : step.value}
                  </span>
                  {step.unit && <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: accent, fontWeight: 700 }}>{step.unit}</span>}
                </>
              ) : <span style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--dim)" }}>�</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


// --- Save dialog (bottom sheet) ---------------------------------------------

const EMPTY_INFO: ProjectInfo = { firmName: "", projectName: "", refId: "", designEngineer: "", approvingEngineer: "" };

function InfoForm({ form, onChange }: {
  form: ProjectInfo;
  onChange: (f: ProjectInfo) => void;
}) {
  const field = (key: keyof ProjectInfo, label: string, placeholder: string) => (
    <div key={key} style={{ marginBottom: 9 }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</div>
      <input
        value={form[key]}
        onChange={e => onChange({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        style={{ width: "100%", padding: "9px 11px", border: "1.5px solid #ddd8cf", borderRadius: 8, fontFamily: "var(--ui)", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff", color: "#1a1410" }}
      />
    </div>
  );
  return (
    <>
      {field("firmName",          "Name of Firm",              "e.g. Bae Consulting Engineers")}
      {field("projectName",       "Name of Project",           "e.g. Office Block Phase 2")}
      {field("refId",             "Project Reference ID",      "e.g. BCe-2024-031")}
      {field("designEngineer",    "Name of Design Engineer",   "e.g. Eng. A. Osei")}
      {field("approvingEngineer", "Name of Approving Engineer","e.g. Dr. K. Mensah CEng")}
    </>
  );
}

function SaveDialog({ calcLabel, onSave, onClose }: {
  calcLabel: string;
  onSave: (projectId: string | null, info: ProjectInfo) => void;
  onClose: () => void;
}) {
  const [projects,  setProjects]  = useState<StoredProject[]>([]);
  const [step,      setStep]      = useState<"choose" | "standalone-form" | "create-form">("choose");
  const [form,      setForm]      = useState<ProjectInfo>(EMPTY_INFO);

  useEffect(() => { setProjects(loadProjects()); }, []);

  const isValid = form.firmName.trim() && form.projectName.trim() && form.designEngineer.trim();

  const handleExisting = (proj: StoredProject) => {
    const info: ProjectInfo = {
      firmName: proj.firmName, projectName: proj.projectName,
      refId: proj.refId, designEngineer: proj.designEngineer,
      approvingEngineer: proj.approvingEngineer,
    };
    onSave(proj.id, info);
  };

  const handleStandaloneSubmit = () => {
    if (!isValid) return;
    onSave(null, form);
  };

  const handleCreateProject = () => {
    if (!isValid) return;
    const proj = mkProject(form);
    onSave(proj.id, form);
  };

  const btnPrimary = (disabled: boolean) => ({
    flex: 2, padding: "10px 0", border: "none", borderRadius: 8,
    background: disabled ? "#d1cdc7" : "#1a4a8a",
    fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
  } as const);

  const btnSecondary = {
    flex: 1, padding: "10px 0", border: "1.5px solid #ddd8cf", borderRadius: 8,
    background: "#fff", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700,
    color: "var(--mut)", cursor: "pointer",
  } as const;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,12,28,.65)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: "18px 18px 0 0", padding: "18px 18px 32px", boxShadow: "0 -8px 40px rgba(0,0,0,.25)", maxHeight: "88dvh", overflowY: "auto" }}
      >
        {/* Handle */}
        <div style={{ width: 38, height: 4, background: "#ddd8cf", borderRadius: 2, margin: "0 auto 16px" }} />

        {/* Back button when in sub-step */}
        {step !== "choose" && (
          <button onClick={() => { setStep("choose"); setForm(EMPTY_INFO); }}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", padding: "0 0 10px", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "#1a4a8a" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
        )}

        <div style={{ fontFamily: "var(--ser)", fontSize: 16, fontWeight: 700, color: "#1a1410", marginBottom: 3 }}>Save Calculation</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)", marginBottom: 16 }}>{calcLabel}</div>

        {/* ── Step: choose destination ── */}
        {step === "choose" && (
          <>
            {/* Standalone option */}
            <SaveOption onClick={() => setStep("standalone-form")}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>📄</span>
              <div>
                <div style={{ fontFamily: "var(--ui)", fontSize: 13, fontWeight: 700, color: "#1a1410" }}>Standalone Folder</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>Not linked to any project</div>
              </div>
            </SaveOption>

            {/* Existing projects */}
            {projects.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 10px" }}>
                  <div style={{ flex: 1, height: 1, background: "#ede9e1" }} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".7px" }}>save to a project</span>
                  <div style={{ flex: 1, height: 1, background: "#ede9e1" }} />
                </div>
                {projects.map(proj => (
                  <SaveOption key={proj.id} onClick={() => handleExisting(proj)}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📁</span>
                    <div>
                      <div style={{ fontFamily: "var(--ui)", fontSize: 13, fontWeight: 700, color: "#1a1410" }}>{proj.projectName}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>{proj.firmName} · {proj.refId || "No ref"}</div>
                    </div>
                  </SaveOption>
                ))}
              </>
            )}

            {/* Create new project */}
            <button
              onClick={() => setStep("create-form")}
              style={{ width: "100%", padding: "11px 14px", border: "1.5px dashed #a8b4c8", borderRadius: 10, background: "transparent", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 8 }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>➕</span>
              <span style={{ fontFamily: "var(--ui)", fontSize: 13, fontWeight: 600, color: "#1a4a8a" }}>Create New Project &amp; Save</span>
            </button>

            <button
              onClick={onClose}
              style={{ width: "100%", padding: "11px", border: "1.5px solid #ddd8cf", borderRadius: 10, background: "transparent", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--mut)", cursor: "pointer", marginTop: 10 }}
            >
              Cancel
            </button>
          </>
        )}

        {/* ── Step: standalone project info form ── */}
        {step === "standalone-form" && (
          <>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 800, color: "#1a4a8a", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 12 }}>Project Information</div>
            <InfoForm form={form} onChange={setForm} />
            <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
              <button onClick={() => { setStep("choose"); setForm(EMPTY_INFO); }} style={btnSecondary}>Cancel</button>
              <button onClick={handleStandaloneSubmit} disabled={!isValid} style={btnPrimary(!isValid)}>
                Save to Standalone
              </button>
            </div>
          </>
        )}

        {/* ── Step: create new project form ── */}
        {step === "create-form" && (
          <>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 800, color: "#1a4a8a", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 12 }}>New Project Details</div>
            <InfoForm form={form} onChange={setForm} />
            <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
              <button onClick={() => { setStep("choose"); setForm(EMPTY_INFO); }} style={btnSecondary}>Cancel</button>
              <button onClick={handleCreateProject} disabled={!isValid} style={btnPrimary(!isValid)}>
                Create &amp; Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SaveOption({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #ddd8cf", borderRadius: 10, background: "#faf9f7", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 7, textAlign: "left" }}
    >
      {children}
    </button>
  );
}

// --- Action button ------------------------------------------------------------

function RptActionBtn({ icon, label, color, bg, border, onClick, disabled }: {
  icon: ReactNode; label: string; color: string; bg: string; border: string;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 7, padding: "12px 10px", borderRadius: 10, border: `2px solid ${border}`,
        background: bg, color, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1,
        transition: "opacity .12s", boxShadow: "0 1px 4px rgba(0,0,0,.07)",
      }}>
      {icon}{label}
    </button>
  );
}