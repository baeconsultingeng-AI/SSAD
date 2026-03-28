"use client";

import { useState } from "react";
import type { CalcResponse, CalcStep } from "@/types/calc";

export const MODULE_LABELS: Record<string, string> = {
  rc_beam_bs_v1:       "RC Beam · BS 8110",
  rc_slab_bs_v1:       "RC Slab · BS 8110",
  rc_column_bs_v1:     "RC Column · BS 8110",
  rc_foundation_bs_v1: "Pad Foundation · BS 8110",
  steel_beam_bs_v1:    "Steel Beam · BS 5950",
  steel_column_bs_v1:  "Steel Column · BS 5950",
  steel_truss_bs_v1:   "Steel Truss · BS 5950",
};

// Step labels to surface as "Key Outputs" — matched by substring (case-insensitive)
const KEY_OUTPUT_PATTERNS: { match: string; shortLabel: string; priority: number }[] = [
  { match: "design moment",           shortLabel: "Design Moment",         priority: 1 },
  { match: "design shear force",      shortLabel: "Design Shear",          priority: 2 },
  { match: "design axial",            shortLabel: "Design Axial",          priority: 2 },
  { match: "required tension steel",  shortLabel: "As,req",                priority: 3 },
  { match: "required steel",          shortLabel: "As,req",                priority: 3 },
  { match: "minimum tension steel",   shortLabel: "As,min",                priority: 4 },
  { match: "effective depth",         shortLabel: "Eff. Depth d",          priority: 5 },
  { match: "k factor",                shortLabel: "K Factor",              priority: 6 },
  { match: "concrete shear resistance", shortLabel: "vc",                  priority: 7 },
  { match: "design shear stress",     shortLabel: "v (shear)",             priority: 8 },
  { match: "actual span/depth",       shortLabel: "l/d (actual)",          priority: 9 },
  { match: "allowable span/depth",    shortLabel: "l/d (allow.)",          priority: 10 },
  { match: "design udl",              shortLabel: "UDL w",                 priority: 11 },
  { match: "lever arm",               shortLabel: "Lever Arm z",           priority: 12 },
];

// ── Rebar suggestion helpers ────────────────────────────────────────
const REBAR_SIZES: { dia: number; area: number }[] = [
  { dia: 8,  area: 50.3   },
  { dia: 10, area: 78.5   },
  { dia: 12, area: 113.1  },
  { dia: 16, area: 201.1  },
  { dia: 20, area: 314.2  },
  { dia: 25, area: 490.9  },
  { dia: 32, area: 804.2  },
  { dia: 40, area: 1256.6 },
];

interface RebarOption { bars: number; dia: number; area: number; label: string; }

function suggestRebar(asReq: number): RebarOption[] {
  if (asReq <= 0) return [];
  const candidates: RebarOption[] = [];
  for (const bar of REBAR_SIZES) {
    const minBars = Math.ceil(asReq / bar.area);
    for (let n = minBars; n <= minBars + 1 && n <= 8; n++) {
      const area = +(n * bar.area).toFixed(1);
      if (area >= asReq && area <= asReq * 3) {
        candidates.push({ bars: n, dia: bar.dia, area, label: `${n}H${bar.dia}` });
      }
    }
  }
  candidates.sort((a, b) => a.area - b.area);
  const seen = new Set<string>();
  return candidates.filter(c => { if (seen.has(c.label)) return false; seen.add(c.label); return true; }).slice(0, 5);
}

function findStepValue(steps: CalcStep[], match: string): number | null {
  const step = steps.find(s => s.label.toLowerCase().includes(match.toLowerCase()));
  return step ? step.value : null;
}

