"use client";

import { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { CalcCheck, CalcStep } from "@/types/calc";

export default function ResultPanel() {
  const { calcResult, goScreen } = useWorkspace();
  if (!calcResult) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--dim)", fontFamily: "var(--ui)" }}>No results available.</p>
        </div>
      </div>
    );
  }
  const { results, checks, steps, warnings } = calcResult;
  const verdict = results.verdict;
  const utilPct = Math.round(results.utilization * 100);
  const vc = verdict === "pass" ? "pass" : verdict === "warn" ? "warn" : "fail";
  const verdictLabel = verdict === "pass" ? "PASS" : verdict === "warn" ? "CAUTION" : "FAIL";
  const passCount = checks?.filter((c: CalcCheck) => c.status === "pass").length ?? 0;
  const totalCount = checks?.length ?? 0;
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ background: "var(--blu)", color: "#fff", fontSize: 11, fontFamily: "var(--mono)", padding: "4px 16px", letterSpacing: "0.05em" }}>
        SSAD {String.fromCharCode(183)} DESIGN RESULTS
      </div>
      <div className="bkhd">
        <button className="bk" onClick={() => goScreen("ai")} style={{ fontSize: 13 }}>
          {String.fromCharCode(8249)} Back
        </button>
        <span style={{ fontFamily: "var(--ser)", fontSize: 18, fontWeight: 700, color: "#fff" }}>Design Results</span>
        <span className="bk-badge" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "none" }}>
          {calcResult.module?.toUpperCase() ?? "CALC"}
        </span>
      </div>
      <div className="scr" style={{ flex: 1, overflowY: "auto", padding: "20px 16px 80px" }}>
        <div className={`v-banner ${vc}`}>
          <div>
            <div className="v-lbl">Structural Check</div>
            <div className={`v-word ${vc}`}>{verdictLabel}</div>
            <div className="v-clause">{results.summary}</div>
          </div>
          <div className={`v-ring ${vc}`}>
            <div className="v-pct">{utilPct}%</div>
            <div className="v-pct-lbl">util.</div>
          </div>
        </div>
        <div className="kvrow">
          <div className="kv"><div className="kvl">Utilization</div><div className={`kvv ${vc}`}>{utilPct}%</div></div>
          <div className="kv"><div className="kvl">Verdict</div><div className={`kvv ${vc}`}>{verdictLabel}</div></div>
          <div className="kv"><div className="kvl">Checks</div><div className="kvv">{passCount}/{totalCount}</div></div>
        </div>
        {checks && checks.length > 0 && (
          <div className="chks">
            <div className="chk-ttl">Code Checks</div>
            {checks.map((c: CalcCheck, i: number) => {
              const st = c.status === "pass" ? "p" : c.status === "warn" ? "w" : "f";
              const ic = c.status === "pass" ? "✓" : c.status === "warn" ? "⚠" : "✗";
              return (
                <div className="chk" key={i}>
                  <span className={`chk-ic ${st}`}>{ic}</span>
                  <span className="chk-name">{c.label}</span>
                  {c.clause && <span className="chk-ref">{c.clause}</span>}
                  {c.limit > 0 && <span className={`chk-ratio ${st}`}>{(c.value / c.limit * 100).toFixed(1)}%</span>}
                </div>
              );
            })}
          </div>
        )}
        {warnings && warnings.length > 0 && (
          <div style={{ marginTop: 16, padding: "12px 14px", background: "#fffbf0", border: "1px solid #e0c060", borderRadius: 6 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "#8a6a00", marginBottom: 6, letterSpacing: "0.05em" }}>WARNINGS</div>
            {warnings.map((w, i) => (
              <div key={i} style={{ fontFamily: "var(--ui)", fontSize: 13, color: "#5a4000", marginBottom: 4 }}>! {w}</div>
            ))}
          </div>
        )}
        {steps && steps.length > 0 && <StepsSection steps={steps} />}
        <div className="exprow">
          <button className="expbtn" onClick={() => goScreen("report")}>PDF Report</button>
          <button className="expbtn" onClick={() => goScreen("detailing")}>Detailing</button>
          <button className="expbtn" onClick={() => goScreen("workspace")}>New Calc</button>
        </div>
      </div>
      <div className="actbar">
        <button className="btn-sec" onClick={() => goScreen("ai")}>Edit Inputs</button>
        <button className="btn-pr" onClick={() => goScreen("report")}>Generate Report</button>
      </div>
      <div style={{ display: "flex", borderTop: "1px solid var(--bdr)", background: "var(--sur)" }}>
        {([
          { label: "Home", screen: "workspace" },
          { label: "Results", screen: "result", active: true },
          { label: "Projects", screen: "projects" },
        ] as Array<{ label: string; screen: string; active?: boolean }>).map((item) => (
          <button key={item.screen} onClick={() => goScreen(item.screen as import("@/types/calc").ScreenName)}
            style={{ flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer",
              fontFamily: "var(--ui)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
              color: item.active ? "var(--blu)" : "var(--dim)",
              borderTop: item.active ? "2px solid var(--blu)" : "2px solid transparent" }}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepsSection({ steps }: { steps: CalcStep[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", padding: "10px 14px", background: "var(--bg2)",
          border: "1px solid var(--bdr)", borderRadius: 6, cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: "var(--ui)", fontSize: 13, fontWeight: 600, color: "var(--txt)" }}>
        <span>Calculation Steps ({steps.length})</span>
        <span style={{ color: "var(--dim)" }}>{open ? "up" : "down"}</span>
      </button>
      {open && (
        <div style={{ border: "1px solid var(--bdr)", borderTop: "none", borderRadius: "0 0 6px 6px", background: "var(--sur)" }}>
          {steps.map((s: CalcStep, i: number) => (
            <div key={i} style={{ padding: "10px 14px", borderBottom: i < steps.length - 1 ? "1px solid var(--bdr)" : "none" }}>
              <div style={{ fontFamily: "var(--ui)", fontSize: 12, fontWeight: 700, color: "var(--mut)", marginBottom: 2 }}>{s.label}</div>
              {s.expression && <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--blu)", marginBottom: 2 }}>{s.expression}</div>}
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--txt)", fontWeight: 600 }}>= {s.value} {s.unit ?? ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
