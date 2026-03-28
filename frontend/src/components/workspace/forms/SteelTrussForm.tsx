"use client";

import { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { runCalc, ApiError } from "@/lib/api-client";
import type { CalcRequest } from "@/types/calc";

// Common truss member sections (RHS / CHS / Angle)
const TRUSS_SECTIONS = [
  { label: "50×50×5 RHS",     A_cm2: 9.24,  i_min_cm: 1.89, type: "rhs"   },
  { label: "60×60×5 RHS",     A_cm2: 11.1,  i_min_cm: 2.31, type: "rhs"   },
  { label: "80×80×5 RHS",     A_cm2: 14.7,  i_min_cm: 3.06, type: "rhs"   },
  { label: "100×100×6 RHS",   A_cm2: 22.0,  i_min_cm: 3.83, type: "rhs"   },
  { label: "120×120×6 RHS",   A_cm2: 26.7,  i_min_cm: 4.64, type: "rhs"   },
  { label: "150×150×8 RHS",   A_cm2: 44.8,  i_min_cm: 5.79, type: "rhs"   },
  { label: "60.3×5 CHS",      A_cm2: 8.83,  i_min_cm: 1.93, type: "chs"   },
  { label: "76.1×5 CHS",      A_cm2: 11.2,  i_min_cm: 2.45, type: "chs"   },
  { label: "88.9×5 CHS",      A_cm2: 13.2,  i_min_cm: 2.88, type: "chs"   },
  { label: "114.3×5 CHS",     A_cm2: 17.1,  i_min_cm: 3.77, type: "chs"   },
  { label: "60×60×6 L-Angle", A_cm2: 6.91,  i_min_cm: 1.18, type: "angle" },
  { label: "80×80×8 L-Angle", A_cm2: 12.3,  i_min_cm: 1.57, type: "angle" },
  { label: "100×100×10 L-Ang",A_cm2: 19.2,  i_min_cm: 1.97, type: "angle" },
];

const DEFAULTS = { sectionIdx: "2", le: "3", F_Ed: "150", py: "275" };

export default function SteelTrussForm() {
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
    const s = TRUSS_SECTIONS[parseInt(form.sectionIdx, 10)];
    try {
      const req: CalcRequest & { inputs: Record<string, unknown> } = {
        requestId: `req-${Date.now()}`,
        module: "steel_truss_bs_v1",
        code: "BS",
        version: "1.0",
        project: { projectId: projectId ?? undefined, elementId: elementId ?? undefined },
        inputs: {
          section: { A_cm2: s.A_cm2, i_min_cm: s.i_min_cm },
          geometry: { le: parseFloat(form.le), member_type: s.type },
          loads: { F_Ed: parseFloat(form.F_Ed) },
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

  const sec = TRUSS_SECTIONS[parseInt(form.sectionIdx, 10)];

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ background: "var(--blu)", color: "#fff", fontSize: 11, fontFamily: "var(--mono)", padding: "4px 16px", letterSpacing: "0.05em" }}>
        SSAD · STEEL TRUSS MEMBER · BS 5950-1:2000
      </div>
      <div className="bkhd">
        <button className="bk" onClick={() => goScreen("ai")}>‹</button>
        <h2>Truss Member Check</h2>
        <span className="bk-badge">BS 5950</span>
      </div>
      <div className="scr" style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
        <div className="fbody">

          <div className="divl">Member Section</div>
          <div className="fg">
            <div className="fl">Section Profile <span className="fu">RHS / CHS / Angle</span></div>
            <select className="fs" value={form.sectionIdx} onChange={set("sectionIdx")}>
              {TRUSS_SECTIONS.map((s, i) => <option key={i} value={String(i)}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, margin: "8px 0", padding: "10px 12px", background: "var(--bg2)", borderRadius: 8, border: "1px solid var(--bdr)" }}>
            {[
              ["A", sec.A_cm2 + " cm²"],
              ["i_min", sec.i_min_cm + " cm"],
              ["Type", sec.type.toUpperCase()],
            ].map(([k, v]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)", marginBottom: 2 }}>{k}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--blu)" }}>{v}</div>
              </div>
            ))}
          </div>

          <div className="divl">Geometry</div>
          <div className="fg">
            <div className="fl">Effective Length LE <span className="fu">m</span></div>
            <input className="fi" type="number" min="0.1" step="0.25" value={form.le} onChange={set("le")} />
          </div>

          <div className="divl">Member Force</div>
          <div className="fg">
            <div className="fl">F_Ed  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--grn)" }}>+ tension</span> / <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--red)" }}>− compression</span> <span className="fu">kN</span></div>
            <input className="fi" type="number" step="10" value={form.F_Ed} onChange={set("F_Ed")} />
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
          {busy ? "Calculating…" : "Run Member Check"}
        </button>
      </div>
    </div>
  );
}
