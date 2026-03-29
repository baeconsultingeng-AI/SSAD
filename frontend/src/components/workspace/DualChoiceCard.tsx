"use client";
import React, { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface ModelResult {
  extracted: Record<string, unknown>;
  summary: string;
  confidence: string;
  missing: string[];
  param_confidence: Record<string, number>;
  model: string;
}

interface DivergentField {
  field: string;
  deepseek: unknown;
  claude: unknown;
  reason: string;
}

export interface DualChoicePayload {
  module: string;
  convergence: number;
  divergent_fields: DivergentField[];
  deepseek_result: ModelResult;
  claude_result: ModelResult;
}

interface Props {
  content: string; // __DUAL_CHOICE__{...json}
  elementId: string | null;
  onChoose: (chosen: { provider: string; result: ModelResult }) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function flattenParams(d: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(d)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") {
      Object.assign(out, flattenParams(v as Record<string, unknown>, key));
    } else {
      out[key] = String(v ?? "");
    }
  }
  return out;
}

function formatKey(key: string): string {
  return key
    .replace(/^[^.]+\./, "")   // remove section prefix
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}

const CONF_COLOR: Record<string, string> = {
  high: "#15803d", medium: "#b45309", low: "#b91c1c",
};
const CONF_BG: Record<string, string> = {
  high: "#dcfce7", medium: "#fef3c7", low: "#fee2e2",
};

