"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { CalcCheck, CalcResponse, CalcStep } from "@/types/calc";
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

// ── Parameter metadata: full name, notation, unit ──────────────────────────
const PARAM_META: Record<string, { name: string; notation: string; unit: string }> = {
  width_b:                      { name: "Section Width",                  notation: "b",          unit: "mm" },
  overall_depth_h:              { name: "Overall Depth",                  notation: "h",          unit: "mm" },
  effective_depth_d:            { name: "Effective Depth",                notation: "d",          unit: "mm" },
  span:                         { name: "Span",                           notation: "L",          unit: "m" },
  span_m:                       { name: "Span",                           notation: "L",          unit: "m" },
  support_type:                 { name: "Support Condition",              notation: "\u2014",      unit: "" },
  cover:                        { name: "Nominal Cover",                  notation: "c",          unit: "mm" },
  cover_mm:                     { name: "Nominal Cover",                  notation: "c",          unit: "mm" },
  b_mm:                         { name: "Section Width",                  notation: "b",          unit: "mm" },
  h_mm:                         { name: "Overall Depth",                  notation: "h",          unit: "mm" },
  d_mm:                         { name: "Effective Depth",                notation: "d",          unit: "mm" },
  thickness_h:                  { name: "Slab Thickness",                 notation: "h",          unit: "mm" },
  concrete_grade_fcu:           { name: "Concrete Characteristic Strength",notation: "f\u2090\u1D64","unit": "N/mm\u00B2" },
  steel_grade_fy:               { name: "Steel Yield Strength",           notation: "fy",         unit: "N/mm\u00B2" },
  fcu_Nmm2:                     { name: "Concrete Characteristic Strength",notation: "f\u2090\u1D64","unit": "N/mm\u00B2" },
  fy_Nmm2:                      { name: "Steel Yield Strength",           notation: "fy",         unit: "N/mm\u00B2" },
  gk:                           { name: "Characteristic Dead Load",       notation: "Gk",         unit: "kN/m" },
  qk:                           { name: "Characteristic Live Load",       notation: "Qk",         unit: "kN/m" },
  w:                            { name: "Design Ultimate UDL",            notation: "w\u1D64",    unit: "kN/m" },
  M:                            { name: "Design Bending Moment",          notation: "M",          unit: "kN\u00B7m" },
  V:                            { name: "Design Shear Force",             notation: "V",          unit: "kN" },
  dead_load_gk:                 { name: "Characteristic Dead Load",       notation: "Gk",         unit: "kN/m" },
  live_load_qk:                 { name: "Characteristic Live Load",       notation: "Qk",         unit: "kN/m" },
  ultimate_UDL_w:               { name: "Design Ultimate UDL",            notation: "w\u1D64",    unit: "kN/m" },
  gk_kNm:                       { name: "Characteristic Dead Load",       notation: "Gk",         unit: "kN/m" },
  qk_kNm:                       { name: "Characteristic Live Load",       notation: "Qk",         unit: "kN/m" },
  ultimate_w_kNm:               { name: "Design Ultimate UDL",            notation: "w\u1D64",    unit: "kN/m" },
  design_moment_M:              { name: "Design Bending Moment",          notation: "M",          unit: "kN\u00B7m" },
  design_shear_V:               { name: "Design Shear Force",             notation: "V",          unit: "kN" },
  K:                            { name: "Moment Capacity Factor",         notation: "K",          unit: "" },
  K_prime:                      { name: "Limiting Redistribution Factor", notation: "K\u2032",    unit: "" },
  lever_arm_z:                  { name: "Lever Arm",                      notation: "z",          unit: "mm" },
  As_required:                  { name: "Steel Area Required",            notation: "As,req",     unit: "mm\u00B2" },
  As_minimum:                   { name: "Minimum Steel Area",             notation: "As,min",     unit: "mm\u00B2" },
  As_design:                    { name: "Steel Area Provided",            notation: "As,prov",    unit: "mm\u00B2" },
  as_design_mm2:                { name: "Steel Area Provided",            notation: "As,prov",    unit: "mm\u00B2" },
  design_shear_stress_v:        { name: "Design Shear Stress",            notation: "v",          unit: "N/mm\u00B2" },
  max_shear_stress_v_max:       { name: "Maximum Allowable Shear Stress", notation: "v\u2098\u2090\u02E3","unit": "N/mm\u00B2" },
  concrete_shear_resistance_vc: { name: "Concrete Shear Capacity",        notation: "vc",         unit: "N/mm\u00B2" },
  links_required:               { name: "Shear Reinforcement Required",   notation: "\u2014",     unit: "" },
  recommendation:               { name: "Design Recommendation",          notation: "\u2014",     unit: "" },
  v_Nmm2:                       { name: "Design Shear Stress",            notation: "v",          unit: "N/mm\u00B2" },
  vc_Nmm2:                      { name: "Concrete Shear Capacity",        notation: "vc",         unit: "N/mm\u00B2" },
  link_note:                    { name: "Shear Link Note",                notation: "\u2014",     unit: "" },
  basic_span_depth_ratio:       { name: "Basic Span/Depth Ratio",         notation: "L/d (basic)","unit": "" },
  modification_factor_MF:       { name: "Modification Factor",            notation: "MF",         unit: "" },
  allowable_l_d:                { name: "Allowable Span/Depth Ratio",     notation: "L/d (allow)","unit": "" },
  actual_l_d:                   { name: "Actual Span/Depth Ratio",        notation: "L/d (actual)","unit": "" },
  status:                       { name: "Check Status",                   notation: "\u2014",     unit: "" },
  section:                      { name: "Steel Section Designation",      notation: "\u2014",     unit: "" },
  section_class:                { name: "Section Classification",         notation: "\u2014",     unit: "" },
  Ix_cm4:                       { name: "Second Moment of Area (Major)",  notation: "Ix",         unit: "cm\u2074" },
  Sx_cm3:                       { name: "Plastic Section Modulus",        notation: "Sx",         unit: "cm\u00B3" },
  Zx_cm3:                       { name: "Elastic Section Modulus",        notation: "Zx",         unit: "cm\u00B3" },
};

