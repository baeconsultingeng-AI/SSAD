"use client";

import { useWorkspace } from "@/context/WorkspaceContext";

// ─── Parity: "detailing" screen ──────────────────────────

export default function DetailingPanel() {
  const { calcResult, goScreen } = useWorkspace();

  if (!calcResult) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        No detailing available.
      </div>
    );
  }

  const payload = calcResult.detailingPayload;

  return (
    <div className="p-6 max-w-3xl mx-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-text">Structural Detailing</h1>
        <button
          onClick={() => goScreen("report")}
          className="text-sm text-text-muted hover:text-text transition-colors"
        >
          ← Report
        </button>
      </div>

      {/* Detailing canvas placeholder */}
      {/* Element schematic */}
      <ElementSchematic payload={payload} />

      <button
        onClick={goScreen.bind(null, "workspace")}
        className="mt-6 px-4 py-2 text-text-muted text-sm hover:text-text transition-colors"
      >
        Back to Workspace
      </button>
    </div>
  );
}

    // ─── Schematic router ────────────────────────────────────

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

    // ─── RC Beam ─────────────────────────────────────────────

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
              <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Cross-Section</p>
              <svg viewBox="0 0 200 260" className="w-full max-w-[220px] border border-border rounded-lg bg-surface-card">
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
              <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Key Data</p>
              <KeyValueList rows={[
                ["b × h", `${b} × ${h} mm`],
                ["Effective depth d", `${d.toFixed(0)} mm`],
                ["Cover", `${cover} mm`],
                ["Span", `${span} m`],
                ["As,design", asReq != null ? `${asReq} mm²` : "—"],
                ["Tension zone", tensionZone],
                ["Compression steel", compSteel ? "Required" : "Not required"],
              ]} />
            </div>
          </div>
        </div>
      );
    }

    // ─── RC Column ───────────────────────────────────────────

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
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Cross-Section</p>
            <svg viewBox="0 0 200 200" className="w-full max-w-[200px] border border-border rounded-lg bg-surface-card">
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
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Key Data</p>
            <KeyValueList rows={[
              ["b × h", `${b} × ${h} mm`],
              ["Cover", `${cover} mm`],
              ["Asc,design", Asc != null ? `${Asc} mm²` : "—"],
            ]} />
          </div>
        </div>
      );
    }

    // ─── RC Slab ─────────────────────────────────────────────

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
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Elevation (Section)</p>
            <svg viewBox={`0 0 260 ${viewH}`} className="w-full max-w-[280px] border border-border rounded-lg bg-surface-card">
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
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Key Data</p>
            <KeyValueList rows={[
              ["Thickness h", `${h} mm`],
              ["Span lx", `${lx} m`],
              ...(ly > 0 ? [["Long span ly", `${ly} m`]] as [string, string][] : []),
              ["Cover", `${cover} mm`],
              ["Main As", mainAs != null ? `${mainAs} mm²/m` : "—"],
            ]} />
          </div>
        </div>
      );
    }

    // ─── RC Foundation ───────────────────────────────────────

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
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Plan View</p>
            <svg viewBox="0 0 240 200" className="w-full max-w-[240px] border border-border rounded-lg bg-surface-card">
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
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Key Data</p>
            <KeyValueList rows={[
              ["L × B", `${L} × ${B} m`],
              ["Depth h", `${h} mm`],
              ["Cover", `${cover} mm`],
              ["As (L-dir)", AsL != null ? `${AsL} mm²/m` : "—"],
              ["As (B-dir)", AsB != null ? `${AsB} mm²/m` : "—"],
            ]} />
          </div>
        </div>
      );
    }

    // ─── Steel Beam ──────────────────────────────────────────

    function SteelBeamSchematic({ p }: { p: Record<string, unknown> }) {
      const span = (p.span_m as number) ?? 6;
      const secClass = p.section_class as string | undefined;
      const shear = (p.shear ?? {}) as Record<string, number>;
      const moment = (p.moment ?? {}) as Record<string, number>;

      return (
        <div className="mb-6 flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Section Profile</p>
            <svg viewBox="0 0 200 160" className="w-full max-w-[220px] border border-border rounded-lg bg-surface-card">
              {/* I-section */}
              <ISection cx={100} cy={80} fw={70} fh={10} wh={60} wt={8} />
            </svg>
          </div>
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Key Data</p>
            <KeyValueList rows={[
              ["Span", `${span} m`],
              ["Section class", secClass ?? "—"],
              ["Mc,Rd", moment.Mc_kNm != null ? `${moment.Mc_kNm} kN·m` : "—"],
              ["Pv", shear.Pv_kN != null ? `${shear.Pv_kN} kN` : "—"],
            ]} />
          </div>
        </div>
      );
    }

    // ─── Steel Column ────────────────────────────────────────

    function SteelColumnSchematic({ p }: { p: Record<string, unknown> }) {
      const ley = (p.le_y_m as number) ?? 3;
      const lez = (p.le_z_m as number) ?? 3;
      const Pc = (p.Pc_kN as number) ?? 0;
      const pc = (p.pc_Nmm2 as number) ?? 0;
      const py = (p.py_Nmm2 as number) ?? 275;

      return (
        <div className="mb-6 flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Section Profile</p>
            <svg viewBox="0 0 200 160" className="w-full max-w-[200px] border border-border rounded-lg bg-surface-card">
              <ISection cx={100} cy={80} fw={70} fh={10} wh={60} wt={8} />
            </svg>
          </div>
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Key Data</p>
            <KeyValueList rows={[
              ["le,y", `${ley} m`],
              ["le,z", `${lez} m`],
              ["py", `${py} N/mm²`],
              ["pc", `${pc} N/mm²`],
              ["Pc", `${Pc} kN`],
            ]} />
          </div>
        </div>
      );
    }

    // ─── Portal Frame ────────────────────────────────────────

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
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Frame Elevation</p>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[260px] border border-border rounded-lg bg-surface-card">
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
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Key Data</p>
            <KeyValueList rows={[
              ["Span", `${span} m`],
              ["Eaves height", `${height} m`],
              ["Base type", baseType],
              ["M,eaves", `${Meaves} kN·m`],
            ]} />
          </div>
        </div>
      );
    }

    // ─── Steel Truss ─────────────────────────────────────────

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
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Truss Elevation (Pratt)</p>
            <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full max-w-[260px] border border-border rounded-lg bg-surface-card">
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
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Key Data</p>
            <KeyValueList rows={Object.entries(p)
              .filter(([k]) => k !== "element")
              .map(([k, v]) => [k.replace(/_/g, " "), String(v)] as [string, string])} />
          </div>
        </div>
      );
    }

    // ─── Generic fallback ────────────────────────────────────

    function GenericSchematic({ p }: { p: Record<string, unknown> }) {
      return (
        <div className="mb-6">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2 font-semibold">Detailing Data</p>
          <KeyValueList rows={Object.entries(p).map(([k, v]) => [
            k.replace(/_/g, " "),
            typeof v === "object" ? JSON.stringify(v) : String(v ?? "—"),
          ] as [string, string])} />
        </div>
      );
    }

    // ─── Shared helpers ───────────────────────────────────────

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
        <div className="rounded border border-border overflow-hidden divide-y divide-border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline px-3 py-1.5 gap-3 bg-surface-card">
              <span className="text-xs text-text-muted flex-shrink-0 capitalize" style={{ minWidth: "8rem" }}>{k}</span>
              <span className="text-sm text-text font-medium">{v}</span>
            </div>
          ))}
        </div>
      );
    }