// ── Component ──────────────────────────────────────────────────────────────
export default function DualChoiceCard({ content, elementId, onChoose }: Props) {
  const [hovered, setHovered] = useState<"deepseek" | "claude" | null>(null);

  let payload: DualChoicePayload | null = null;
  try {
    payload = JSON.parse(content.replace(/^__DUAL_CHOICE__/, "")) as DualChoicePayload;
  } catch {
    return null;
  }
  if (!payload) return null;

  const { module, convergence, divergent_fields, deepseek_result, claude_result } = payload;
  const convergencePct = Math.round(convergence * 100);
  const divergentKeys = new Set(divergent_fields.map(f => f.field));

  const dsFlat = flattenParams(deepseek_result.extracted);
  const clFlat = flattenParams(claude_result.extracted);
  const allKeys = Array.from(new Set([...Object.keys(dsFlat), ...Object.keys(clFlat)])).sort();

  const scoreColor = convergencePct >= 75 ? "#b45309" : "#b91c1c";
  const scoreBg    = convergencePct >= 75 ? "#fef3c7" : "#fee2e2";

  return (
    <div className="ai-msg" style={{ alignItems: "flex-start", marginBottom: 12 }}>
      {/* Avatar */}
      <div className="ai-av ag" style={{ flexShrink: 0, marginTop: 4 }}>
        <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="23" fill="#1a4a8a"/>
          <circle cx="24" cy="24" r="23" stroke="#c8960c" strokeWidth="2"/>
          <rect x="13" y="12" width="22" height="17" rx="4" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.2"/>
          <rect x="16" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
          <rect x="26" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
          <rect x="16" y="24" width="16" height="3" rx="1" fill="rgba(200,150,12,0.4)" stroke="rgba(200,150,12,0.7)" strokeWidth="1"/>
          <rect x="11" y="32" width="26" height="10" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0, maxWidth: "98%" }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          background: "linear-gradient(135deg,#4a0f0f 0%,#7a1a1a 50%,#9b2c2c 100%)",
          borderRadius: "13px 13px 0 0",
          boxShadow: "0 2px 12px rgba(154,44,44,.4)",
        }}>
          {/* Warning icon */}
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--ser)", fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
              Model Disagreement — Review Required
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {elementId && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800, color: "#fff", background: "rgba(255,255,255,.18)", padding: "2px 9px", borderRadius: 5, border: "1px solid rgba(255,255,255,.35)" }}>
                  {elementId}
                </span>
              )}
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "rgba(200,150,12,.95)", background: "rgba(200,150,12,.18)", padding: "2px 9px", borderRadius: 5, border: "1px solid rgba(200,150,12,.5)", fontWeight: 700 }}>
                {module.replace(/_/g, " ")}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: scoreColor, background: scoreBg, padding: "2px 9px", borderRadius: 5 }}>
                ⚠ {convergencePct}% convergence
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "rgba(255,200,200,.7)", marginLeft: "auto" }}>
                {divergent_fields.length} conflicting field{divergent_fields.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* ── Instruction banner ── */}
        <div style={{ padding: "10px 16px", background: "#fff8f0", borderLeft: "1px solid #f3c06a", borderRight: "1px solid #f3c06a", fontFamily: "var(--mono)", fontSize: 11, color: "#92400e" }}>
          The two AI models produced conflicting parameter extractions. Review the differences below and select the result you trust. Highlighted rows indicate disagreements.
        </div>

        {/* ── Side-by-side comparison ── */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderTop: "none", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--mono)" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", color: "#374151", fontWeight: 700, width: "28%" }}>
                  Parameter
                </th>
                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", color: "#2563eb", fontWeight: 700, width: "36%" }}>
                  ⚡ DeepSeek
                  <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10, color: "#6b7280" }}>{deepseek_result.model}</span>
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: CONF_COLOR[deepseek_result.confidence] ?? "#374151", background: CONF_BG[deepseek_result.confidence] ?? "#f3f4f6", padding: "1px 6px", borderRadius: 4 }}>
                    {deepseek_result.confidence}
                  </span>
                </th>
                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", color: "#7c3aed", fontWeight: 700, width: "36%" }}>
                  ◆ Claude
                  <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10, color: "#6b7280" }}>{claude_result.model}</span>
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: CONF_COLOR[claude_result.confidence] ?? "#374151", background: CONF_BG[claude_result.confidence] ?? "#f3f4f6", padding: "1px 6px", borderRadius: 4 }}>
                    {claude_result.confidence}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {allKeys.map((key, i) => {
                const isDivergent = divergentKeys.has(key);
                const dsVal = dsFlat[key];
                const clVal = clFlat[key];
                const rowBg = isDivergent
                  ? (i % 2 === 0 ? "#fff7ed" : "#fef3c7")
                  : (i % 2 === 0 ? "#ffffff" : "#f9fafb");

                return (
                  <tr key={key} style={{ background: rowBg }}>
                    <td style={{ padding: "6px 12px", borderBottom: "1px solid #f3f4f6", color: "#374151", fontWeight: isDivergent ? 700 : 400 }}>
                      {isDivergent && <span style={{ color: "#d97706", marginRight: 4 }}>⚠</span>}
                      {formatKey(key)}
                    </td>
                    <td style={{ padding: "6px 12px", borderBottom: "1px solid #f3f4f6", color: isDivergent ? "#1d4ed8" : "#374151", fontWeight: isDivergent ? 700 : 400 }}>
                      {dsVal !== undefined ? formatVal(dsVal) : <span style={{ color: "#9ca3af" }}>—</span>}
                    </td>
                    <td style={{ padding: "6px 12px", borderBottom: "1px solid #f3f4f6", color: isDivergent ? "#6d28d9" : "#374151", fontWeight: isDivergent ? 700 : 400 }}>
                      {clVal !== undefined ? formatVal(clVal) : <span style={{ color: "#9ca3af" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Summaries ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid #e5e7eb", borderTop: "none" }}>
          <div style={{ padding: "10px 14px", background: "#eff6ff", borderRight: "1px solid #e5e7eb" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>⚡ DeepSeek Summary</div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 11, color: "#1e3a5f", lineHeight: 1.5 }}>{deepseek_result.summary || "No summary."}</div>
          </div>
          <div style={{ padding: "10px 14px", background: "#f5f3ff" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "#7c3aed", marginBottom: 4 }}>◆ Claude Summary</div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 11, color: "#3b1f6b", lineHeight: 1.5 }}>{claude_result.summary || "No summary."}</div>
          </div>
        </div>

        {/* ── Choice buttons ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderRadius: "0 0 13px 13px", overflow: "hidden", border: "1px solid #e5e7eb", borderTop: "none" }}>
          <button
            onMouseEnter={() => setHovered("deepseek")}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChoose({ provider: "DeepSeek", result: deepseek_result })}
            style={{
              padding: "12px 16px", cursor: "pointer", border: "none", borderRight: "1px solid #e5e7eb",
              background: hovered === "deepseek" ? "#2563eb" : "#dbeafe",
              color: hovered === "deepseek" ? "#fff" : "#1d4ed8",
              fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            ⚡ Use DeepSeek Result
          </button>
          <button
            onMouseEnter={() => setHovered("claude")}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChoose({ provider: "Claude", result: claude_result })}
            style={{
              padding: "12px 16px", cursor: "pointer", border: "none",
              background: hovered === "claude" ? "#7c3aed" : "#ede9fe",
              color: hovered === "claude" ? "#fff" : "#6d28d9",
              fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            ◆ Use Claude Result
          </button>
        </div>
      </div>
    </div>
  );
}
