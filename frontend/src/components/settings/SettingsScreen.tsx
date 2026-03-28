"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";

// ─── Persisted app settings ────────────────────────────────────────────────
const SETTINGS_KEY = "ssad_settings_v2";

export interface SlabDefaults    { depth: string; span: string; fcu: string; fy: string; cover: string; }
export interface BeamDefaults    { width: string; depth: string; fcu: string; fy: string; cover: string; }
export interface ColumnDefaults  { length: string; breadth: string; fcu: string; fy: string; cover: string; }
export interface FoundationDefaults { length: string; breadth: string; depth: string; fcu: string; fy: string; cover: string; }
export interface StaircaseDefaults  { waistDepth: string; riserHeight: string; treadWidth: string; fcu: string; fy: string; }
export interface RetainingWallDefaults { height: string; thickness: string; fcu: string; fy: string; cover: string; }

export interface DesignSettings {
  rcCode: string;
  steelCode: string;
  slab:         SlabDefaults;
  beam:         BeamDefaults;
  column:       ColumnDefaults;
  foundation:   FoundationDefaults;
  staircase:    StaircaseDefaults;
  retainingWall: RetainingWallDefaults;
}

export interface AppSettings {
  design: DesignSettings;
}

const BLANK: AppSettings = {
  design: {
    rcCode:    "BS",
    steelCode: "BS",
    slab:         { depth: "200",  span: "5000",   fcu: "25", fy: "460", cover: "25" },
    beam:         { width: "300",  depth: "600",    fcu: "25", fy: "460", cover: "25" },
    column:       { length: "300", breadth: "300",  fcu: "25", fy: "460", cover: "40" },
    foundation:   { length: "1500", breadth: "1500", depth: "350", fcu: "25", fy: "460", cover: "50" },
    staircase:    { waistDepth: "175", riserHeight: "175", treadWidth: "250", fcu: "25", fy: "460" },
    retainingWall:{ height: "3000", thickness: "300", fcu: "25", fy: "460", cover: "40" },
  },
};

export function getAppSettings(): AppSettings {
  if (typeof window === "undefined") return BLANK;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return BLANK;
    const p = JSON.parse(raw) as Partial<AppSettings>;
    const d: Partial<DesignSettings> = p.design ?? {};
    return {
      design: {
        rcCode:       (d.rcCode    ?? BLANK.design.rcCode),
        steelCode:    (d.steelCode ?? BLANK.design.steelCode),
        slab:         { ...BLANK.design.slab,         ...(d.slab         ?? {}) },
        beam:         { ...BLANK.design.beam,         ...(d.beam         ?? {}) },
        column:       { ...BLANK.design.column,       ...(d.column       ?? {}) },
        foundation:   { ...BLANK.design.foundation,   ...(d.foundation   ?? {}) },
        staircase:    { ...BLANK.design.staircase,    ...(d.staircase    ?? {}) },
        retainingWall:{ ...BLANK.design.retainingWall,...(d.retainingWall ?? {}) },
      },
    };
  } catch { return BLANK; }
}

function persist(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ─── UI helpers ────────────────────────────────────────────────────────────
function FieldRow({ label, unit, value, onChange }: { label: string; unit?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 3, letterSpacing: ".4px" }}>
        {label}{unit ? <span style={{ color: "#b0a89e" }}> ({unit})</span> : null}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: "1px solid #ddd8cf", background: "#faf7f4", fontFamily: "var(--mono)", fontSize: 14, color: "#1a1410", outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

function ChipGroup({ options, value, onChange }: { options: { id: string; label: string; available: boolean }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button key={o.id} disabled={!o.available} onClick={() => o.available && onChange(o.id)}
            style={{ padding: "5px 12px", borderRadius: 20, border: active ? "1.5px solid #1a4a8a" : "1px solid #ddd8cf", background: active ? "rgba(26,74,138,.08)" : o.available ? "#fff" : "#f8f5f0", color: active ? "#1a4a8a" : o.available ? "#3d3229" : "#c0b8ae", fontFamily: "var(--mono)", fontSize: 13, fontWeight: active ? 700 : 400, cursor: o.available ? "pointer" : "default", display: "flex", alignItems: "center", gap: 4 }}
          >
            {o.label}
            {!o.available && <span style={{ fontSize: 10, background: "#e8e0d6", borderRadius: 4, padding: "1px 4px", color: "#8a7d72", fontWeight: 700 }}>SOON</span>}
          </button>
        );
      })}
    </div>
  );
}

