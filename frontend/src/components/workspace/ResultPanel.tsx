"use client";

import { useWorkspace } from "@/context/WorkspaceContext";
import { useState } from "react";
import type { CalcCheck, CalcStep, Verdict } from "@/types/calc";

// ─── Parity: "result" screen ─────────────────────────────

export default function ResultPanel() {
  const { calcResult, goScreen, resetWorkflow } = useWorkspace();

  if (!calcResult) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        No result available. Run a calculation first.
      </div>
    );
  }

  const { results, checks, warnings, steps } = calcResult;

  return (
    <div className="p-6 max-w-3xl mx-auto w-full overflow-y-auto">
      {/* Verdict header */}
      <div className="flex items-center gap-4 mb-6">
        <VerdictBadge verdict={results.verdict} />
        <div>
          <p className="text-sm text-text-muted">Overall utilization</p>
          <p className="text-2xl font-bold text-text">
            {(results.utilization * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <p className="text-sm text-text-muted mb-6">{results.summary}</p>

      {/* Checks table */}
      {checks.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
            Design Checks
          </h2>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated text-text-muted text-xs">
                <tr>
                  <th className="text-left px-3 py-2">Check</th>
                  <th className="text-right px-3 py-2">Value</th>
                  <th className="text-right px-3 py-2">Limit</th>
                  <th className="text-right px-3 py-2">Clause</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {checks.map((c) => (
                  <CheckRow key={c.id} check={c} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
            Warnings
          </h2>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li
                key={i}
                className="text-sm text-warn bg-warn/10 border border-warn/20 rounded px-3 py-2"
              >
                {w}
              </li>
            ))}
          </ul>
        </section>
      )}

        {/* Calculation Steps */}
        {steps && steps.length > 0 && (
          <StepsSection steps={steps} />
        )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => goScreen("report")}
          className="px-4 py-2 bg-accent text-surface text-sm font-semibold rounded-lg hover:bg-accent-muted transition-colors"
        >
          View Report
        </button>
        <button
          onClick={() => goScreen("detailing")}
          className="px-4 py-2 border border-border text-text text-sm rounded-lg hover:border-accent transition-colors"
        >
          View Detailing
        </button>
        <button
          onClick={resetWorkflow}
          className="px-4 py-2 text-text-muted text-sm hover:text-text transition-colors"
        >
          New Calculation
        </button>
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const styles: Record<Verdict, string> = {
    pass: "bg-success/10 text-success border-success/30",
    warn: "bg-warn/10 text-warn border-warn/30",
    fail: "bg-error/10 text-error border-error/30",
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-semibold uppercase tracking-wide ${styles[verdict]}`}
    >
      {verdict}
    </span>
  );
}

function CheckRow({ check }: { check: CalcCheck }) {
  const dot: Record<Verdict, string> = {
    pass: "bg-success",
    warn: "bg-warn",
    fail: "bg-error",
  };
  return (
    <tr className="bg-surface-card">
      <td className="px-3 py-2 text-text">{check.label}</td>
      <td className="px-3 py-2 text-right text-text">{check.value.toFixed(2)}</td>
      <td className="px-3 py-2 text-right text-text-muted">{check.limit.toFixed(2)}</td>
      <td className="px-3 py-2 text-right text-text-muted text-xs">{check.clause}</td>
      <td className="px-3 py-2 text-center">
        <span
          className={`inline-block w-2 h-2 rounded-full ${dot[check.status]}`}
        />
      </td>
    </tr>
  );
}

function StepsSection({ steps }: { steps: CalcStep[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 hover:text-text transition-colors"
      >
        <span>{open ? "▾" : "▸"}</span>
        Calculation Steps ({steps.length})
      </button>
      {open && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated text-text-muted text-xs">
              <tr>
                <th className="text-left px-3 py-2">Step</th>
                <th className="text-left px-3 py-2">Expression</th>
                <th className="text-right px-3 py-2">Value</th>
                <th className="text-left px-3 py-2 hidden sm:table-cell">Unit</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">Clause</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {steps.map((s, i) => (
                <tr key={i} className="bg-surface-card">
                  <td className="px-3 py-2 text-text font-medium whitespace-nowrap">{s.label}</td>
                  <td className="px-3 py-2 text-text-muted font-mono text-xs">{s.expression}</td>
                  <td className="px-3 py-2 text-right text-text font-semibold">
                    {typeof s.value === "number" ? s.value.toFixed(3) : s.value}
                  </td>
                  <td className="px-3 py-2 text-text-muted text-xs hidden sm:table-cell">{s.unit ?? "—"}</td>
                  <td className="px-3 py-2 text-text-muted text-xs hidden md:table-cell">{s.clause ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
