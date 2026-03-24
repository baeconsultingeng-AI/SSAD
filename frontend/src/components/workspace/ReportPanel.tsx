"use client";

import { useWorkspace } from "@/context/WorkspaceContext";

// ─── Parity: "report" screen ─────────────────────────────

export default function ReportPanel() {
  const { calcResult, goScreen } = useWorkspace();

  if (!calcResult || !calcResult.reportPayload) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        No report available.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-text">Calculation Report</h1>
        <button
          onClick={() => goScreen("result")}
          className="text-sm text-text-muted hover:text-text transition-colors"
        >
          ← Results
        </button>
      </div>

      {/* Report letterhead strip — parity with Bae Consulting header */}
      <div className="rounded-xl border border-border bg-surface-card px-6 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-widest">
            Bae Consulting Engineers
          </p>
          <p className="text-sm text-text font-medium mt-0.5">
            Structural Calculation Sheet
          </p>
        </div>
        <p className="text-xs text-text-muted">
          {new Date().toLocaleDateString("en-GB")}
        </p>
      </div>

      {/* Module and code meta */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          ["Module", calcResult.module],
          ["Code", calcResult.code],
          ["Version", calcResult.version],
        ].map(([label, val]) => (
          <div key={label} className="rounded border border-border bg-surface-elevated p-3">
            <p className="text-xs text-text-muted mb-0.5">{label}</p>
            <p className="text-sm text-text font-medium">{val}</p>
          </div>
        ))}
      </div>

      {/* Verdict panel */}
      <div className="rounded border border-border bg-surface-card p-4 mb-6">
        <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
          Design Outcome
        </p>
        <p className="text-base font-semibold capitalize text-text">
          {calcResult.results.verdict} —{" "}
          {(calcResult.results.utilization * 100).toFixed(1)}% utilized
        </p>
        <p className="text-sm text-text-muted mt-1">{calcResult.results.summary}</p>
      </div>

      {/* Report payload (Sprint 3: expanded section renderer) */}
      <ReportSections payload={calcResult.reportPayload} />

      <button
        onClick={() => goScreen("detailing")}
        className="mt-6 px-4 py-2 border border-border text-text text-sm rounded-lg hover:border-accent transition-colors"
      >
        View Detailing
      </button>
    </div>
  );
}

  // ─── Section renderer ─────────────────────────────────────

  type ReportSection = {
    title: string;
    content: Record<string, unknown>;
  };

  type ReportPayload = {
    sections?: ReportSection[];
    formula_steps?: unknown[];
    [key: string]: unknown;
  };

  function ReportSections({ payload }: { payload: Record<string, unknown> }) {
    const p = payload as ReportPayload;
    const sections: ReportSection[] = Array.isArray(p.sections) ? p.sections : [];

    if (sections.length === 0) {
      return (
        <div className="rounded border border-border bg-surface-elevated p-4 text-xs text-text-muted font-mono whitespace-pre-wrap overflow-auto max-h-96">
          {JSON.stringify(payload, null, 2)}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sections.map((section, i) => (
          <div key={i} className="rounded border border-border bg-surface-card overflow-hidden">
            <div className="px-4 py-2 bg-surface-elevated border-b border-border">
              <h3 className="text-xs font-semibold text-text uppercase tracking-wide">
                {section.title}
              </h3>
            </div>
            <div className="divide-y divide-border">
              {Object.entries(section.content).map(([key, val]) => (
                <div key={key} className="flex items-baseline px-4 py-2 gap-4">
                  <span className="text-xs text-text-muted flex-shrink-0 w-48 capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm text-text font-medium break-all">
                    {formatValue(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function formatValue(val: unknown): string {
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "number") return val.toString();
    if (typeof val === "string") return val;
    return JSON.stringify(val);
  }