// Keys that belong in Analysis section (extracted from Loading)
const ANALYSIS_KEYS = new Set(["design_moment_M","design_shear_V",
  "design_shear_stress_v","max_shear_stress_v_max","concrete_shear_resistance_vc",
  "links_required","recommendation","link_note",
  "basic_span_depth_ratio","modification_factor_MF","allowable_l_d","actual_l_d","status"]);

// Keys that belong in Design Output section
const DESIGN_OUTPUT_KEYS = new Set(["K","K_prime","lever_arm_z",
  "As_required","As_minimum","As_design","as_design_mm2"]);

function paramLabel(k: string): string {
  const m = PARAM_META[k];
  if (m) {
    let label = m.name;
    if (m.notation && m.notation !== "\u2014") label += ` (${m.notation})`;
    if (m.unit) label += ` [${m.unit}]`;
    return label;
  }
  return k
    .replace(/_Nmm2$/, " (N/mm\u00B2)")
    .replace(/_kNm2$/, " (kN/m\u00B2)")
    .replace(/_kNm$/,  " (kN\u00B7m)")
    .replace(/_kN$/,   " (kN)")
    .replace(/_mm2$/,  " (mm\u00B2)")
    .replace(/_mm$/,   " (mm)")
    .replace(/_m$/,    " (m)")
    .replace(/_cm4$/,  " (cm\u2074)")
    .replace(/_cm2$/,  " (cm\u00B2)")
    .replace(/_cm3$/,  " (cm\u00B3)")
    .replace(/_MPa$/,  " (MPa)")
    .replace(/_deg$/,  " (\u00B0)")
    .replace(/_/g,     " ");
}

function prettyKey(k: string): string { return paramLabel(k); }

