"use client";

import { useWorkspace } from "@/context/WorkspaceContext";

// â”€â”€â”€ Parity: "detailing" screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function DetailingPanel() {
  const { calcResult, goScreen } = useWorkspace();

  if (!calcResult) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0ece4" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "#8a7d72" }}>No detailing available.</div>
      </div>
    );
  }

  const payload = calcResult.detailingPayload;
  const elementName = typeof payload.element === "string"
    ? payload.element.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "Element Detailing";
  const today = new Date().toLocaleDateString("en-GB");
  const isSteel      = calcResult.module.startsWith("steel_");
  const themeColor   = isSteel ? "#1a3a5c" : "#1a4a8a";
  const verdict      = calcResult.results.verdict;
  const verdictColor = verdict === "pass" ? "var(--grn)" : verdict === "warn" ? "var(--amb)" : "var(--red)";
  const verdictText  = verdict === "pass" ? "PASS ✓" : verdict === "warn" ? "WARN ⚠" : "FAIL ✗";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f0ece4", overflow: "hidden" }}>

      {/* Status bar */}
      <div className="sb" style={{ background: themeColor, color: "#fff" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>9:41</span>
        <span style={{ fontSize: 11 }}>â—â—â— ðŸ”‹</span>
      </div>

      {/* Blue header */}
      <div style={{ background: themeColor, padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexShrink: 0 }}>
        <button
          onClick={() => goScreen("report")}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", padding: "6px 12px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
        >
          â€¹ Report
        </button>
        <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
          <div style={{ fontFamily: "var(--ser)", fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Element Detailing
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "rgba(200,150,12,.8)", marginTop: 1, letterSpacing: ".4px" }}>
            SSAD Â· BAE Consulting Engineers
          </div>
        </div>
        <button
          onClick={() => alert("PDF export in production build")}
          style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, background: "rgba(200,150,12,.2)", border: "1.5px solid rgba(200,150,12,.5)", color: "rgba(200,150,12,.95)", padding: "6px 11px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          PDF
        </button>
      </div>

      {/* Scrollable content */}
      <div className="scr" style={{ background: "var(--bg2)", padding: "12px 14px 28px" }}>

        {/* Info strip */}
        <div style={{ background: "#fff", border: "1px solid var(--bdr)", borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: "var(--ser)", fontSize: 13, fontWeight: 700, color: "var(--txt)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {elementName}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--mut)", marginTop: 2 }}>
              Code: {calcResult.code} Â· Module: {calcResult.module}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: verdictColor }}>
              {verdictText}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--dim)", marginTop: 1 }}>{today}</div>
          </div>
        </div>

        {/* Disclaimer strip */}
        <div style={{ background: "rgba(200,150,12,.07)", border: "1px solid rgba(200,150,12,.2)", borderRadius: 8, padding: "7px 12px", marginBottom: 12, fontFamily: "var(--mono)", fontSize: 9, color: "var(--mut)", lineHeight: 1.5 }}>
          âš ï¸ Schematic sketches for site verification only Â· Confirm bar placement and cover before pour Â· Not for issue as a construction drawing without engineer certification
        </div>

        {/* Element schematic drawings */}
        <ElementSchematic payload={payload} />

        {/* Footer */}
        <div style={{ marginTop: 16, textAlign: "center", fontFamily: "var(--mono)", fontSize: 8, color: "var(--dim)", lineHeight: 1.8 }}>
          Generated by SSAD v1.0 Â· BAE Consulting Engineers Â· CEng MIStructE
        </div>

      </div>

      {/* Bottom nav */}
      <div className="bnav">
        <div className="bni" onClick={() => goScreen("workspace")} role="button" tabIndex={0}>
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/>
            </svg>
          </div>
          <span>Home</span>
        </div>
        <div className="bni on">
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
          <span>Detailing</span>
        </div>
        <div className="bni" onClick={() => goScreen("report")} role="button" tabIndex={0}>
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
            </svg>
          </div>
          <span>Report</span>
        </div>
        <div className="bni" onClick={() => goScreen("projects")} role="button" tabIndex={0}>
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 7h18M3 12h18M3 17h18"/>
            </svg>
          </div>
          <span>Projects</span>
        </div>
      </div>

    </div>
  );
}

    // â”€â”€â”€ Schematic router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function ElementSchematic({ payload }: { payload: Record<string, unknown> }) {
      const element = typeof payload.element === "string" ? payload.element : "";

      if (element === "rc_beam") return <RcBeamSchematic p={payload} />;
      if (element === "rc_column") return <RcColumnSchematic p={payload} />;
      if (element === "rc_pad_footing") return <RcFoundationSchematic p={payload} />;
      if (element.startsWith("rc_slab")) return <RcSlabSchematic p={payload} />;
      if (element === "steel_beam") return <SteelBeamSchematic p={payload} />;
      if (element === "steel_column") return <SteelColumnSchematic p={payload} />;
      if (element === "steel_portal_frame") return <PortalFrameSchematic p={payload} />;
      if (element === "steel_truss") return <TrussSchematic p={payload} />;
      return <GenericSchematic p={payload} />;
    }

    // â”€â”€â”€ RC Beam â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function RcBeamSchematic({ p }: { p: Record<string, unknown> }) {
      const dim = (p.dimensions ?? {}) as Record<string, number>;
      const rein = (p.reinforcement ?? {}) as Record<string, unknown>;
      const b = dim.b_mm ?? 200;
      const h = dim.h_mm ?? 400;
      const d = dim.d_mm ?? h * 0.9;
      const cover = (p.cover_mm as number) ?? 40;
      const span = dim.span_m ?? 5;
      const tensionZone = (rein.tension_zone as string) ?? "bottom";
      const asReq = rein.as_design_mm2 as number | undefined;
      const compSteel = rein.compression_steel as boolean | undefined;

      // SVG canvas: cross-section 200 wide, elevation 400 wide
      const W = 160; const H = 240;
      const scale = Math.min(W / b, H / h) * 0.7;
      const bPx = b * scale; const hPx = h * scale;
      const coverPx = cover * scale;
      const dPx = d * scale;
      const cx = 100; const cy = 130;
      const left = cx - bPx / 2; const top = cy - hPx / 2;
      const steelY = tensionZone === "bottom" ? top + hPx - coverPx - 6 : top + coverPx + 6;
      const compY = tensionZone === "bottom" ? top + coverPx + 6 : top + hPx - coverPx - 6;

      return (
        <div className="mb-6 space-y-4">
          <div className="flex gap-6 flex-wrap">
            {/* Cross-section */}
            <div className="flex-1 min-w-[200px]">
              <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Cross-Section</p>
              <svg viewBox="0 0 200 260" style={{ width: "100%", maxWidth: "220px", border: "1px solid var(--bdr)", borderRadius: 8, background: "#fff" }}>
                {/* Concrete outline */}
                <rect x={left} y={top} width={bPx} height={hPx} fill="#94a3b8" fillOpacity={0.15} stroke="#94a3b8" strokeWidth={1.5} />
                {/* Cover lines */}
                <rect x={left + coverPx} y={top + coverPx} width={bPx - 2 * coverPx} height={hPx - 2 * coverPx}
                  fill="none" stroke="#64748b" strokeWidth={0.5} strokeDasharray="3 2" />
                {/* Tension steel bars */}
                <circle cx={left + coverPx + 8} cy={steelY} r={5} fill="#f59e0b" />
                <circle cx={cx} cy={steelY} r={5} fill="#f59e0b" />
                <circle cx={left + bPx - coverPx - 8} cy={steelY} r={5} fill="#f59e0b" />
                {/* Compression steel if needed */}
                {compSteel && (
                  <>
                    <circle cx={left + coverPx + 8} cy={compY} r={4} fill="#a78bfa" />
                    <circle cx={left + bPx - coverPx - 8} cy={compY} r={4} fill="#a78bfa" />
                  </>
                )}
                {/* Link */}
                <rect x={left + coverPx} y={top + coverPx} width={bPx - 2 * coverPx} height={hPx - 2 * coverPx}
                  fill="none" stroke="#6366f1" strokeWidth={1.5} />
                {/* Dimension labels */}
                <text x={cx} y={top - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">{b} mm</text>
                <text x={left - 6} y={cy} textAnchor="end" fontSize={9} fill="#94a3b8" transform={`rotate(-90,${left - 6},${cy})`}>{h} mm</text>
                {/* d dimension */}
                <line x1={left + bPx + 4} y1={top} x2={left + bPx + 4} y2={steelY} stroke="#22d3ee" strokeWidth={0.75} />
                <text x={left + bPx + 14} y={(top + steelY) / 2} fontSize={8} fill="#22d3ee">d={d.toFixed(0)}</text>
              </svg>
            </div>
            {/* Key data */}
            <div className="flex-1 min-w-[180px] space-y-2">
              <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Key Data</p>
              <KeyValueList rows={[
                ["b Ã— h", `${b} Ã— ${h} mm`],
                ["Effective depth d", `${d.toFixed(0)} mm`],
                ["Cover", `${cover} mm`],
                ["Span", `${span} m`],
                ["As,design", asReq != null ? `${asReq} mmÂ²` : "â€”"],
                ["Tension zone", tensionZone],
                ["Compression steel", compSteel ? "Required" : "Not required"],
              ]} />
            </div>
          </div>
        </div>
      );
    }

    // â”€â”€â”€ RC Column â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function RcColumnSchematic({ p }: { p: Record<string, unknown> }) {
      const dim = (p.dimensions ?? {}) as Record<string, number>;
      const rein = (p.reinforcement ?? {}) as Record<string, unknown>;
      const b = dim.b_mm ?? 300;
      const h = dim.h_mm ?? 300;
      const cover = dim.cover_mm ?? 40;
      const Asc = rein.Asc_design_mm2 as number | undefined;

      const W = 180; const H = 180;
      const scale = Math.min(W / b, H / h) * 0.7;
      const bPx = b * scale; const hPx = h * scale;
      const coverPx = cover * scale;
      const cx = 100; const cy = 100;
      const left = cx - bPx / 2; const top = cy - hPx / 2;

      const corners = [
        [left + coverPx, top + coverPx],
        [left + bPx - coverPx, top + coverPx],
        [left + bPx - coverPx, top + hPx - coverPx],
        [left + coverPx, top + hPx - coverPx],
      ] as [number, number][];

      return (
        <div className="mb-6 flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Cross-Section</p>
            <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: "200px", border: "1px solid var(--bdr)", borderRadius: 8, background: "#fff" }}>
              <rect x={left} y={top} width={bPx} height={hPx} fill="#94a3b8" fillOpacity={0.15} stroke="#94a3b8" strokeWidth={1.5} />
              <rect x={left + coverPx} y={top + coverPx} width={bPx - 2 * coverPx} height={hPx - 2 * coverPx}
                fill="none" stroke="#64748b" strokeWidth={0.5} strokeDasharray="3 2" />
              {corners.map(([sx, sy], i) => (
                <circle key={i} cx={sx} cy={sy} r={5} fill="#f59e0b" />
              ))}
              <text x={cx} y={top - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">{b} mm</text>
              <text x={cx} y={top + hPx + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">{h} mm</text>
            </svg>
          </div>
          <div className="flex-1 min-w-[180px] space-y-2">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Key Data</p>
            <KeyValueList rows={[
              ["b Ã— h", `${b} Ã— ${h} mm`],
              ["Cover", `${cover} mm`],
              ["Asc,design", Asc != null ? `${Asc} mmÂ²` : "â€”"],
            ]} />
          </div>
        </div>
      );
    }

    // â”€â”€â”€ RC Slab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function RcSlabSchematic({ p }: { p: Record<string, unknown> }) {
      const dim = (p.dimensions ?? {}) as Record<string, unknown>;
      const rein = (p.reinforcement ?? {}) as Record<string, unknown>;
      const h = (dim.h_mm as number) ?? 200;
      const span = (dim.span_m as number) ?? 5;
      const lx = (dim.lx_m as number) ?? span;
      const ly = (dim.ly_m as number) ?? 0;
      const cover = (p.cover_mm as number) ?? 25;
      const mainAs = (rein.main_As_mm2_per_m ?? rein.short_span_Asx_mm2_per_m) as number | undefined;

      // Simple elevation: rectangle showing slab thickness
      const slabW = 220; const slabH = Math.max(20, Math.min(60, h * 0.15));
      const viewH = slabH + 60;
      const slabY = 30;

      return (
        <div className="mb-6 flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Elevation (Section)</p>
            <svg viewBox={`0 0 260 ${viewH}`} style={{ width: "100%", maxWidth: "280px", border: "1px solid var(--bdr)", borderRadius: 8, background: "#fff" }}>
              <rect x={20} y={slabY} width={slabW} height={slabH} fill="#94a3b8" fillOpacity={0.18} stroke="#94a3b8" strokeWidth={1.5} />
              {/* Main steel line */}
              <line x1={30} y1={slabY + slabH - cover * 0.15 - 3} x2={230} y2={slabY + slabH - cover * 0.15 - 3}
                stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" />
              {/* h dimension */}
              <line x1={240} y1={slabY} x2={240} y2={slabY + slabH} stroke="#94a3b8" strokeWidth={0.75} />
              <text x={250} y={slabY + slabH / 2 + 3} fontSize={9} fill="#94a3b8">h={h}</text>
              {/* span label */}
              <line x1={20} y1={slabY + slabH + 12} x2={240} y2={slabY + slabH + 12} stroke="#64748b" strokeWidth={0.75} markerEnd="url(#arrow)" />
              <text x={130} y={slabY + slabH + 24} textAnchor="middle" fontSize={9} fill="#64748b">lx = {lx} m</text>
              {ly > 0 && (
                <text x={130} y={slabY + slabH + 36} textAnchor="middle" fontSize={8} fill="#64748b">ly = {ly} m</text>
              )}
            </svg>
          </div>
          <div className="flex-1 min-w-[180px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Key Data</p>
            <KeyValueList rows={[
              ["Thickness h", `${h} mm`],
              ["Span lx", `${lx} m`],
              ...(ly > 0 ? [["Long span ly", `${ly} m`]] as [string, string][] : []),
              ["Cover", `${cover} mm`],
              ["Main As", mainAs != null ? `${mainAs} mmÂ²/m` : "â€”"],
            ]} />
          </div>
        </div>
      );
    }

    // â”€â”€â”€ RC Foundation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function RcFoundationSchematic({ p }: { p: Record<string, unknown> }) {
      const dim = (p.dimensions ?? {}) as Record<string, number>;
      const rein = (p.reinforcement ?? {}) as Record<string, unknown>;
      const L = dim.L_m ?? 1.5;
      const B = dim.B_m ?? 1.5;
      const h = dim.h_mm ?? 400;
      const cover = dim.cover_mm ?? 50;
      const AsL = rein.L_dir_As_mm2_per_m as number | undefined;
      const AsB = rein.B_dir_As_mm2_per_m as number | undefined;

      const LPx = Math.min(160, L * 40); const BPx = Math.min(120, B * 40);
      const cx = 120; const cy = 100;

      return (
        <div className="mb-6 flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Plan View</p>
            <svg viewBox="0 0 240 200" style={{ width: "100%", maxWidth: "240px", border: "1px solid var(--bdr)", borderRadius: 8, background: "#fff" }}>
              <rect x={cx - LPx / 2} y={cy - BPx / 2} width={LPx} height={BPx}
                fill="#94a3b8" fillOpacity={0.18} stroke="#94a3b8" strokeWidth={1.5} />
              {/* Steel grid lines */}
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={`lx${f}`} x1={cx - LPx / 2 + LPx * f} y1={cy - BPx / 2 + 8}
                  x2={cx - LPx / 2 + LPx * f} y2={cy + BPx / 2 - 8} stroke="#f59e0b" strokeWidth={1} />
              ))}
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={`by${f}`} x1={cx - LPx / 2 + 8} y1={cy - BPx / 2 + BPx * f}
                  x2={cx + LPx / 2 - 8} y2={cy - BPx / 2 + BPx * f} stroke="#22d3ee" strokeWidth={1} />
              ))}
              {/* Column stub */}
              <rect x={cx - 12} y={cy - 12} width={24} height={24} fill="#6366f1" fillOpacity={0.4} stroke="#6366f1" strokeWidth={1} />
              <text x={cx} y={cy - BPx / 2 - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">L = {L} m</text>
              <text x={cx + LPx / 2 + 12} y={cy + 3} fontSize={9} fill="#94a3b8">B = {B} m</text>
            </svg>
          </div>
          <div className="flex-1 min-w-[180px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Key Data</p>
            <KeyValueList rows={[
              ["L Ã— B", `${L} Ã— ${B} m`],
              ["Depth h", `${h} mm`],
              ["Cover", `${cover} mm`],
              ["As (L-dir)", AsL != null ? `${AsL} mmÂ²/m` : "â€”"],
              ["As (B-dir)", AsB != null ? `${AsB} mmÂ²/m` : "â€”"],
            ]} />
          </div>
        </div>
      );
    }

    // â”€â”€â”€ Steel Beam â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function SteelBeamSchematic({ p }: { p: Record<string, unknown> }) {
      const span = (p.span_m as number) ?? 6;
      const secClass = p.section_class as string | undefined;
      const shear = (p.shear ?? {}) as Record<string, number>;
      const moment = (p.moment ?? {}) as Record<string, number>;

      return (
        <div className="mb-6 flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Section Profile</p>
            <svg viewBox="0 0 200 160" style={{ width: "100%", maxWidth: "220px", border: "1px solid var(--bdr)", borderRadius: 8, background: "#fff" }}>
              {/* I-section */}
              <ISection cx={100} cy={80} fw={70} fh={10} wh={60} wt={8} />
            </svg>
          </div>
          <div className="flex-1 min-w-[180px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Key Data</p>
            <KeyValueList rows={[
              ["Span", `${span} m`],
              ["Section class", secClass ?? "â€”"],
              ["Mc,Rd", moment.Mc_kNm != null ? `${moment.Mc_kNm} kNÂ·m` : "â€”"],
              ["Pv", shear.Pv_kN != null ? `${shear.Pv_kN} kN` : "â€”"],
            ]} />
          </div>
        </div>
      );
    }

    // â”€â”€â”€ Steel Column â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function SteelColumnSchematic({ p }: { p: Record<string, unknown> }) {
      const ley = (p.le_y_m as number) ?? 3;
      const lez = (p.le_z_m as number) ?? 3;
      const Pc = (p.Pc_kN as number) ?? 0;
      const pc = (p.pc_Nmm2 as number) ?? 0;
      const py = (p.py_Nmm2 as number) ?? 275;

      return (
        <div className="mb-6 flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Section Profile</p>
            <svg viewBox="0 0 200 160" style={{ width: "100%", maxWidth: "200px", border: "1px solid var(--bdr)", borderRadius: 8, background: "#fff" }}>
              <ISection cx={100} cy={80} fw={70} fh={10} wh={60} wt={8} />
            </svg>
          </div>
          <div className="flex-1 min-w-[180px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Key Data</p>
            <KeyValueList rows={[
              ["le,y", `${ley} m`],
              ["le,z", `${lez} m`],
              ["py", `${py} N/mmÂ²`],
              ["pc", `${pc} N/mmÂ²`],
              ["Pc", `${Pc} kN`],
            ]} />
          </div>
        </div>
      );
    }

    // â”€â”€â”€ Portal Frame â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function PortalFrameSchematic({ p }: { p: Record<string, unknown> }) {
      const span = (p.span_m as number) ?? 20;
      const height = (p.height_m as number) ?? 6;
      const baseType = (p.base_type as string) ?? "pinned";
      const Meaves = (p.M_eaves_kNm as number) ?? 0;

      const W = 220; const H = 160;
      const scaleX = (W - 40) / span; const scaleY = (H - 40) / height;
      const sc = Math.min(scaleX, scaleY);
      const spanPx = span * sc; const heightPx = height * sc;
      const ox = (W - spanPx) / 2; const groundY = H - 20;

      // Portal: left column, right column, left rafter, right rafter
      const lBase = [ox, groundY] as [number, number];
      const rBase = [ox + spanPx, groundY] as [number, number];
      const lEave = [ox, groundY - heightPx] as [number, number];
      const rEave = [ox + spanPx, groundY - heightPx] as [number, number];
      const ridge = [ox + spanPx / 2, groundY - heightPx - 20] as [number, number];

      return (
        <div className="mb-6 flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Frame Elevation</p>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: "260px", border: "1px solid var(--bdr)", borderRadius: 8, background: "#fff" }}>
              {/* Ground */}
              <line x1={ox - 15} y1={groundY} x2={ox + spanPx + 15} y2={groundY} stroke="#64748b" strokeWidth={1.5} />
              {/* Columns */}
              <line x1={lBase[0]} y1={lBase[1]} x2={lEave[0]} y2={lEave[1]} stroke="#6366f1" strokeWidth={3} />
              <line x1={rBase[0]} y1={rBase[1]} x2={rEave[0]} y2={rEave[1]} stroke="#6366f1" strokeWidth={3} />
              {/* Rafters */}
              <line x1={lEave[0]} y1={lEave[1]} x2={ridge[0]} y2={ridge[1]} stroke="#f59e0b" strokeWidth={2.5} />
              <line x1={rEave[0]} y1={rEave[1]} x2={ridge[0]} y2={ridge[1]} stroke="#f59e0b" strokeWidth={2.5} />
              {/* Base symbols */}
              {baseType === "pinned" ? (
                <>
                  <polygon points={`${lBase[0]},${lBase[1]} ${lBase[0] - 8},${lBase[1] + 12} ${lBase[0] + 8},${lBase[1] + 12}`} fill="none" stroke="#94a3b8" strokeWidth={1} />
                  <polygon points={`${rBase[0]},${rBase[1]} ${rBase[0] - 8},${rBase[1] + 12} ${rBase[0] + 8},${rBase[1] + 12}`} fill="none" stroke="#94a3b8" strokeWidth={1} />
                </>
              ) : (
                <>
                  <rect x={lBase[0] - 8} y={lBase[1]} width={16} height={10} fill="#94a3b8" fillOpacity={0.4} stroke="#94a3b8" strokeWidth={1} />
                  <rect x={rBase[0] - 8} y={rBase[1]} width={16} height={10} fill="#94a3b8" fillOpacity={0.4} stroke="#94a3b8" strokeWidth={1} />
                </>
              )}
              {/* Labels */}
              <text x={ox + spanPx / 2} y={groundY + 14} textAnchor="middle" fontSize={9} fill="#64748b">span = {span} m</text>
              <text x={ox - 20} y={groundY - heightPx / 2} textAnchor="end" fontSize={9} fill="#64748b">{height} m</text>
            </svg>
          </div>
          <div className="flex-1 min-w-[180px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Key Data</p>
            <KeyValueList rows={[
              ["Span", `${span} m`],
              ["Eaves height", `${height} m`],
              ["Base type", baseType],
              ["M,eaves", `${Meaves} kNÂ·m`],
            ]} />
          </div>
        </div>
      );
    }

    // â”€â”€â”€ Steel Truss â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function TrussSchematic({ p }: { p: Record<string, unknown> }) {
      const span = (p.span_m as number) ?? 10;
      const depth = (p.truss_depth_m as number) ?? (span / 10);
      const panels = Math.min(Math.max(4, Math.round(span / 2)), 8);

      const W = 220; const H = 100;
      const panelW = (W - 20) / panels; const depthPx = Math.max(20, depth * 8);
      const topY = 20; const botY = topY + depthPx;
      const ox = 10;

      return (
        <div className="mb-6 flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Truss Elevation (Pratt)</p>
            <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: "100%", maxWidth: "260px", border: "1px solid var(--bdr)", borderRadius: 8, background: "#fff" }}>
              {/* Top chord */}
              <line x1={ox} y1={topY} x2={ox + panelW * panels} y2={topY} stroke="#6366f1" strokeWidth={2.5} />
              {/* Bottom chord */}
              <line x1={ox} y1={botY} x2={ox + panelW * panels} y2={botY} stroke="#6366f1" strokeWidth={2.5} />
              {/* Diagonals + verticals */}
              {Array.from({ length: panels + 1 }).map((_, i) => (
                <line key={`v${i}`} x1={ox + i * panelW} y1={topY} x2={ox + i * panelW} y2={botY} stroke="#94a3b8" strokeWidth={1} />
              ))}
              {Array.from({ length: panels }).map((_, i) => (
                <line key={`d${i}`}
                  x1={ox + i * panelW} y1={i % 2 === 0 ? botY : topY}
                  x2={ox + (i + 1) * panelW} y2={i % 2 === 0 ? topY : botY}
                  stroke="#f59e0b" strokeWidth={1.2} />
              ))}
              <text x={ox + (panelW * panels) / 2} y={botY + 16} textAnchor="middle" fontSize={9} fill="#64748b">span = {span} m</text>
            </svg>
          </div>
          <div className="flex-1 min-w-[180px]">
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Key Data</p>
            <KeyValueList rows={Object.entries(p)
              .filter(([k]) => k !== "element")
              .map(([k, v]) => [k.replace(/_/g, " "), String(v)] as [string, string])} />
          </div>
        </div>
      );
    }

    // â”€â”€â”€ Generic fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function GenericSchematic({ p }: { p: Record<string, unknown> }) {
      return (
        <div className="mb-6">
          <p style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Detailing Data</p>
          <KeyValueList rows={Object.entries(p).map(([k, v]) => [
            k.replace(/_/g, " "),
            typeof v === "object" ? JSON.stringify(v) : String(v ?? "â€”"),
          ] as [string, string])} />
        </div>
      );
    }

    // â”€â”€â”€ Shared helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function ISection({
      cx, cy, fw, fh, wh, wt,
    }: { cx: number; cy: number; fw: number; fh: number; wh: number; wt: number }) {
      const top = cy - wh / 2 - fh;
      return (
        <g fill="#6366f1" fillOpacity={0.3} stroke="#6366f1" strokeWidth={1.2}>
          {/* Top flange */}
          <rect x={cx - fw / 2} y={top} width={fw} height={fh} />
          {/* Web */}
          <rect x={cx - wt / 2} y={top + fh} width={wt} height={wh} />
          {/* Bottom flange */}
          <rect x={cx - fw / 2} y={top + fh + wh} width={fw} height={fh} />
        </g>
      );
    }

    function KeyValueList({ rows }: { rows: [string, string][] }) {
      return (
        <div style={{ border: "1px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}>
          {rows.map(([k, v], i) => (
            <div key={k} style={{ display: "flex", alignItems: "baseline", padding: "6px 12px", gap: 12, background: i % 2 === 0 ? "#fff" : "var(--bg2)", borderBottom: i < rows.length - 1 ? "1px solid var(--bdr)" : "none" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--mut)", minWidth: "8rem", flexShrink: 0, textTransform: "capitalize" }}>{k}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt)", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      );
    }

