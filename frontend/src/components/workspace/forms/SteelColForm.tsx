"use client";

import { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { runCalc, ApiError } from "@/lib/api-client";
import type { CalcRequest } from "@/types/calc";

// UC section table — A:cm², iy:cm, iz:cm, Wpl_y:cm³, tf:mm
const UC_SECTIONS = [
  { label: "152×152×23 UC",  A: 29.8, iy: 6.51, iz: 3.70, Wpl_y: 184,  tf: 6.8  },
  { label: "152×152×37 UC",  A: 47.1, iy: 6.58, iz: 3.87, Wpl_y: 282,  tf: 11.5 },
  { label: "203×203×46 UC",  A: 58.7, iy: 8.82, iz: 5.13, Wpl_y: 497,  tf: 11.0 },
  { label: "203×203×60 UC",  A: 76.4, iy: 8.96, iz: 5.20, Wpl_y: 652,  tf: 14.2 },
  { label: "203×203×86 UC",  A: 110,  iy: 9.28, iz: 5.34, Wpl_y: 979,  tf: 20.5 },
  { label: "254×254×73 UC",  A: 93.1, iy: 11.07,iz: 6.48, Wpl_y: 990,  tf: 14.2 },
  { label: "254×254×89 UC",  A: 114,  iy: 11.19,iz: 6.55, Wpl_y: 1220, tf: 17.3 },
  { label: "254×254×132 UC", A: 168,  iy: 11.58,iz: 6.89, Wpl_y: 1870, tf: 25.3 },
  { label: "305×305×97 UC",  A: 123,  iy: 13.44,iz: 7.69, Wpl_y: 1590, tf: 15.4 },
  { label: "305×305×118 UC", A: 150,  iy: 13.57,iz: 7.72, Wpl_y: 1960, tf: 18.7 },
  { label: "356×368×129 UC", A: 164,  iy: 15.65,iz: 9.43, Wpl_y: 2480, tf: 17.5 },
  { label: "356×406×235 UC", A: 299,  iy: 16.47,iz: 10.26,Wpl_y: 4690, tf: 30.2 },
];

const DEFAULTS = { sectionIdx: "2", le_y: "4", le_z: "4", N_Ed: "500", Mx_Ed: "0", My_Ed: "0", py: "275" };

export default function SteelColForm() {
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
    const s = UC_SECTIONS[parseInt(form.sectionIdx, 10)];
    try {
      const req: CalcRequest & { inputs: Record<string, unknown> } = {
        requestId: `req-${Date.now()}`,
        module: "steel_column_bs_v1",
        code: "BS",
        version: "1.0",
        project: { projectId: projectId ?? undefined, elementId: elementId ?? undefined },
        inputs: {
          section: { A_cm2: s.A, iy_cm: s.iy, iz_cm: s.iz, Wpl_y_cm3: s.Wpl_y, tf_mm: s.tf },
          geometry: { le_y: parseFloat(form.le_y), le_z: parseFloat(form.le_z) },
          loads: { N_Ed: parseFloat(form.N_Ed), Mx_Ed: parseFloat(form.Mx_Ed), My_Ed: parseFloat(form.My_Ed) },
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

  const sec = UC_SECTIONS[parseInt(form.sectionIdx, 10)];

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ background: "var(--blu)", color: "#fff", fontSize: 11, fontFamily: "var(--mono)", padding: "4px 16px", letterSpacing: "0.05em" }}>
        SSAD · STEEL COLUMN · BS 5950-1:2000
      </div>
      <div className="bkhd">
        <button className="bk" onClick={() => goScreen("ai")}>‹</button>
        <h2>Steel Column Design</h2>
        <span className="bk-badge">BS 5950</span>
      </div>
      <div className="scr" style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
        <div className="fbody">

          <div className="divl">Section</div>
          <div className="fg">
            <div className="fl">UC Section <span className="fu">BS 5950-1:2000</span></div>
            <select className="fs" value={form.sectionIdx} onChange={set("sectionIdx")}>
              {UC_SECTIONS.map((s, i) => <option key={i} value={String(i)}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, margin: "8px 0", padding: "10px 12px", background: "var(--bg2)", borderRadius: 8, border: "1px solid var(--bdr)" }}>
            {[
              ["A", sec.A + " cm²"], ["iy", sec.iy + " cm"],
              ["iz", sec.iz + " cm"], ["Wpl,y", sec.Wpl_y + " cm³"],
            ].map(([k, v]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)", marginBottom: 2 }}>{k}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--blu)" }}>{v}</div>
              </div>
            ))}
          </div>

          <div className="divl">Effective Lengths</div>
          <div className="fr2">
            <div className="fg">
              <div className="fl">LE,y Major <span className="fu">m</span></div>
              <input className="fi" type="number" min="0.5" step="0.25" value={form.le_y} onChange={set("le_y")} />
            </div>
            <div className="fg">
              <div className="fl">LE,z Minor <span className="fu">m</span></div>
              <input className="fi" type="number" min="0.5" step="0.25" value={form.le_z} onChange={set("le_z")} />
            </div>
          </div>

          <div className="divl">Design Forces</div>
          <div className="fg">
            <div className="fl">Axial Force N_Ed <span className="fu">kN</span></div>
            <input className="fi" type="number" step="10" value={form.N_Ed} onChange={set("N_Ed")} />
          </div>
          <div className="fr2">
            <div className="fg">
              <div className="fl">Mx,Ed <span className="fu">kN·m</span></div>
              <input className="fi" type="number" step="5" value={form.Mx_Ed} onChange={set("Mx_Ed")} />
            </div>
            <div className="fg">
              <div className="fl">My,Ed <span className="fu">kN·m</span></div>
              <input className="fi" type="number" step="5" value={form.My_Ed} onChange={set("My_Ed")} />
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
