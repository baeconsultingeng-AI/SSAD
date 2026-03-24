"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  ApiError,
  generateReport,
  getProjectRuns,
  getRun,
  type RunSummary,
} from "@/lib/api-client";

// ─── Parity: "projects" screen ───────────────────────────

export default function ProjectsScreen() {
  const {
    projectId,
    setActiveProject,
    setCalcResult,
    goScreen,
  } = useWorkspace();
  const [inputProjectId, setInputProjectId] = useState(projectId ?? "");
  const [rows, setRows] = useState<RunSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyRunId, setBusyRunId] = useState<string | null>(null);
  const [reportInfo, setReportInfo] = useState<string | null>(null);

  const activeProjectId = useMemo(() => inputProjectId.trim(), [inputProjectId]);

  const loadRuns = async () => {
    if (!activeProjectId) {
      setError("Enter a project ID to load run history.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setReportInfo(null);
    try {
      const data = await getProjectRuns(activeProjectId);
      setRows(data);
      setActiveProject(activeProjectId);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Failed to load project runs.");
      }
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const replayRun = async (runId: string) => {
    setBusyRunId(runId);
    setError(null);
    setReportInfo(null);
    try {
      const data = await getRun(runId);
      if (data.status === "ok") {
        setCalcResult(data);
        goScreen("result");
      } else {
        setError(data.error.message);
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Failed to replay run.");
      }
    } finally {
      setBusyRunId(null);
    }
  };

  const createReport = async (runId: string) => {
    setBusyRunId(runId);
    setError(null);
    setReportInfo(null);
    try {
      const report = await generateReport(runId);
      setReportInfo(`Report metadata created: ${report.id} (${report.storageKey})`);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Failed to create report metadata.");
      }
    } finally {
      setBusyRunId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-text p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Projects</h1>
          <Link
            href="/"
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            ← Workspace
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-surface-card p-4 mb-4">
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
            Project ID
          </label>
          <div className="flex gap-2">
            <input
              value={inputProjectId}
              onChange={(e) => setInputProjectId(e.target.value)}
              placeholder="e.g. 4a1f2b7c-..."
              className="flex-1 bg-surface-elevated border border-border rounded px-3 py-2 text-sm text-text"
            />
            <button
              onClick={() => void loadRuns()}
              disabled={isLoading}
              className="px-4 py-2 bg-accent text-surface text-sm font-semibold rounded hover:bg-accent-muted disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Load Runs"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

        {reportInfo && (
          <div className="mb-4 rounded border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            {reportInfo}
          </div>
        )}

        <div className="rounded-lg border border-border bg-surface-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wide">
            Calculation Runs
          </div>
          {rows.length === 0 ? (
            <div className="p-6 text-sm text-text-muted text-center">
              {isLoading ? "Loading runs..." : "No runs loaded. Enter project ID and load history."}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-sm text-text font-medium">{row.module}</p>
                    <p className="text-xs text-text-muted">
                      Run {row.id} • Request {row.requestId} • {row.createdAt}
                    </p>
                    <p className="text-xs text-text-muted">
                      {row.code} v{row.version} • status={row.status}
                      {row.verdict ? ` • verdict=${row.verdict}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void replayRun(row.id)}
                      disabled={busyRunId === row.id}
                      className="px-3 py-1.5 border border-border rounded text-sm text-text hover:border-accent disabled:opacity-50"
                    >
                      Replay
                    </button>
                    <button
                      onClick={() => void createReport(row.id)}
                      disabled={busyRunId === row.id}
                      className="px-3 py-1.5 border border-border rounded text-sm text-text hover:border-accent disabled:opacity-50"
                    >
                      Generate Report
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
