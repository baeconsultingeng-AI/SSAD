import type { CalcRequest, CalcApiResponse } from "@/types/calc";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const API_AUTH_KEY =
  process.env.NEXT_PUBLIC_API_AUTH_KEY?.trim() ?? "";

/** Get the stored JWT token from localStorage (safe in SSR — returns "" on server). */
function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("ssad_token") ?? "";
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const mergedHeaders = new Headers(init?.headers);
  if (!mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }
  if (API_AUTH_KEY && !mergedHeaders.has("X-API-Key")) {
    mergedHeaders.set("X-API-Key", API_AUTH_KEY);
  }
  const jwt = getStoredToken();
  if (jwt && !mergedHeaders.has("Authorization")) {
    mergedHeaders.set("Authorization", `Bearer ${jwt}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: mergedHeaders,
    ...init,
  });

  const data = await res.json() as T;
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in (data as Record<string, unknown>)
        ? String((data as Record<string, any>).error?.message ?? `Request failed (${res.status})`)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }
  return data;
}

// ─── Deterministic calculation ───────────────────────────

export async function runCalc(
  request: CalcRequest
): Promise<CalcApiResponse> {
  const mergedHeaders = new Headers();
  mergedHeaders.set("Content-Type", "application/json");
  if (API_AUTH_KEY) mergedHeaders.set("X-API-Key", API_AUTH_KEY);
  const jwt = getStoredToken();
  if (jwt) mergedHeaders.set("Authorization", `Bearer ${jwt}`);

  const res = await fetch(`${BASE_URL}/api/v1/calc`, {
    method: "POST",
    headers: mergedHeaders,
    body: JSON.stringify(request),
  });

  const data = await res.json() as CalcApiResponse;
  // Return the response body as a value for both 200 (ok) and 400 (calc error).
  // Only throw for unexpected HTTP errors (401, 500, network issues, etc.)
  if (res.ok || res.status === 400) {
    return data;
  }
  const body = data as unknown as Record<string, any>;
  const message =
    typeof body === "object" && body !== null && "error" in body
      ? String(body.error?.message ?? `Request failed (${res.status})`)
      : `Request failed (${res.status})`;
  throw new ApiError(message, res.status, data);
}

// ─── Project runs list ────────────────────────────────────

export interface RunSummary {
  id: string;
  requestId: string;
  module: string;
  code: string;
  version: string;
  status: string;
  verdict?: string;
  createdAt: string;
}

interface RunSummaryRow {
  id: string;
  request_id: string;
  module: string;
  code: string;
  version: string;
  status: string;
  verdict?: string;
  created_at: string;
}

interface StoredRunRow {
  status?: "ok" | "error";
  requestId?: string;
  request_id: string;
  module: string;
  code: "BS" | "EC" | "ACI";
  version: string;
  normalizedInputs: Record<string, unknown>;
  normalized_inputs?: Record<string, unknown>;
  result_payload: {
    verdict: "pass" | "warn" | "fail";
    utilization: number;
    summary: string;
  };
  checks: Array<Record<string, unknown>>;
  steps: Array<Record<string, unknown>>;
  warnings: string[];
}

export async function getProjectRuns(
  projectId: string
): Promise<RunSummary[]> {
  const rows = await fetchJson<RunSummaryRow[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/runs`);
  return rows.map((r) => ({
    id: r.id,
    requestId: r.request_id,
    module: r.module,
    code: r.code,
    version: r.version,
    status: r.status,
    verdict: r.verdict,
    createdAt: r.created_at,
  }));
}

// ─── Single stored run ────────────────────────────────────

export async function getRun(runId: string): Promise<CalcApiResponse> {
  const row = await fetchJson<StoredRunRow>(`/api/v1/runs/${encodeURIComponent(runId)}`);
  return {
    status: "ok",
    requestId: row.requestId ?? row.request_id,
    module: row.module,
    code: row.code,
    version: row.version,
    normalizedInputs: row.normalizedInputs ?? row.normalized_inputs ?? {},
    results: row.result_payload,
    checks: row.checks as any,
    steps: row.steps as any,
    warnings: row.warnings,
    // Stored rows currently persist result/check/step/warning snapshots.
    // Report/detailing payloads are returned as empty objects for replay views.
    reportPayload: {},
    detailingPayload: {},
  } as CalcApiResponse;
}

// ─── Report generation ────────────────────────────────────

export interface ReportRef {
  id: string;
  storageKey: string;
  artifactType: string;
  createdAt: string;
}

export async function generateReport(runId: string): Promise<ReportRef> {
  return fetchJson<ReportRef>(`/api/v1/reports/${encodeURIComponent(runId)}/generate`, {
    method: "POST",
  });
}

// ─── Health ───────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string }> {
  return fetchJson<{ status: string }>("/health");
}