function findKeySteps(steps: CalcStep[]): { shortLabel: string; value: number; unit: string }[] {
  const found: { shortLabel: string; value: number; unit: string; priority: number }[] = [];
  for (const pat of KEY_OUTPUT_PATTERNS) {
    const step = steps.find(s => s.label.toLowerCase().includes(pat.match.toLowerCase()));
    if (step) {
      found.push({ shortLabel: pat.shortLabel, value: step.value, unit: step.unit ?? "", priority: pat.priority });
    }
  }
  return found.sort((a, b) => a.priority - b.priority).slice(0, 8);
}

// Generate engineered interpretation text from checks + warnings
function buildInterpretation(calcResult: CalcResponse): string[] {
  const { checks, warnings, module } = calcResult;
  const lines: string[] = [];

  const bendingK  = checks.find(c => c.id === "bending_k");
  const shearMax  = checks.find(c => c.id === "shear_max");
  const shearVc   = checks.find(c => c.id === "shear_vc");
  const deflCheck = checks.find(c => c.id === "deflection");
  const minSteel  = checks.find(c => c.id === "min_steel");

  if (bendingK) {
    const util = bendingK.limit > 0 ? (bendingK.value / bendingK.limit) * 100 : 0;
    if (bendingK.status === "pass") {
      lines.push(`✓ Bending: The section is adequate in bending. K = ${bendingK.value.toFixed(4)} is below K′ = ${bendingK.limit.toFixed(3)} (${util.toFixed(0)}% utilised), confirming no compression steel is required.`);
    } else {
      lines.push(`✗ Bending: The section is over-stressed in bending (K = ${bendingK.value.toFixed(4)} > K′ = ${bendingK.limit.toFixed(3)}). The concrete compression zone is insufficient for a singly-reinforced section. Compression reinforcement or a deeper section is required.`);
    }
  }

  if (shearMax && shearVc) {
    if (shearMax.status === "fail") {
      lines.push(`✗ Shear: Design shear stress v = ${shearMax.value.toFixed(3)} N/mm² exceeds the maximum permissible (${shearMax.limit.toFixed(3)} N/mm²). The section size must be increased — this is a safety-critical failure.`);
    } else if ((shearVc as { note?: string }).note?.includes("Full link")) {
      lines.push(`⚠ Shear: Applied shear (v = ${shearMax.value.toFixed(3)} N/mm²) significantly exceeds concrete resistance vc = ${shearVc.limit.toFixed(3)} N/mm². Full designed shear reinforcement (links) is required per BS 8110 Cl. 3.4.5.3.`);
    } else if ((shearVc as { note?: string }).note?.includes("Minimum")) {
      lines.push(`⚠ Shear: Applied shear exceeds concrete resistance vc = ${shearVc.limit.toFixed(3)} N/mm². Minimum designed links are required (v > vc).`);
    } else {
      lines.push(`✓ Shear: Concrete shear resistance vc = ${shearVc.limit.toFixed(3)} N/mm² is sufficient. Only nominal links are required.`);
    }
  }

  if (deflCheck) {
    const util = deflCheck.limit > 0 ? (deflCheck.value / deflCheck.limit) * 100 : 0;
    if (deflCheck.status === "pass") {
      lines.push(`✓ Deflection: Span/depth ratio check passes. Actual l/d = ${deflCheck.value.toFixed(1)} vs allowable ${deflCheck.limit.toFixed(1)} (${util.toFixed(0)}% utilised). Serviceability is satisfactory.`);
    } else {
      lines.push(`✗ Deflection: Span/depth ratio check fails. Actual l/d = ${deflCheck.value.toFixed(1)} exceeds allowable ${deflCheck.limit.toFixed(1)} (${util.toFixed(0)}% utilised). The beam is likely to deflect excessively in service. Either increase section depth or provide more tension steel.`);
    }
  }

  if (minSteel) {
    if (minSteel.status === "fail") {
      lines.push(`✗ Minimum steel: Required area As = ${minSteel.value.toFixed(0)} mm² falls below the code minimum of ${minSteel.limit.toFixed(0)} mm² (BS 8110 Table 3.25). Increase tension reinforcement.`);
    }
  }

  if (module?.startsWith("rc_beam") && warnings.some(w => w.toLowerCase().includes("continuous"))) {
    lines.push(`ℹ Continuous beam: Mid-span positive moment coefficient used. Hogging moments at supports have not been designed — these must be checked separately.`);
  }

  return lines;
}

