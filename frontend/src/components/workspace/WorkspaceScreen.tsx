"use client";

import { useWorkspace } from "@/context/WorkspaceContext";
import AIChatPanel from "./AIChatPanel";
import ResultPanel from "./ResultPanel";
import ReportPanel from "./ReportPanel";
import DetailingPanel from "./DetailingPanel";
import ProjectsScreen from "@/components/projects/ProjectsScreen";
import SettingsScreen from "@/components/settings/SettingsScreen";
import UpgradeScreen from "@/components/upgrade/UpgradeScreen";
import AuthScreen from "@/components/auth/AuthScreen";
import SteelBeamForm from "./forms/SteelBeamForm";
import SteelColForm from "./forms/SteelColForm";
import SteelTrussForm from "./forms/SteelTrussForm";

// ─── Workspace orchestrates all in-flow panels ───────────
// Parity target: prototype navigates between workspace / ai /
// result / report / detailing / steel-* without a page reload.
// WorkspaceContext holds the active screen and calc state.

export default function WorkspaceScreen() {
  const { screen, goScreen } = useWorkspace();

  return (
    <div className="min-h-screen bg-surface text-text flex flex-col">
      {/* ── Top nav bar ── */}
      <header className="h-14 border-b border-border flex items-center px-6 gap-6 flex-shrink-0">
        <span className="font-semibold text-accent tracking-wide text-sm uppercase">
          SSAD
        </span>
        <nav className="flex gap-4 text-sm text-text-muted">
          <button
            className="hover:text-text transition-colors"
            onClick={() => goScreen("workspace")}
          >
            Workspace
          </button>
          <button
            className="hover:text-text transition-colors"
            onClick={() => goScreen("projects")}
          >
            Projects
          </button>
          <button
            className="hover:text-text transition-colors"
            onClick={() => goScreen("settings")}
          >
            Settings
          </button>
        </nav>
      </header>

      {/* ── Active panel ── */}
      <main className="flex-1 overflow-hidden relative">
        {screen === "workspace" && <WorkspaceHome onGoAI={() => goScreen("ai")} />}
        {screen === "ai" && <AIChatPanel />}
        {screen === "projects" && <ProjectsScreen />}
        {screen === "settings" && <SettingsScreen />}
        {screen === "upgrade" && <UpgradeScreen />}
        {screen === "auth" && <AuthScreen />}
        {screen === "result" && <ResultPanel />}
        {screen === "report" && <ReportPanel />}
        {screen === "detailing" && <DetailingPanel />}
        {screen === "steel-beam" && <SteelBeamForm />}
        {screen === "steel-col" && <SteelColForm />}
        {screen === "steel-truss" && <SteelTrussForm />}
      </main>
    </div>
  );
}

// ─── Workspace home (parity: agent card grid + recent calcs) ───

function WorkspaceHome({ onGoAI }: { onGoAI: () => void }) {
  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <h1 className="text-xl font-semibold text-text mb-1">
        Structural Design Workspace
      </h1>
      <p className="text-text-muted text-sm mb-8">
        Select an agent to begin a new calculation.
      </p>

      {/* Agent cards – parity with RC and Steel agent cards in prototype */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <AgentCard
          title="RC Design"
          description="Reinforced concrete slabs, beams, columns, and foundations to BS 8110"
          onClick={onGoAI}
        />
        <AgentCard
          title="Steel Design"
          description="Steel beams, columns, trusses, and portal frames to BS steel codes"
          onClick={onGoAI}
        />
      </div>

      {/* Recent calculations placeholder */}
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
        Recent Calculations
      </h2>
      <div className="rounded-md border border-border bg-surface-card p-4 text-sm text-text-muted text-center">
        No recent calculations. Start a design above.
      </div>
    </div>
  );
}

function AgentCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-border bg-surface-card p-5 hover:border-accent transition-colors group"
    >
      <div className="text-base font-semibold text-text group-hover:text-accent transition-colors mb-1">
        {title}
      </div>
      <div className="text-sm text-text-muted">{description}</div>
    </button>
  );
}
