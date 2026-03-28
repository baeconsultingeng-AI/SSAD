/**
 * Shared localStorage schema for saved calculations and projects.
 * Used by ReportPanel (write) and ProjectsScreen (read/write).
 */
import type { CalcResponse } from "@/types/calc";

export const PROJECTS_KEY = "ssad_projects";
export const CALCS_KEY    = "ssad_calcs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectInfo {
  firmName: string;
  projectName: string;
  refId: string;
  designEngineer: string;
  approvingEngineer: string;
}

export interface StoredProject extends ProjectInfo {
  id: string;
  createdAt: string; // ISO-8601
}

export interface StoredCalc {
  id: string;
  savedAt: string;           // ISO-8601
  module: string;
  moduleLabel: string;
  projectId: string | null;  // null → standalone
  projectInfo: ProjectInfo | null; // snapshot of project info at save time
  verdict: string;
  utilization: number;       // 0–100 integer
  calcResult: CalcResponse;
}

// ─── Readers ──────────────────────────────────────────────────────────────────

export function loadProjects(): StoredProject[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? "[]") as StoredProject[]; }
  catch { return []; }
}

export function loadCalcs(): StoredCalc[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CALCS_KEY) ?? "[]") as StoredCalc[]; }
  catch { return []; }
}

// ─── Writers ──────────────────────────────────────────────────────────────────

export function saveProjects(projects: StoredProject[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function saveCalcs(calcs: StoredCalc[]): void {
  localStorage.setItem(CALCS_KEY, JSON.stringify(calcs));
}

export function appendCalc(calc: Omit<StoredCalc, "id">): StoredCalc {
  const entry: StoredCalc = {
    ...calc,
    id: `calc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };
  saveCalcs([...loadCalcs(), entry]);
  return entry;
}

export function createProject(info: ProjectInfo): StoredProject {
  const proj: StoredProject = {
    ...info,
    id: `proj_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  saveProjects([...loadProjects(), proj]);
  return proj;
}
