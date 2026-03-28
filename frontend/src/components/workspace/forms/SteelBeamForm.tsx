"use client";

import { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { runCalc, ApiError } from "@/lib/api-client";
import type { CalcRequest } from "@/types/calc";

// UB section table — A:cm², Iy:cm⁴, Wpl:cm³, Wel:cm³, hw:mm, tw:mm, tf:mm, bf:mm
const UB_SECTIONS = [
  { label: "203×133×25 UB",  A: 32.0,  Iy: 2340,  Wpl: 258,  Wel: 232,  hw: 172.4, tw: 5.7,  tf: 7.8,  bf: 133.2 },
  { label: "254×102×22 UB",  A: 28.0,  Iy: 2840,  Wpl: 260,  Wel: 226,  hw: 225.2, tw: 5.1,  tf: 6.8,  bf: 101.6 },
  { label: "254×146×31 UB",  A: 39.7,  Iy: 4410,  Wpl: 395,  Wel: 349,  hw: 222.2, tw: 6.0,  tf: 8.6,  bf: 146.1 },
  { label: "305×127×37 UB",  A: 47.2,  Iy: 7170,  Wpl: 539,  Wel: 472,  hw: 267.0, tw: 7.1,  tf: 10.7, bf: 123.4 },
  { label: "305×165×40 UB",  A: 51.3,  Iy: 8500,  Wpl: 619,  Wel: 560,  hw: 265.4, tw: 6.0,  tf: 10.2, bf: 165.0 },
  { label: "356×127×33 UB",  A: 41.8,  Iy: 8200,  Wpl: 543,  Wel: 484,  hw: 318.4, tw: 5.9,  tf: 8.5,  bf: 125.4 },
  { label: "356×171×45 UB",  A: 57.3,  Iy: 12100, Wpl: 775,  Wel: 687,  hw: 320.4, tw: 7.0,  tf: 9.7,  bf: 171.1 },
  { label: "406×140×39 UB",  A: 49.4,  Iy: 12500, Wpl: 724,  Wel: 628,  hw: 361.6, tw: 6.4,  tf: 8.6,  bf: 141.8 },
  { label: "406×178×54 UB",  A: 68.4,  Iy: 18700, Wpl: 1050, Wel: 927,  hw: 360.4, tw: 7.7,  tf: 10.9, bf: 177.7 },
  { label: "457×152×52 UB",  A: 66.5,  Iy: 21400, Wpl: 1100, Wel: 951,  hw: 417.2, tw: 7.6,  tf: 10.9, bf: 152.4 },
  { label: "457×191×67 UB",  A: 85.5,  Iy: 29400, Wpl: 1470, Wel: 1300, hw: 414.2, tw: 8.5,  tf: 12.7, bf: 189.9 },
  { label: "533×210×82 UB",  A: 104,   Iy: 47500, Wpl: 2060, Wel: 1800, hw: 476.5, tw: 9.6,  tf: 13.2, bf: 208.8 },
  { label: "610×229×101 UB", A: 129,   Iy: 75800, Wpl: 2880, Wel: 2520, hw: 547.3, tw: 10.5, tf: 14.8, bf: 227.6 },
];

const DEFAULTS = { sectionIdx: "3", span: "6", support: "simply_supported", gk: "15", qk: "10", py: "275" };

export default function SteelBeamForm() {
  const { goScreen, setCalcResult, projectId, elementId } = useWorkspace();
  const [form, setForm] = useState(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof DEFAULTS) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    const s = UB_SECTIONS[parseInt(form.sectionIdx, 10)];
    try {
      const req: CalcRequest & { inputs: Record<string, unknown> } = {
        requestId: `req-${Date.now()}`,
        module: "steel_beam_bs_v1",
        code: "BS",
        version: "1.0",
        project: { projectId: projectId ?? undefined, elementId: elementId ?? undefined },
        inputs: {
          section: { A_cm2: s.A, Iy_cm4: s.Iy, Wpl_cm3: s.Wpl, Wel_cm3: s.Wel, hw_mm: s.hw, tw_mm: s.tw, tf_mm: s.tf, bf_mm: s.bf },
          geometry: { span: parseFloat(form.span), support_type: form.support, lateral_restraint: "full" },
          loads: { gk: parseFloat(form.gk), qk: parseFloat(form.qk) },
          materials: { py: parseFloat(form.py) },
        },
      };
      const res = await runCalc(req as unknown as CalcRequest);
      if (res.status === "ok") { setCalcResult(res); goScreen("result"); }
      else { setError(res.error.message); }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Calculation failed.");
    } finally {
      setBusy(false);
    }
  };

  const sec = UB_SECTIONS[parseInt(form.sectionIdx, 10)];

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ background: "var(--blu)", color: "#fff", fontSize: 11, fontFamily: "var(--mono)", padding: "4px 16px", letterSpacing: "0.05em" }}>
        SSAD · STEEL BEAM · BS 5950-1:2000
      </div>
      <div className="bkhd">
        <button className="bk" onClick={() => goScreen("ai")}>‹</button>
        <h2>Steel Beam Design</h2>
        <span className="bk-badge">BS 5950</span>
      </div>
      <div className="scr" style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
        <div className="fbody">

          <div className="divl">Section</div>
          <div className="fg">
            <div className="fl">UB Section <span className="fu">BS 5950-1:2000</span></div>
            <select className="fs" value={form.sectionIdx} onChange={set("sectionIdx")}>
              {UB_SECTIONS.map((s, i) => <option key={i} value={String(i)}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, margin: "8px 0", padding: "10px 12px", background: "var(--bg2)", borderRadius: 8, border: "1px solid var(--bdr)" }}>
            {[
              ["A", sec.A + " cm²"], ["Iy", sec.Iy + " cm⁴"],
              ["Wpl", sec.Wpl + " cm³"], ["hw", sec.hw + " mm"],
            ].map(([k, v]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)", marginBottom: 2 }}>{k}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--blu)" }}>{v}</div>
              </div>
            ))}
          </div>

          <div className="divl">Geometry</div>
          <div className="fg">
            <div className="fl">Span <span className="fu">m</span></div>
            <input className="fi" type="number" min="1" max="30" step="0.5" value={form.span} onChange={set("span")} />
          </div>
          <div className="fg">
            <div className="fl">Support Condition</div>
            <select className="fs" value={form.support} onChange={set("support")}>
              <option value="simply_supported">Simply Supported</option>
              <option value="continuous">Continuous (0.086 wl²)</option>
              <option value="cantilever">Cantilever</option>
            </select>
          </div>

          <div className="divl">Design Loads (UDL)</div>
          <div className="fr2">
            <div className="fg">
              <div className="fl">Gk Dead <span className="fu">kN/m</span></div>
              <input className="fi" type="number" min="0" step="0.5" value={form.gk} onChange={set("gk")} />
            </div>
            <div className="fg">
              <div className="fl">Qk Imposed <span className="fu">kN/m</span></div>
              <input className="fi" type="number" min="0" step="0.5" value={form.qk} onChange={set("qk")} />
            </div>
          </div>

          <div className="divl">Material</div>
          <div className="fg">
            <div className="fl">Design Strength py <span className="fu">N/mm²</span></div>
            <select className="fs" value={form.py} onChange={set("py")}>
              <option value="275">S275 — 275 N/mm²</option>
              <option value="355">S355 — 355 N/mm²</option>
              <option value="460">S460 — 460 N/mm²</option>
            </select>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(192,57,43,.07)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 11, color: "var(--red)" }}>
              {error}
            </div>
          )}
        </div>
      </div>
      <div className="actbar">
        <button className="btn-sec" onClick={() => goScreen("ai")}>← AI Mode</button>
        <button className="btn-pr" onClick={() => void submit()} disabled={busy}>
          {busy ? "Calculating…" : "Run Design Check"}
        </button>
      </div>
    </div>
  );
}