function fmtVal(val: unknown): string {
  if (val === null || val === undefined) return "\u2014";
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
      // Standalone mode — show dialog to collect project information first
      setShowSaveDialog(true);
    }
  }, [projectId, performSave]);

  const handlePDF = useCallback(() => {
    const rptEl = document.getElementById("rpt-document");
    if (!rptEl) { window.print(); return; }
    const styleSheets = Array.from(document.styleSheets)
      .map(ss => { try { return Array.from(ss.cssRules).map((r: CSSRule) => r.cssText).join("\n"); } catch { return ""; } })
      .join("\n");
    const w = window.open("", "_blank");
    if (!w) { window.print(); return; }
    w.document.write(
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Structural Calculation Report</title>" +
      "<style>" + styleSheets + "\n@media print{body{margin:0;}}</style></head>" +
      "<body>" + rptEl.outerHTML + "</body></html>"
    );
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 600);
    showToast("Print dialog opened \u2014 save as PDF from your browser");
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
        <div id="rpt-document" style={{ margin: "14px 14px 32px", background: "#fff", border: "1px solid #d4cfc8", borderRadius: 14, overflow: "hidden", boxShadow: "0 6px 30px rgba(0,0,0,.12)" }}>

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
          {/* -- § 2  Design Input -- */}
          <RptSection num={2} title="Design Input" accent={accent}>
            {(() => {
              // Filter out "Project Details" — already shown in §1
              const inputSections = sections.filter(s =>
                  !["Project Details","Bending Design","Shear Design","Deflection Check"].includes(s.title)
                );
              // For Loading section, filter out Analysis-category keys
              if (inputSections.length === 0) return (
                <p style={{ fontFamily: "var(--ui)", fontSize: 17, color: "var(--dim)", margin: 0 }}>No input summary available.</p>
              );
              let si = 0;
              return inputSections.map((sec) => {
                const inputEntries = Object.entries(sec.content).filter(([k]) =>
                  sec.title === "Loading" ? !ANALYSIS_KEYS.has(k) && !DESIGN_OUTPUT_KEYS.has(k) : !DESIGN_OUTPUT_KEYS.has(k)
                );
                if (inputEntries.length === 0) return null;
                const idx = si++;
                return (
                  <div key={sec.title} style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10, paddingBottom: 5, borderBottom: `2px solid ${accent}28` }}>
                      {String.fromCharCode(65 + idx)}. {sec.title}
                    </div>
                    {inputEntries.map(([k, v]) => (
                      <KVRow key={k} label={paramLabel(k)} value={fmtVal(v)} />
                    ))}
                  </div>
                );
              });
            })()}
          </RptSection>

          {/* -- § 3  Analysis -- */}
          <RptSection num={3} title="Analysis" accent={accent}>
            {(() => {
              // Pull analysis values from Loading + Shear + Deflection sections
              const analysisRows: Array<[string, unknown]> = [];
              sections.forEach(sec => {
                Object.entries(sec.content).forEach(([k, v]) => {
                  if (ANALYSIS_KEYS.has(k)) analysisRows.push([k, v]);
                });
              });
              if (analysisRows.length === 0) return (
                <p style={{ fontFamily: "var(--ui)", fontSize: 17, color: "var(--dim)", margin: 0 }}>Analysis values not available.</p>
              );
              // Group: forces first, then checks
              const forceKeys   = ["design_moment_M","design_shear_V"];
              const stressKeys  = ["design_shear_stress_v","max_shear_stress_v_max","concrete_shear_resistance_vc"];
              const deflKeys    = ["basic_span_depth_ratio","modification_factor_MF","allowable_l_d","actual_l_d"];
              const groups = [
                { title: "Design Forces",         keys: forceKeys },
                { title: "Shear Verification",    keys: stressKeys },
                { title: "Deflection Check",      keys: deflKeys },
              ];
              const rowMap = Object.fromEntries(analysisRows);
              return groups.map(g => {
                const gRows = g.keys.filter(k => k in rowMap);
                if (gRows.length === 0) return null;
                return (
                  <div key={g.title} style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${accent}22` }}>{g.title}</div>
                    {gRows.map(k => <KVRow key={k} label={paramLabel(k)} value={fmtVal(rowMap[k])} />)}
                    {/* Remaining analysis keys not in explicit groups */}
                  </div>
                );
              });
            })()}
          </RptSection>

          {/* -- § 4  Design Output -- */}
          <RptSection num={4} title="Design Output" accent={accent}>
            {/* Utilization bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 17, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px" }}>Overall Utilisation</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 800, color: utilBarColor }}>{util}% — {verdict.toUpperCase()}</span>
              </div>
              <div style={{ height: 12, background: "#e5e0d8", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ height: "100%", width: `${Math.min(util, 100)}%`, background: `linear-gradient(90deg,${utilBarColor}cc,${utilBarColor})`, borderRadius: 6 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {[0, 25, 50, 75, 100].map(t => (
                  <span key={t} style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)" }}>{t}%</span>
                ))}
              </div>
            </div>
            {/* Verdict */}
            <KVRow label="Overall Verdict"    value={verdictIcon} />
            <KVRow label="Governing Util."    value={`${util}%`} />
            <div style={{ height: 12 }} />
            {/* Reinforcement / section output from backend sections */}
            {(() => {
              const outRows: Array<[string, unknown]> = [];
              sections.forEach(sec => {
                if (["Bending Design","Shear Design","Section Design","Steel Section","Connection Design"].includes(sec.title)) {
                  Object.entries(sec.content).forEach(([k, v]) => outRows.push([k, v]));
                }
              });
              if (outRows.length === 0) {
                // Fallback: show last 5 calc steps
                return calcResult.steps.slice(-5).map((s, i) => s.value != null ? (
                  <KVRow key={i} label={s.label} value={`${typeof s.value === "number" && !Number.isInteger(s.value) ? s.value.toFixed(4) : s.value}${s.unit ? ` ${s.unit}` : ""}`} />
                ) : null);
              }
              return outRows.map(([k, v]) => <KVRow key={k} label={paramLabel(k)} value={fmtVal(v)} />);
            })()}
            <div style={{ height: 12 }} />
            <KVRow label="Design Summary" value={calcResult.results.summary} />
          </RptSection>

          {/* -- � 4  Design Checks -- */}
          <RptSection num={5} title="Design Checks" accent={accent}>
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
                      <div style={{ fontFamily: "var(--ui)", fontSize: 17, fontWeight: 600, color: "var(--txt)", lineHeight: 1.3 }}>{check.label}</div>
                      {check.clause && <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{check.clause}</div>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 800, color: "var(--txt)" }}>{check.value != null ? check.value.toFixed(3) : "�"}</div>
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

                    {/* -- § 6  Quantities -- */}
          <RptSection num={6} title="Quantities" accent={accent}>
            {(() => {
              const dp = (calcResult.detailingPayload ?? {}) as Record<string, unknown>;
              const ni = (calcResult.normalizedInputs ?? {}) as Record<string, Record<string, unknown>>;
              const dims = (dp.dimensions ?? {}) as Record<string, unknown>;
              const rein = (dp.reinforcement ?? {}) as Record<string, unknown>;
              const isRC    = (calcResult.module ?? "").startsWith("rc_");
              const isStl   = (calcResult.module ?? "").startsWith("steel_");

              // ── concrete volume ────────────────────────────────────────
              let concreteVol: number | null = null;
              const b = parseFloat(String(dims.b_mm ?? ni.geometry?.b_mm ?? ""));
              const h = parseFloat(String(dims.h_mm ?? ni.geometry?.h_mm ?? ""));
              const span = parseFloat(String(dims.span_m ?? ni.geometry?.span_m ?? ""));
              if (isRC && !isNaN(b) && !isNaN(h) && !isNaN(span)) {
                concreteVol = (b / 1000) * (h / 1000) * span;
              }
              const thk = parseFloat(String(dims.thickness_mm ?? ni.geometry?.thickness_mm ?? ""));
              const lx  = parseFloat(String(ni.geometry?.lx_m ?? ""));
              const ly  = parseFloat(String(ni.geometry?.ly_m ?? ""));
              if (isRC && !isNaN(thk) && !isNaN(lx) && !isNaN(ly) && concreteVol === null) {
                concreteVol = (thk / 1000) * lx * ly;
              }

              // ── steel weight ───────────────────────────────────────────
              let steelKg: number | null = null;
              const asD = parseFloat(String(rein.as_design_mm2 ?? ""));
              if (isRC && !isNaN(asD) && !isNaN(span)) {
                // Approximate: As × L × density (7850 kg/m³) × 1e-6
                steelKg = asD * span * 7850 * 1e-6;
              }
              // Steel members: use section area from steps if available
              if (isStl) {
                const massStep = calcResult.steps.find(s => s.label.toLowerCase().includes("mass") || s.label.toLowerCase().includes("weight"));
                if (massStep && typeof massStep.value === "number") steelKg = massStep.value;
              }

              // ── formwork area ──────────────────────────────────────────
              let formworkM2: number | null = null;
              if (isRC && !isNaN(b) && !isNaN(h) && !isNaN(span)) {
                // Soffit + 2 sides
                formworkM2 = ((b / 1000) + 2 * (h / 1000)) * span;
              }
              if (isRC && !isNaN(thk) && !isNaN(lx) && !isNaN(ly) && formworkM2 === null) {
                formworkM2 = lx * ly; // slab soffit only
              }

              const hasAny = concreteVol !== null || steelKg !== null || formworkM2 !== null;
              if (!hasAny) return (
                <p style={{ fontFamily: "var(--ui)", fontSize: 17, color: "var(--dim)", margin: 0 }}>
                  Quantities will be available once the section geometry is fully defined.
                </p>
              );
              return (
                <>
                  {concreteVol !== null && (
                    <KVRow
                      label="Volume of Concrete (Vc) [m\u00B3]"
                      value={concreteVol.toFixed(3) + " m\u00B3"}
                    />
                  )}
                  {steelKg !== null && (
                    <KVRow
                      label={isStl ? "Steel Section Mass (M) [kg/m]" : "Estimated Steel Reinforcement Mass (Est.) [kg]"}
                      value={steelKg.toFixed(2) + (isStl ? " kg/m" : " kg  (\u2248" + (steelKg / 1000).toFixed(3) + " t)")}
                    />
                  )}
                  {formworkM2 !== null && (
                    <KVRow
                      label="Formwork Area (Af) [m\u00B2]"
                      value={formworkM2.toFixed(2) + " m\u00B2"}
                    />
                  )}
                  <div style={{ marginTop: 12, fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)", lineHeight: 1.6 }}>
                    Note: Quantities are estimated from the design geometry. Confirm with a qualified quantity surveyor for tendering and construction purposes.
                  </div>
                </>
              );
            })()}
          </RptSection>

          {/* -- § 7  Detailing -- */}
          <RptSection num={7} title="Detailing" accent={accent}>
            <ElementSVG calcResult={calcResult} accent={accent} />
          </RptSection>
{/* -- � 7  General Interpretation -- */}
          <RptSection num={8} title="General Interpretation" accent={accent}>
            <div style={{ fontFamily: "var(--ui)", fontSize: 17, color: "var(--txt)", lineHeight: 1.7, marginBottom: 12 }}>
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
              <div style={{ fontFamily: "var(--mono)", fontSize: 17, fontWeight: 800, color: verdictColor, marginBottom: 5 }}>{verdictIcon}</div>
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
          <RptSection num={9} title="Design Optimisation" accent={accent}>
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
                  <p style={{ margin: 0, fontFamily: "var(--ui)", fontSize: 17, color: "var(--txt)", lineHeight: 1.65 }}>{h}</p>
                </div>
              ));
            })()}
          </RptSection>

          {/* -- Detailed Calculation Steps (audit trail) -- */}
          <div style={{ borderTop: "3px solid #ede9e1" }}>
            <div style={{ padding: "14px 18px 10px", background: "#f5f3f0", borderBottom: "2px solid #e8e2d9", display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 17, fontWeight: 900, color: accent }}>APPENDIX A</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 700, color: "var(--txt)" }}>� Detailed Calculation Audit Trail</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--dim)", marginLeft: "auto" }}>{calcResult.steps.length} steps � Python handcalcs</span>
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
        <span style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: ".8px" }}>{title}</span>
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,.03)" }}>
      <span style={{ fontFamily: "var(--ui)", fontSize: 17, color: "var(--mut)", flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontFamily: "var(--mono)", fontSize: 17, fontWeight: 600, color: highlight ? "#b45309" : "var(--txt)", textAlign: "right" }}>{value}</span>
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




// --- ElementSVG: plan, elevation, section drawings ----------------------------

function ElementSVG({ calcResult, accent }: { calcResult: import("@/types/calc").CalcResponse; accent: string }) {
  const dp  = calcResult.detailingPayload as Record<string, unknown> | null | undefined;
  const mod = calcResult.module ?? "";
  const dim = (dp?.dimensions ?? {}) as Record<string, number>;
  const ren = (dp?.reinforcement ?? {}) as Record<string, unknown>;

  // RC Beam
  if (mod.startsWith("rc_beam")) {
    const b    = Number(dim.b_mm   ?? dim.b   ?? 300);
    const h    = Number(dim.h_mm   ?? dim.h   ?? 500);
    const d    = Number(dim.d_mm   ?? dim.d   ?? 450);
    const span = Number(dim.span_m ?? dim.span ?? 5);
    const cover = Number(dim.cover ?? dim.cover_mm ?? 25);
    const asReq = Number(ren.as_design_mm2 ?? ren.As_design ?? 500);

    // Estimate bar layout
    const barDia   = asReq > 1200 ? 25 : asReq > 600 ? 20 : 16;
    const nBars    = Math.max(2, Math.round(asReq / (Math.PI * barDia * barDia / 4)));
    const svgW     = 320; const svgH = 220;
    const scaleX   = (svgW - 60) / span;   // px per m
    const spanPx   = span * scaleX;
    const ox       = 30; const oy = 30;
    const bPx      = Math.min(b * 0.35, 80); const hPx = Math.min(h * 0.35, 130);

    // Cross-section SVG (centred)
    const csW = 200; const csH = 200;
    const csX = (csW - bPx) / 2; const csY = (csH - hPx) / 2;
    const covPx = Math.max(5, cover * (bPx / b));
    const rowY  = csY + hPx - covPx - barDia * 0.35 / 2;
    const barSpacing = nBars > 1 ? (bPx - 2 * covPx) / (nBars - 1) : 0;

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {/* Elevation */}
        <div style={{ background: "#f9f7f4", borderRadius: 8, padding: 8, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Elevation</div>
          <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block" }}>
            {/* Beam rectangle */}
            <rect x={ox} y={oy} width={spanPx} height={hPx * 0.35} fill={`${accent}18`} stroke={accent} strokeWidth={1.5} rx={2} />
            {/* Left support triangle */}
            <polygon points={`${ox},${oy + hPx * 0.35} ${ox - 12},${oy + hPx * 0.35 + 16} ${ox + 12},${oy + hPx * 0.35 + 16}`} fill={`${accent}40`} stroke={accent} strokeWidth={1} />
            {/* Right support circle on roller */}
            <circle cx={ox + spanPx} cy={oy + hPx * 0.35 + 8} r={8} fill="none" stroke={accent} strokeWidth={1} />
            <line x1={ox + spanPx - 14} y1={oy + hPx * 0.35 + 16} x2={ox + spanPx + 14} y2={oy + hPx * 0.35 + 16} stroke={accent} strokeWidth={1} />
            {/* Span dimension line */}
            <line x1={ox} y1={oy + hPx * 0.35 + 34} x2={ox + spanPx} y2={oy + hPx * 0.35 + 34} stroke="#888" strokeWidth={0.8} strokeDasharray="3 2" />
            <text x={ox + spanPx / 2} y={oy + hPx * 0.35 + 48} textAnchor="middle" fontFamily="var(--mono)" fontSize={11} fill="#555">L = {span} m</text>
            {/* Depth label */}
            <text x={ox + spanPx + 14} y={oy + hPx * 0.18} fontFamily="var(--mono)" fontSize={10} fill="#555">h={h}mm</text>
          </svg>
        </div>

        {/* Cross-section */}
        <div style={{ background: "#f9f7f4", borderRadius: 8, padding: 8, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Cross-Section</div>
          <svg width="100%" viewBox={`0 0 ${csW} ${csH}`} style={{ display: "block" }}>
            {/* Section rectangle */}
            <rect x={csX} y={csY} width={bPx} height={hPx} fill={`${accent}12`} stroke={accent} strokeWidth={1.5} />
            {/* Cover dashed line */}
            <rect x={csX + covPx} y={csY + covPx} width={bPx - 2*covPx} height={hPx - 2*covPx} fill="none" stroke="#bbb" strokeWidth={0.7} strokeDasharray="3 2" />
            {/* Tension bars at bottom */}
            {Array.from({ length: nBars }, (_, j) => {
              const cx = nBars === 1 ? csX + bPx / 2 : csX + covPx + j * barSpacing;
              return <circle key={j} cx={cx} cy={rowY} r={Math.max(3, barDia * 0.18)} fill={accent} stroke="#fff" strokeWidth={0.8} />;
            })}
            {/* Width dimension */}
            <line x1={csX} y1={csY + hPx + 10} x2={csX + bPx} y2={csY + hPx + 10} stroke="#888" strokeWidth={0.8} />
            <text x={csX + bPx/2} y={csY + hPx + 22} textAnchor="middle" fontFamily="var(--mono)" fontSize={10} fill="#555">b={b}mm</text>
            {/* Height dimension */}
            <line x1={csX - 10} y1={csY} x2={csX - 10} y2={csY + hPx} stroke="#888" strokeWidth={0.8} />
            <text x={csX - 18} y={csY + hPx/2} textAnchor="middle" fontFamily="var(--mono)" fontSize={10} fill="#555" transform={`rotate(-90,${csX-18},${csY+hPx/2})`}>h={h}mm</text>
            {/* Bar label */}
            <text x={csW/2} y={csH - 4} textAnchor="middle" fontFamily="var(--mono)" fontSize={10} fill={accent}>{nBars}T{barDia} ({Math.round(asReq)} mm\u00B2)</text>
          </svg>
        </div>

        {/* Plan (top view) */}
        <div style={{ background: "#f9f7f4", borderRadius: 8, padding: 8, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Plan View</div>
          <svg width="100%" viewBox={`0 0 ${svgW} 120`} style={{ display: "block" }}>
            {/* Top view beam (width b × span) */}
            <rect x={ox} y={30} width={spanPx} height={bPx * 0.3} fill={`${accent}18`} stroke={accent} strokeWidth={1.5} rx={2} />
            {/* Tension bars visible in plan */}
            {Array.from({ length: nBars }, (_, j) => {
              const yBar = 30 + (j < Math.floor(nBars/2) ? covPx * 0.15 : bPx * 0.3 - covPx * 0.15);
              return <line key={j} x1={ox + 4} y1={yBar} x2={ox + spanPx - 4} y2={yBar} stroke={accent} strokeWidth={1} strokeDasharray={j >= Math.floor(nBars/2) ? "none" : "4 2"} />;
            })}
            {/* Span label */}
            <text x={ox + spanPx/2} y={30 + bPx * 0.3 + 20} textAnchor="middle" fontFamily="var(--mono)" fontSize={11} fill="#555">L = {span} m</text>
            <text x={ox + spanPx + 8} y={30 + bPx * 0.15} fontFamily="var(--mono)" fontSize={10} fill="#555">b</text>
          </svg>
        </div>
      </div>
    );
  }

  // RC Slab
  if (mod.startsWith("rc_slab")) {
    const h   = Number(dim.thickness_h ?? dim.h_mm ?? dim.h ?? 200);
    const lx  = Number(dim.lx_m ?? dim.span_x ?? dim.span_m ?? 4);
    const ly  = Number(dim.ly_m ?? dim.span_y ?? lx * 1.25);
    const cover = Number(dim.cover ?? 25);
    const svgW = 260; const svgH = 200;
    const sx = Math.min((svgW - 60) / lx, 40);
    const pW = lx * sx; const pH = ly * Math.min(sx, 30);

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={{ background: "#f9f7f4", borderRadius: 8, padding: 8, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Plan</div>
          <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block" }}>
            <rect x={30} y={20} width={pW} height={pH} fill={`${accent}14`} stroke={accent} strokeWidth={1.5} />
            {/* Mesh lines x-dir */}
            {Array.from({ length: 5 }, (_, i) => <line key={`x${i}`} x1={30} y1={20 + (i+1) * pH/6} x2={30 + pW} y2={20 + (i+1)*pH/6} stroke={accent} strokeWidth={0.5} strokeDasharray="3 3" />)}
            {/* Mesh lines y-dir */}
            {Array.from({ length: 5 }, (_, i) => <line key={`y${i}`} x1={30 + (i+1)*pW/6} y1={20} x2={30 + (i+1)*pW/6} y2={20 + pH} stroke={`${accent}80`} strokeWidth={0.5} strokeDasharray="3 3" />)}
            <text x={30 + pW/2} y={20 + pH + 18} textAnchor="middle" fontFamily="var(--mono)" fontSize={11} fill="#555">lx = {lx} m</text>
            <text x={30 + pW + 14} y={20 + pH/2} fontFamily="var(--mono)" fontSize={11} fill="#555">ly = {ly.toFixed(1)} m</text>
          </svg>
        </div>
        <div style={{ background: "#f9f7f4", borderRadius: 8, padding: 8, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Section</div>
          <svg width="100%" viewBox="0 0 200 160" style={{ display: "block" }}>
            <rect x={30} y={50} width={140} height={Math.min(h * 0.2, 60)} fill={`${accent}14`} stroke={accent} strokeWidth={1.5} />
            <line x1={44} y1={50 + Math.min(h*0.2,60) - 8} x2={156} y2={50 + Math.min(h*0.2,60) - 8} stroke={accent} strokeWidth={1.5} strokeDasharray="6 2" />
            <text x={100} y={50 + Math.min(h*0.2,60) + 18} textAnchor="middle" fontFamily="var(--mono)" fontSize={11} fill="#555">h = {h} mm</text>
            <line x1={168} y1={50} x2={168} y2={50 + Math.min(h*0.2,60)} stroke="#888" strokeWidth={0.8} />
            <text x={176} y={50 + Math.min(h*0.2,60)/2} fontFamily="var(--mono)" fontSize={10} fill="#555" transform={`rotate(90,176,${50+Math.min(h*0.2,60)/2})`}>h</text>
          </svg>
        </div>
        <div style={{ background: "#f9f7f4", borderRadius: 8, padding: 8, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".5px" }}>Info</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.8, color: "var(--txt)" }}>
            <div>h = {h} mm</div>
            <div>lx = {lx} m</div>
            <div>ly = {ly.toFixed(1)} m</div>
            <div>Cover = {cover} mm</div>
          </div>
        </div>
      </div>
    );
  }

  // Steel Beam — I-section
  if (mod.startsWith("steel_beam") || mod.startsWith("steel_column")) {
    const isColumn = mod.startsWith("steel_column");
    const secLabel = String((dp as Record<string, unknown>)?.section ?? "Universal Section");
    const D = 300; const B = 180; const tf = 14; const tw = 9;
    const svgH = 240; const svgW = 240;
    const cx = svgW/2; const cy = svgH/2;

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={{ background: "#f9f7f4", borderRadius: 8, padding: 8, textAlign: "center", gridColumn: "1/3" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Cross-Section ({isColumn ? "H" : "I"}-Profile)</div>
          <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block" }}>
            {/* Top flange */}
            <rect x={cx - B/2} y={cy - D/2} width={B} height={tf} fill={`${accent}30`} stroke={accent} strokeWidth={1.5} />
            {/* Web */}
            <rect x={cx - tw/2} y={cy - D/2 + tf} width={tw} height={D - 2*tf} fill={`${accent}20`} stroke={accent} strokeWidth={1} />
            {/* Bottom flange */}
            <rect x={cx - B/2} y={cy + D/2 - tf} width={B} height={tf} fill={`${accent}30`} stroke={accent} strokeWidth={1.5} />
            {/* Width dimension */}
            <line x1={cx - B/2} y1={cy + D/2 + 12} x2={cx + B/2} y2={cy + D/2 + 12} stroke="#888" strokeWidth={0.8} />
            <text x={cx} y={cy + D/2 + 24} textAnchor="middle" fontFamily="var(--mono)" fontSize={10} fill="#555">B = {B} mm</text>
            {/* Depth dimension */}
            <line x1={cx + B/2 + 12} y1={cy - D/2} x2={cx + B/2 + 12} y2={cy + D/2} stroke="#888" strokeWidth={0.8} />
            <text x={cx + B/2 + 22} y={cy} textAnchor="middle" fontFamily="var(--mono)" fontSize={10} fill="#555" transform={`rotate(90,${cx+B/2+22},${cy})`}>D = {D} mm</text>
          </svg>
        </div>
        <div style={{ background: "#f9f7f4", borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".5px" }}>Section</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: accent, textAlign: "center", lineHeight: 1.8 }}>{secLabel}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", marginTop: 4 }}>{isColumn ? "Universal Column" : "Universal Beam"}</div>
        </div>
      </div>
    );
  }

  // Fallback — generic placeholder
  return (
    <div style={{ padding: "28px 18px", background: "#f9f7f4", borderRadius: 10, textAlign: "center" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--mut)" }}>Detailing drawings will be available once geometry is fully defined.</div>
    </div>
  );
}
// --- Appendix A � Calculation steps block ------------------------------------

function CalcStepsBlock({ steps, accent }: { steps: CalcStep[]; accent: string }) {
  if (steps.length === 0) {
    return (
      <div style={{ padding: "28px 18px", textAlign: "center", fontFamily: "var(--mono)", fontSize: 17, color: "var(--dim)" }}>
        No calculation steps recorded.
      </div>
    );
  }

  return (
    <div style={{ padding: "10px 16px 20px" }}>
      {steps.map((step, i) => (
        <div key={i} style={{ paddingLeft: 16, borderLeft: `3px solid ${accent}50`, marginBottom: 20 }}>
          {/* Step header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${accent}22`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <span style={{ fontFamily: "var(--ui)", fontSize: 17, fontWeight: 700, color: "var(--txt)", flex: 1 }}>{step.label}</span>
            {step.clause && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: accent, border: `1px solid ${accent}50`, padding: "1px 7px", borderRadius: 10, flexShrink: 0 }}>{step.clause}</span>
            )}
          </div>

          {/* Formula */}
          {step.expression && (
            <div style={{ marginBottom: 6, paddingLeft: 34 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 3 }}>Substitution:</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 16, color: accent, borderLeft: `3px solid ${accent}40`, paddingLeft: 10, lineHeight: 1.7, wordBreak: "break-word" }}>
                = &nbsp;{step.expression}
              </div>
            </div>
          )}

          {/* Result */}
          <div style={{ paddingLeft: 34, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".6px" }}>Result:</span>
            {step.value != null ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 900, color: "var(--txt)" }}>
                  {typeof step.value === "number" && !Number.isInteger(step.value) ? step.value.toFixed(4) : step.value}
                </span>
                {step.unit && <span style={{ fontFamily: "var(--mono)", fontSize: 16, color: accent, fontWeight: 700 }}>{step.unit}</span>}
              </div>
            ) : <span style={{ fontFamily: "var(--mono)", fontSize: 17, color: "var(--dim)" }}>\u2014</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

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