// Generate optimisation suggestions from check utilizations and steps
function buildOptimisation(calcResult: CalcResponse): string[] {
  const { checks, results, steps } = calcResult;
  const suggestions: string[] = [];
  const util = results.utilization ?? 0;

  const bendingK  = checks.find(c => c.id === "bending_k");
  const deflCheck = checks.find(c => c.id === "deflection");
  const shearVc   = checks.find(c => c.id === "shear_vc");

  const kVal = bendingK?.value ?? 0;
  const defl_util = deflCheck && deflCheck.limit > 0 ? deflCheck.value / deflCheck.limit : 0;
  const bendUtil  = bendingK && bendingK.limit > 0 ? bendingK.value / bendingK.limit : 0;

  // Find As_req step
  const asReqStep = steps.find(s => s.label.toLowerCase().includes("required tension steel"));
  const asMinStep = steps.find(s => s.label.toLowerCase().includes("minimum tension steel"));
  const governedByMin = asReqStep && asMinStep && asMinStep.value >= asReqStep.value;

  if (bendingK?.status !== "fail" && deflCheck?.status !== "fail") {
    if (util < 0.45) {
      suggestions.push(`Section is significantly under-utilised (${Math.round(util * 100)}%). Consider reducing section depth or width to optimise material efficiency while maintaining compliance.`);
    } else if (util < 0.65) {
      suggestions.push(`Section has reasonable capacity headroom (${Math.round(util * 100)}% utilised). This margin can absorb minor load increases without redesign.`);
    } else if (util > 0.90) {
      suggestions.push(`Section is highly utilised (${Math.round(util * 100)}%). Any increase in loading or reduction in material properties could cause non-compliance — recommend a sensitivity check.`);
    }
  }

  if (bendingK?.status === "fail") {
    suggestions.push(`Increase section depth h or width b to bring K below K′ = 0.156. Alternatively, add compression reinforcement, but increasing depth is structurally more efficient.`);
  } else if (kVal < 0.04) {
    suggestions.push(`K = ${kVal.toFixed(4)} is very low — the section is heavily oversized for bending. Reducing section depth would save material and weight.`);
  }

  if (deflCheck?.status === "fail") {
    suggestions.push(`To fix deflection: provide additional tension reinforcement (increase As,prov beyond As,req) — this raises the modification factor MF and increases the allowable l/d ratio without changing the section size.`);
  } else if (defl_util > 0.85) {
    suggestions.push(`Deflection is the near-critical check (${Math.round(defl_util * 100)}% of allowable). If loads increase or span is extended, specify As,prov > As,req to maintain the deflection modification factor.`);
  }

  if (governedByMin) {
    suggestions.push(`Design is governed by minimum steel requirements, not by bending demand. Consider a smaller section if architectural constraints allow — minimum steel reduces with reduced section area.`);
  }

  if (shearVc && (shearVc as { note?: string }).note?.includes("Full link")) {
    suggestions.push(`Shear is critical — consider widening the web b to increase both concrete shear capacity vc and maximum allowable stress v_max, reducing the quantity of shear links required.`);
  }

  if (suggestions.length === 0) {
    suggestions.push(`Design is well-balanced. No significant optimisation adjustments are needed for the current loading conditions.`);
  }

  return suggestions;
}

interface Props {
  calcResult: CalcResponse;
  onViewReport: () => void;
  onViewDetails: () => void;
  onRedesign?: () => void;
  avatarNode?: React.ReactNode;
  elementId?: string | null;
}