function SaveBanner({ show }: { show: boolean }) {
  return (
    <div style={{ position: "fixed", bottom: 64, left: "50%", transform: show ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(20px)", background: "#15803d", color: "#fff", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, padding: "8px 18px", borderRadius: 20, pointerEvents: "none", opacity: show ? 1 : 0, transition: "opacity .25s, transform .25s", zIndex: 999, letterSpacing: ".3px" }}>
      ✓ Settings saved
    </div>
  );
}

// ─── 3D tilt card wrapper ──────────────────────────────────────────────────
function Card3D({ children, style, maxTilt = 3, glareOpacity = 0.06 }: { children: React.ReactNode; style?: React.CSSProperties; maxTilt?: number; glareOpacity?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, glareX: 50, glareY: 50 });
  const [active, setActive] = useState(false);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width; const y = (e.clientY - top) / height;
    setTilt({ rotX: -(y - 0.5) * maxTilt * 2, rotY: (x - 0.5) * maxTilt * 2, glareX: x * 100, glareY: y * 100 });
    setActive(true);
  }, [maxTilt]);
  const onLeave = useCallback(() => { setTilt({ rotX: 0, rotY: 0, glareX: 50, glareY: 50 }); setActive(false); }, []);
  const shadowX = active ? (tilt.rotY / maxTilt) * 4 : 0;
  const shadowY = active ? -(tilt.rotX / maxTilt) * 4 : 3;
  return (
    <div style={{ perspective: "1600px" }}>
      <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ position: "relative", transformStyle: "preserve-3d", transform: `rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg) translateZ(${active ? 2 : 0}px)`, transition: active ? "transform .12s ease-out, box-shadow .12s ease-out" : "transform .5s cubic-bezier(.23,1,.32,1), box-shadow .5s cubic-bezier(.23,1,.32,1)", boxShadow: `${shadowX}px ${shadowY}px ${active ? 16 : 8}px ${active ? 1 : 0}px rgba(0,0,0,${active ? 0.10 : 0.07}), 0 1px 2px rgba(0,0,0,.04)`, borderRadius: (style?.borderRadius as string | number) ?? 12, willChange: "transform", ...style }}>
        {children}
        <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,${active ? glareOpacity : 0}) 0%, transparent 65%)`, transition: active ? "background .12s" : "background .5s" }} />
      </div>
    </div>
  );
}

// ─── Collapsible Design Settings card ─────────────────────────────────────
type CollapseCardProps = {
  label: string;
  accentColor: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function CollapseCard({ label, accentColor, icon, children, defaultOpen = false }: CollapseCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card3D style={{ background: "#fff", border: "1px solid #ddd8cf", borderLeft: `4px solid ${accentColor}`, borderRadius: 12, marginBottom: 10 }} glareOpacity={0.1}>
      <div style={{ padding: "0" }}>
        {/* Header row */}
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accentColor}18`, border: `1px solid ${accentColor}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--ui)", fontSize: 16, fontWeight: 700, color: "#1a1410" }}>{label}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#8a7d72" strokeWidth="2" strokeLinecap="round" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .2s", flexShrink: 0 }}>
            <path d="M3 7h8M7 3l4 4-4 4"/>
          </svg>
        </button>
        {/* Body */}
        {open && (
          <div style={{ padding: "0 14px 14px" }}>
            <div style={{ height: 1, background: "#f0ebe4", marginBottom: 12 }} />
            {children}
          </div>
        )}
      </div>
    </Card3D>
  );
}

// ─── Icon components ───────────────────────────────────────────────────────
const SlabIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a4a8a" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="9" width="20" height="5" rx="1"/></svg>;
const BeamIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a4a8a" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="10" width="20" height="6" rx="1"/><line x1="2" y1="10" x2="2" y2="21"/><line x1="22" y1="10" x2="22" y2="21"/></svg>;
const ColIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a4a8a" strokeWidth="1.8" strokeLinecap="round"><rect x="8" y="2" width="8" height="20" rx="1"/></svg>;
const FdnIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8960c" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="14" width="20" height="8" rx="1"/><line x1="12" y1="3" x2="12" y2="14"/></svg>;
const StairIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round"><polyline points="2,20 2,14 8,14 8,9 14,9 14,5 20,5 20,20"/></svg>;
const WallIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="2" width="6" height="20" rx="1"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="7" x2="21" y2="7"/><line x1="9" y1="17" x2="21" y2="17"/></svg>;

// ─── Shared chip sets ──────────────────────────────────────────────────────
const RC_CODES   = [{ id:"BS",label:"BS 8110",available:true},{id:"EC2",label:"EC 2",available:false},{id:"ACI",label:"ACI 318",available:false}];
const STL_CODES  = [{ id:"BS",label:"BS 5950",available:true},{id:"EC3",label:"EC 3",available:false},{id:"AISC",label:"AISC 360",available:false}];
const FCU_CHIPS  = [{ id:"20",label:"20 N/mm²",available:true},{id:"25",label:"25 N/mm²",available:true},{id:"30",label:"30 N/mm²",available:true},{id:"35",label:"35 N/mm²",available:true}];
const FY_CHIPS   = [{ id:"250",label:"250",available:true},{id:"460",label:"460",available:true},{id:"500",label:"500",available:true}];
const COVER_CHIPS= [{ id:"20",label:"20",available:true},{id:"25",label:"25",available:true},{id:"30",label:"30",available:true},{id:"40",label:"40",available:true},{id:"50",label:"50",available:true}];

// ─── Main SettingsScreen ───────────────────────────────────────────────────
export default function SettingsScreen() {
  const { goScreen } = useWorkspace();

  const [ds, setDs] = useState<DesignSettings>(BLANK.design);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setDs(getAppSettings().design); }, []);

  const flashSaved = useCallback(() => { setSaved(true); setTimeout(() => setSaved(false), 2200); }, []);

  const saveDs = useCallback((next: DesignSettings) => {
    setDs(next);
    persist({ design: next });
    flashSaved();
  }, [flashSaved]);

  const setGlobal  = (k: "rcCode"|"steelCode", v: string) => saveDs({ ...ds, [k]: v });
  const setSlab    = (k: keyof SlabDefaults, v: string)    => saveDs({ ...ds, slab:         { ...ds.slab, [k]: v } });
  const setBeam    = (k: keyof BeamDefaults, v: string)    => saveDs({ ...ds, beam:         { ...ds.beam, [k]: v } });
  const setCol     = (k: keyof ColumnDefaults, v: string)  => saveDs({ ...ds, column:       { ...ds.column, [k]: v } });
  const setFdn     = (k: keyof FoundationDefaults, v: string) => saveDs({ ...ds, foundation: { ...ds.foundation, [k]: v } });
  const setStair   = (k: keyof StaircaseDefaults, v: string)  => saveDs({ ...ds, staircase:  { ...ds.staircase, [k]: v } });
  const setWall    = (k: keyof RetainingWallDefaults, v: string) => saveDs({ ...ds, retainingWall: { ...ds.retainingWall, [k]: v } });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f5f1eb", overflow: "hidden" }}>
      <SaveBanner show={saved} />

      {/* Blue header */}
      <div style={{ background: "#1a4a8a", padding: "14px 18px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "var(--ser)", fontSize: 17, fontWeight: 700, color: "#fff" }}>Settings</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(200,150,12,.85)", marginTop: 2 }}>App preferences &amp; design defaults</div>
        </div>
        <button onClick={() => goScreen("workspace")} style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.25)", color: "#fff", padding: "5px 12px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 10, cursor: "pointer" }}>← Back</button>
      </div>

      {/* Scrollable content */}
      <div className="scr" style={{ padding: "16px 18px 20px", background: "#f5f1eb" }}>
        <div style={{ maxWidth: 480, margin: "auto", width: "100%" }}>

          {/* ── Design Settings outer card ── */}
          <Card3D style={{ background: "#fff", border: "1px solid #ddd8cf", borderLeft: "4px solid #1a4a8a", borderRadius: 14, marginBottom: 14 }} glareOpacity={0.07}>
            <div style={{ padding: "14px 14px 6px" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "#8a7d72", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 2 }}>Settings</div>
              <div style={{ fontFamily: "var(--ui)", fontSize: 19, fontWeight: 700, color: "#1a1410", marginBottom: 12 }}>Design Settings</div>
            </div>
            <div style={{ padding: "0 10px 10px" }}>

          {/* ── General (codes) ── */}
          <CollapseCard label="General" accentColor="#1a4a8a" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a4a8a" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>} defaultOpen>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>RC Design Code</div>
              <ChipGroup options={RC_CODES} value={ds.rcCode} onChange={(v) => setGlobal("rcCode", v)} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Steel Design Code</div>
              <ChipGroup options={STL_CODES} value={ds.steelCode} onChange={(v) => setGlobal("steelCode", v)} />
            </div>
          </CollapseCard>

          {/* ── Slab ── */}
          <CollapseCard label="Slab" accentColor="#1a4a8a" icon={<SlabIcon/>}>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Concrete fcu (N/mm²)</div>
              <ChipGroup options={FCU_CHIPS} value={ds.slab.fcu} onChange={(v) => setSlab("fcu", v)} />
            </div>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Reinforcement fy (N/mm²)</div>
              <ChipGroup options={FY_CHIPS} value={ds.slab.fy} onChange={(v) => setSlab("fy", v)} />
            </div>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Nominal Cover (mm)</div>
              <ChipGroup options={COVER_CHIPS} value={ds.slab.cover} onChange={(v) => setSlab("cover", v)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FieldRow label="Overall Depth" unit="mm" value={ds.slab.depth} onChange={(v) => setSlab("depth", v)} />
              <FieldRow label="Span" unit="mm" value={ds.slab.span} onChange={(v) => setSlab("span", v)} />
            </div>
          </CollapseCard>

          {/* ── Beam ── */}
          <CollapseCard label="Beam" accentColor="#1a6aaa" icon={<BeamIcon/>}>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Concrete fcu (N/mm²)</div>
              <ChipGroup options={FCU_CHIPS} value={ds.beam.fcu} onChange={(v) => setBeam("fcu", v)} />
            </div>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Reinforcement fy (N/mm²)</div>
              <ChipGroup options={FY_CHIPS} value={ds.beam.fy} onChange={(v) => setBeam("fy", v)} />
            </div>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Nominal Cover (mm)</div>
              <ChipGroup options={COVER_CHIPS} value={ds.beam.cover} onChange={(v) => setBeam("cover", v)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FieldRow label="Width (bw)" unit="mm" value={ds.beam.width} onChange={(v) => setBeam("width", v)} />
              <FieldRow label="Overall Depth (h)" unit="mm" value={ds.beam.depth} onChange={(v) => setBeam("depth", v)} />
            </div>
          </CollapseCard>

          {/* ── Column ── */}
          <CollapseCard label="Column" accentColor="#1a4a8a" icon={<ColIcon/>}>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Concrete fcu (N/mm²)</div>
              <ChipGroup options={FCU_CHIPS} value={ds.column.fcu} onChange={(v) => setCol("fcu", v)} />
            </div>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Reinforcement fy (N/mm²)</div>
              <ChipGroup options={FY_CHIPS} value={ds.column.fy} onChange={(v) => setCol("fy", v)} />
            </div>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Nominal Cover (mm)</div>
              <ChipGroup options={COVER_CHIPS} value={ds.column.cover} onChange={(v) => setCol("cover", v)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FieldRow label="Breadth (b)" unit="mm" value={ds.column.breadth} onChange={(v) => setCol("breadth", v)} />
              <FieldRow label="Length (h)" unit="mm" value={ds.column.length} onChange={(v) => setCol("length", v)} />
            </div>
          </CollapseCard>

          {/* ── Foundation ── */}
          <CollapseCard label="Foundation" accentColor="#c8960c" icon={<FdnIcon/>}>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Concrete fcu (N/mm²)</div>
              <ChipGroup options={FCU_CHIPS} value={ds.foundation.fcu} onChange={(v) => setFdn("fcu", v)} />
            </div>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Reinforcement fy (N/mm²)</div>
              <ChipGroup options={FY_CHIPS} value={ds.foundation.fy} onChange={(v) => setFdn("fy", v)} />
            </div>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Nominal Cover (mm)</div>
              <ChipGroup options={COVER_CHIPS} value={ds.foundation.cover} onChange={(v) => setFdn("cover", v)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FieldRow label="Pad Length" unit="mm" value={ds.foundation.length} onChange={(v) => setFdn("length", v)} />
              <FieldRow label="Pad Breadth" unit="mm" value={ds.foundation.breadth} onChange={(v) => setFdn("breadth", v)} />
              <FieldRow label="Pad Depth" unit="mm" value={ds.foundation.depth} onChange={(v) => setFdn("depth", v)} />
            </div>
          </CollapseCard>

          {/* ── Staircase ── */}
          <CollapseCard label="Staircase" accentColor="#15803d" icon={<StairIcon/>}>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Concrete fcu (N/mm²)</div>
              <ChipGroup options={FCU_CHIPS} value={ds.staircase.fcu} onChange={(v) => setStair("fcu", v)} />
            </div>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Reinforcement fy (N/mm²)</div>
              <ChipGroup options={FY_CHIPS} value={ds.staircase.fy} onChange={(v) => setStair("fy", v)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <FieldRow label="Waist Depth" unit="mm" value={ds.staircase.waistDepth} onChange={(v) => setStair("waistDepth", v)} />
              <FieldRow label="Riser Height" unit="mm" value={ds.staircase.riserHeight} onChange={(v) => setStair("riserHeight", v)} />
              <FieldRow label="Tread Width" unit="mm" value={ds.staircase.treadWidth} onChange={(v) => setStair("treadWidth", v)} />
            </div>
          </CollapseCard>

          {/* ── Retaining Wall ── */}
          <CollapseCard label="Retaining Wall" accentColor="#7c3aed" icon={<WallIcon/>}>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Concrete fcu (N/mm²)</div>
              <ChipGroup options={FCU_CHIPS} value={ds.retainingWall.fcu} onChange={(v) => setWall("fcu", v)} />
            </div>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Reinforcement fy (N/mm²)</div>
              <ChipGroup options={FY_CHIPS} value={ds.retainingWall.fy} onChange={(v) => setWall("fy", v)} />
            </div>
            <div style={{ marginBottom: 11 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#8a7d72", marginBottom: 5, letterSpacing: ".4px" }}>Nominal Cover (mm)</div>
              <ChipGroup options={COVER_CHIPS} value={ds.retainingWall.cover} onChange={(v) => setWall("cover", v)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FieldRow label="Wall Height" unit="mm" value={ds.retainingWall.height} onChange={(v) => setWall("height", v)} />
              <FieldRow label="Wall Thickness" unit="mm" value={ds.retainingWall.thickness} onChange={(v) => setWall("thickness", v)} />
            </div>
          </CollapseCard>

            </div>{/* end inner padding */}
          </Card3D>{/* end Design Settings outer card */}

          <div style={{ textAlign: "center", paddingBottom: 8 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#c0b8ae", letterSpacing: ".4px" }}>SSAD · v1.0.0-alpha · Sprint 1</div>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="bnav">
        <div className="bni" onClick={() => goScreen("workspace")} role="button" tabIndex={0}>
          <div className="bni-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg></div>
          <span>Home</span>
        </div>
        <div className="bni" onClick={() => goScreen("projects")} role="button" tabIndex={0}>
          <div className="bni-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg></div>
          <span>Projects</span>
        </div>
        <div className="bni on" role="button" tabIndex={0}>
          <div className="bni-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></div>
          <span>Settings</span>
        </div>
      </div>
    </div>
  );
}


