"use client";

import { useWorkspace } from "@/context/WorkspaceContext";

// ─── Parity: "steel-beam" screen — input form ────────────

export default function SteelBeamForm() {
  const { goScreen } = useWorkspace();

  return (
    <div className="p-6 max-w-2xl mx-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-text">Steel Beam Design</h1>
        <button
          onClick={() => goScreen("ai")}
          className="text-sm text-text-muted hover:text-text"
        >
          ← Back
        </button>
      </div>
      {/* Sprint 3: full form fields from Calculation-IO-Schemas-V1 */}
      <div className="rounded-lg border border-border bg-surface-card p-6 text-sm text-text-muted text-center">
        Steel beam input form — Sprint 3 implementation
      </div>
    </div>
  );
}