export default function InlineResultCard({ calcResult, onViewReport, onViewDetails, onRedesign, avatarNode, elementId }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"checks" | "interpret" | "optimise">("checks");
  const [selectedRebarLabel, setSelectedRebarLabel] = useState<string | null>(null);
  const [asProvInput, setAsProvInput] = useState<string>("");
  const [asProvConfirmed, setAsProvConfirmed] = useState<number | null>(null);

  const { results, checks, module, warnings, steps } = calcResult;
  const verdict  = results.verdict;
  const isPass   = verdict === "pass";
  const isWarn   = verdict === "warn";

  const verdictLabel  = isPass ? "PASS" : isWarn ? "CAUTION" : "FAIL";
  const verdictColor  = isPass ? "#15803d" : isWarn ? "#b45309" : "#b91c1c";
  const verdictBg     = isPass ? "linear-gradient(135deg,#14532d,#15803d)" : isWarn ? "linear-gradient(135deg,#78350f,#b45309)" : "linear-gradient(135deg,#7f1d1d,#b91c1c)";
  const verdictBgMild = isPass ? "rgba(21,128,61,.06)"  : isWarn ? "rgba(180,83,9,.07)"    : "rgba(185,28,28,.07)";
  const verdictBdr    = isPass ? "rgba(21,128,61,.22)"  : isWarn ? "rgba(180,83,9,.28)"    : "rgba(185,28,28,.22)";

  const utilPct    = Math.round((results.utilization ?? 0) * 100);
  const moduleLabel = MODULE_LABELS[module] ?? module?.replace(/_/g, " ").replace(/bs/i, "BS").replace(/v\d+/i, "").trim();

  const keyOutputs     = findKeySteps(steps ?? []);
  const interpretation = buildInterpretation(calcResult);
  const optimisation   = buildOptimisation(calcResult);

  const failCount = checks?.filter(c => c.status === "fail").length ?? 0;
  const warnCount = checks?.filter(c => c.status === "warn").length ?? 0;

  // Reinforcement suggestion state
  const isRcModule = module?.startsWith("rc_") ?? false;
  const asReq = isRcModule
    ? (findStepValue(steps ?? [], "required tension steel") ?? findStepValue(steps ?? [], "required steel"))
    : null;
  const rebarSuggestions = asReq != null && asReq > 0 ? suggestRebar(asReq) : [];
  // Initialise input with As_req when it becomes available
  const asProvInputVal = asProvInput !== "" ? asProvInput : (asReq != null ? asReq.toFixed(0) : "");

  const defaultAvatar = (
    <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="23" fill="#1a4a8a"/>
      <circle cx="24" cy="24" r="23" stroke="#c8960c" strokeWidth="2"/>
      <rect x="13" y="12" width="22" height="17" rx="4" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.2"/>
      <rect x="16" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
      <rect x="26" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
      <rect x="16" y="24" width="16" height="3" rx="1" fill="rgba(200,150,12,0.4)" stroke="rgba(200,150,12,0.7)" strokeWidth="1"/>
      <rect x="11" y="32" width="26" height="10" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
    </svg>
  );

  return (
    <div className="ai-msg" style={{ alignItems: "flex-start", marginBottom: 12 }}>
      <div className="ai-av ag" style={{ flexShrink: 0, marginTop: 4 }}>{avatarNode ?? defaultAvatar}</div>
      <div style={{ flex: 1, minWidth: 0, maxWidth: "98%" }}>

        {/* ── Compact title row (always visible) ── */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "9px 14px", cursor: "pointer", userSelect: "none",
            background: verdictBgMild, border: `1.5px solid ${verdictBdr}`,
            borderRadius: expanded ? "12px 12px 0 0" : 12,
          }}
        >
          {elementId && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 800, color: "#374151", background: "#f3f4f6", padding: "2px 8px", borderRadius: 5, border: "1px solid #d1d5db", letterSpacing: ".4px", flexShrink: 0 }}>
              {elementId}
            </span>
          )}
          <span style={{
            fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800, letterSpacing: ".5px",
            color: verdictColor, background: `${verdictColor}22`,
            border: `1.5px solid ${verdictColor}55`,
            padding: "2px 9px", borderRadius: 6, flexShrink: 0,
          }}>{verdictLabel}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--blu)", background: "var(--bl)", padding: "2px 7px", borderRadius: 5, border: "1px solid var(--bb)", flexShrink: 0 }}>
            {moduleLabel}
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: verdictColor, fontWeight: 700 }}>
            {utilPct}% utilised
          </span>
          {failCount > 0 && <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#b91c1c", background: "#fee2e2", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{failCount} FAIL</span>}
          {warnCount > 0 && <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#92400e", background: "#fef3c7", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{warnCount} WARN</span>}
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--mut)" strokeWidth="2.2" strokeLinecap="round"
            style={{ flexShrink: 0, marginLeft: "auto", transform: expanded ? "rotate(180deg)" : "none", transition: "transform .22s" }}>
            <path d="M1 4l6 6 6-6"/>
          </svg>
        </div>

        {/* ── Expandable body ── */}
        {expanded && (
          <div style={{
            border: `1.5px solid ${verdictBdr}`, borderTop: "none",
            borderRadius: "0 0 12px 12px", background: "#fff",
            overflow: "hidden", boxShadow: "0 6px 24px rgba(0,0,0,.08)",
          }}>

            {/* ── VERDICT HEADER BAND ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", background: verdictBg,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: "rgba(255,255,255,.15)", border: "1.5px solid rgba(255,255,255,.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  fontSize: 18,
                }}>
                  {isPass ? "✓" : isWarn ? "⚠" : "✗"}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--ser)", fontSize: 16, fontWeight: 900, color: "#fff", letterSpacing: ".2px" }}>
                    Design Completed
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{
                      fontFamily: "var(--mono)", fontSize: 9, fontWeight: 800, letterSpacing: ".5px",
                      background: "rgba(255,255,255,.22)", border: "1.5px solid rgba(255,255,255,.4)",
                      color: "#fff", padding: "1px 8px", borderRadius: 5,
                    }}>{verdictLabel}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "rgba(255,255,255,.75)" }}>
                      {moduleLabel} · {utilPct}% utilised
                    </span>
                  </div>
                </div>
              </div>
              {/* Utilisation gauge */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{utilPct}%</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.6)", marginTop: 2 }}>utilised</div>
                <div style={{ width: 64, height: 5, background: "rgba(255,255,255,.2)", borderRadius: 3, marginTop: 4 }}>
                  <div style={{ width: `${Math.min(utilPct, 100)}%`, height: "100%", background: "#fff", borderRadius: 3, opacity: .9 }} />
                </div>
              </div>
            </div>

            {/* ── AI SUMMARY ── */}
            <div style={{ padding: "10px 16px 9px", borderBottom: "2px solid #f0ece6", background: "rgba(245,241,235,.5)", display: "flex", gap: 10 }}>
              <div style={{ width: 3, flexShrink: 0, borderRadius: 2, background: verdictColor, alignSelf: "stretch", minHeight: 16 }} />
              <p style={{ margin: 0, fontFamily: "var(--ui)", fontSize: 12, color: "#4b5563", lineHeight: 1.75, fontStyle: "italic" }}>
                {results.summary}
              </p>
            </div>

            {/* ── KEY OUTPUTS GRID ── */}
            {keyOutputs.length > 0 && (
              <div style={{ padding: "12px 16px", borderBottom: "2px solid #f0ece6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2.2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800, letterSpacing: ".7px", color: "#1e3a8a", textTransform: "uppercase" }}>Key Outputs</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                  {keyOutputs.map(({ shortLabel, value, unit }) => (
                    <div key={shortLabel} style={{
                      background: "#f8faff", border: "1.5px solid #dbeafe",
                      borderRadius: 9, padding: "8px 10px",
                    }}>
                      <div style={{ fontFamily: "var(--ui)", fontSize: 10.5, color: "#6b7280", fontWeight: 600, marginBottom: 3 }}>{shortLabel}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 800, color: "#1e3a8a" }}>
                          {Math.abs(value) >= 1000 ? value.toFixed(0) : Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(3)}
                        </span>
                        {unit && <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "#9ca3af", fontWeight: 600 }}>{unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── AS,PROV REINFORCEMENT PANEL ── */}
            {isRcModule && asReq != null && asReq > 0 && (
              <div style={{ padding: "12px 16px", borderBottom: "2px solid #f0ece6", background: "#fafaf7" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="2"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9C11.18 3.78 5.81 1.77 3.8 3.8c-2.04 2.03-.02 7.36 4.5 11.9 4.5 4.52 9.87 6.57 11.9 4.5z"/><path d="M15.7 15.7c4.52-4.54 6.53-9.91 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.53 9.91-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5z"/></svg>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800, letterSpacing: ".7px", color: "#7c3aed", textTransform: "uppercase" }}>Reinforcement Arrangement</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#9ca3af", marginLeft: "auto" }}>As,req = {asReq.toFixed(0)} mm²</span>
                </div>

                {asProvConfirmed !== null ? (
                  /* ── Confirmed state ── */
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, color: "#fff", fontWeight: 800, flexShrink: 0 }}>✓</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 800, color: "#15803d" }}>
                        As,prov = {asProvConfirmed.toFixed(0)} mm²
                        {selectedRebarLabel && <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginLeft: 8 }}>({selectedRebarLabel})</span>}
                      </div>
                      <div style={{ fontFamily: "var(--ui)", fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                        {asProvConfirmed >= asReq
                          ? `${((asProvConfirmed / asReq - 1) * 100).toFixed(1)}% above As,req — reinforcement satisfies demand`
                          : `⚠ ${((1 - asProvConfirmed / asReq) * 100).toFixed(1)}% below As,req — insufficient reinforcement`}
                      </div>
                    </div>
                    <button onClick={() => { setAsProvConfirmed(null); setSelectedRebarLabel(null); setAsProvInput(""); }}
                      style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6b7280", background: "none", border: "1px solid #d1d5db", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}
                    >Edit</button>
                  </div>
                ) : (
                  /* ── Selection state ── */
                  <div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      {rebarSuggestions.map(opt => {
                        const ok = opt.area >= asReq;
                        const isSelected = selectedRebarLabel === opt.label;
                        return (
                          <button key={opt.label}
                            onClick={() => { setSelectedRebarLabel(opt.label); setAsProvInput(opt.area.toFixed(0)); }}
                            style={{
                              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700,
                              padding: "5px 11px", borderRadius: 7, cursor: "pointer",
                              background: isSelected ? "#7c3aed" : ok ? "#f0fdf4" : "#fff1f2",
                              border: isSelected ? "1.5px solid #7c3aed" : ok ? "1.5px solid #86efac" : "1.5px solid #fca5a5",
                              color: isSelected ? "#fff" : ok ? "#15803d" : "#b91c1c",
                              transition: "all .15s",
                            }}
                          >
                            {opt.label}
                            <span style={{ fontWeight: 500, fontSize: 9, marginLeft: 4, opacity: .75 }}>{opt.area.toFixed(0)} mm²</span>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", flex: 1, background: "#fff", border: "1.5px solid #d1d5db", borderRadius: 7, overflow: "hidden" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#9ca3af", padding: "0 8px", fontWeight: 600 }}>As,prov</span>
                        <input
                          type="number" min="0" step="1"
                          value={asProvInputVal}
                          onChange={e => { setAsProvInput(e.target.value); setSelectedRebarLabel(null); }}
                          style={{
                            flex: 1, border: "none", outline: "none", padding: "6px 4px",
                            fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: "#1f2937",
                            background: "transparent",
                          }}
                        />
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#9ca3af", padding: "0 8px" }}>mm²</span>
                      </div>
                      <button
                        onClick={() => {
                          const val = parseFloat(asProvInputVal);
                          if (!isNaN(val) && val > 0) setAsProvConfirmed(val);
                        }}
                        style={{
                          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800,
                          padding: "7px 14px", borderRadius: 7, cursor: "pointer",
                          background: "#7c3aed", border: "none", color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        Confirm As,prov
                      </button>
                    </div>
                    <div style={{ fontFamily: "var(--ui)", fontSize: 10.5, color: "#9ca3af", marginTop: 6 }}>
                      Select a suggested bar arrangement above, or enter your own area and click Confirm.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TABS: Checks / Interpretation / Optimisation ── */}
            <div style={{ borderBottom: "2px solid #f0ece6" }}>
              <div style={{ display: "flex", gap: 0 }}>
                {(["checks", "interpret", "optimise"] as const).map(tab => {
                  const labels = { checks: "Code Checks", interpret: "Interpretation", optimise: "Optimisation" };
                  const isActive = activeTab === tab;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      style={{
                        flex: 1, padding: "8px 6px", border: "none", cursor: "pointer",
                        background: isActive ? "#fff" : "rgba(0,0,0,.02)",
                        borderBottom: isActive ? `2px solid ${verdictColor}` : "2px solid transparent",
                        fontFamily: "var(--mono)", fontSize: 10, fontWeight: isActive ? 800 : 600,
                        color: isActive ? verdictColor : "#6b7280",
                        transition: "all .15s", marginBottom: isActive ? -2 : 0,
                      }}
                    >
                      {labels[tab]}
                      {tab === "checks" && failCount > 0 && (
                        <span style={{ marginLeft: 5, background: "#fee2e2", color: "#b91c1c", fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3 }}>{failCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── TAB: CODE CHECKS ── */}
            {activeTab === "checks" && (
              <div>
                {checks && checks.length > 0 && checks.map((c, idx) => {
                  const st = c.status;
                  const dotColor = st === "pass" ? "#15803d" : st === "warn" ? "#b45309" : "#b91c1c";
                  const dotBg    = st === "pass" ? "#dcfce7"  : st === "warn" ? "#fef3c7"  : "#fee2e2";
                  const pct = c.limit > 0 ? Math.min((c.value / c.limit) * 100, 150) : 0;
                  // Bar colour tracks the check status — a passing check is always green
                  const barColor = dotColor;
                  const unitStr = (c as { unit?: string }).unit ?? "";
                  const noteStr = (c as { note?: string }).note;
                  return (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 16px",
                      borderBottom: idx < checks.length - 1 ? "1px solid rgba(0,0,0,.05)" : "none",
                      background: idx % 2 === 0 ? "#fff" : "rgba(0,0,0,.015)",
                    }}>
                      {/* Status icon */}
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                        background: dotBg, border: `1.5px solid ${dotColor}44`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800, color: dotColor,
                      }}>
                        {st === "pass" ? "✓" : st === "warn" ? "!" : "✗"}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: "#1f2937" }}>{c.label}</span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#9ca3af" }}>{c.clause?.split("Cl. ").pop() ?? c.clause}</span>
                        </div>
                        {noteStr && (
                          <div style={{ fontFamily: "var(--ui)", fontSize: 11, color: "#6b7280", marginTop: 2 }}>{noteStr}</div>
                        )}
                        {/* Value / limit bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                          <div style={{ flex: 1, height: 5, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width .4s" }} />
                          </div>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: dotColor, flexShrink: 0 }}>
                            {c.value.toFixed(c.value < 10 ? 3 : 1)}{unitStr && ` ${unitStr}`} / {c.limit.toFixed(c.limit < 10 ? 3 : 1)}{unitStr && ` ${unitStr}`}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800, color: dotColor, flexShrink: 0, marginTop: 2 }}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                  );
                })}
                {/* Warnings */}
                {warnings && warnings.length > 0 && (
                  <div style={{ padding: "10px 16px", background: "rgba(217,119,6,.05)", borderTop: "1.5px solid #fde68a" }}>
                    {warnings.map((w, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < warnings.length - 1 ? 6 : 0 }}>
                        <span style={{ color: "#b45309", flexShrink: 0, marginTop: 1 }}>⚠</span>
                        <span style={{ fontFamily: "var(--ui)", fontSize: 11, color: "#92400e", lineHeight: 1.65 }}>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: INTERPRETATION ── */}
            {activeTab === "interpret" && (
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#44337a" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800, letterSpacing: ".7px", color: "#44337a", textTransform: "uppercase" }}>Engineering Interpretation</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {interpretation.map((line, i) => {
                    const isFail = line.startsWith("✗");
                    const isWarnLine = line.startsWith("⚠");
                    const isInfo = line.startsWith("ℹ");
                    const bColor = isFail ? "#b91c1c" : isWarnLine ? "#b45309" : isInfo ? "#1e3a8a" : "#15803d";
                    const bgColor = isFail ? "#fff1f2" : isWarnLine ? "#fffbeb" : isInfo ? "#eff6ff" : "#f0fdf4";
                    const bdColor = isFail ? "#fecdd3" : isWarnLine ? "#fde68a" : isInfo ? "#bfdbfe" : "#bbf7d0";
                    return (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: bgColor, border: `1.5px solid ${bdColor}`, borderRadius: 8 }}>
                        <div style={{ width: 3, flexShrink: 0, background: bColor, borderRadius: 2, alignSelf: "stretch", minHeight: 16 }} />
                        <p style={{ margin: 0, fontFamily: "var(--ui)", fontSize: 12, color: "#374151", lineHeight: 1.75 }}>
                          {line.replace(/^[✓✗⚠ℹ]\s*/, "")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB: OPTIMISATION ── */}
            {activeTab === "optimise" && (
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#14532d" strokeWidth="2.2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800, letterSpacing: ".7px", color: "#14532d", textTransform: "uppercase" }}>Optimisation Suggestions</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {optimisation.map((sug, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "#f8faff", border: "1.5px solid #dbeafe", borderRadius: 8 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                        background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--mono)", fontSize: 9, fontWeight: 800, color: "#fff",
                      }}>{i + 1}</div>
                      <p style={{ margin: 0, fontFamily: "var(--ui)", fontSize: 12, color: "#374151", lineHeight: 1.75 }}>{sug}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ACTION FOOTER ── */}
            <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderTop: "1.5px solid #f0ece6", background: "rgba(245,241,235,.4)", flexWrap: "wrap" }}>
              {!isPass && onRedesign && (
                <button onClick={onRedesign} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  padding: "9px 0", borderRadius: 8, cursor: "pointer",
                  background: verdictBg, border: "none",
                  fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800, color: "#fff",
                  marginBottom: 4,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.49"/>
                  </svg>
                  Re-Design Element
                </button>
              )}
              <button onClick={onViewReport} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "8px 0", borderRadius: 8, cursor: "pointer",
                background: "#fff", border: "1.5px solid #d1d5db",
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "#374151",
                transition: "all .15s",
              }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="2" width="10" height="10" rx="1"/><line x1="5" y1="5" x2="9" y2="5"/>
                  <line x1="5" y1="7.5" x2="9" y2="7.5"/><line x1="5" y1="10" x2="7" y2="10"/>
                </svg>
                Generate Report
              </button>
              <button onClick={onViewDetails} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "8px 0", borderRadius: 8, cursor: "pointer",
                background: "#fff", border: "1.5px solid #d1d5db",
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "#374151",
                transition: "all .15s",
              }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="2" width="10" height="10" rx="1"/><line x1="5" y1="5" x2="9" y2="5"/>
                  <line x1="2" y1="11" x2="12" y2="11"/><circle cx="7" cy="7.5" r="1.5"/>
                </svg>
                View Detailing
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
