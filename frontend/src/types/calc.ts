// ─── Calc contract types aligned to API-Contract-V1.md ───

export type CalcCode = "BS" | "EC" | "ACI";
export type Verdict = "pass" | "warn" | "fail";
export type UserTier = "guest" | "trial" | "pro";

// ─── Request ──────────────────────────────────────────────

export interface CalcRequest {
  requestId: string;
  module: string;
  code: CalcCode;
  version: string;
  project?: {
    projectId?: string;
    elementId?: string;
  };
  inputs: {
    geometry?: Record<string, unknown>;
    materials?: Record<string, unknown>;
    loads?: Record<string, unknown>;
    design?: Record<string, unknown>;
  };
  meta?: {
    units?: "metric" | "imperial";
    requestedBy?: string;
  };
}

// ─── Response ─────────────────────────────────────────────

export interface CalcCheck {
  id: string;
  label: string;
  status: Verdict;
  value: number;
  limit: number;
  clause: string;
}

export interface CalcResult {
  verdict: Verdict;
  utilization: number;
  summary: string;
}

export interface CalcStep {
  label: string;
  expression: string;
  value: number;
  unit?: string;
  clause?: string;
}

export interface CalcResponse {
  status: "ok";
  requestId: string;
  module: string;
  code: CalcCode;
  version: string;
  normalizedInputs: Record<string, unknown>;
  results: CalcResult;
  checks: CalcCheck[];
  steps: CalcStep[];
  warnings: string[];
  reportPayload: Record<string, unknown>;
  detailingPayload: Record<string, unknown>;
}

// ─── Error envelope ───────────────────────────────────────

export interface CalcErrorDetail {
  field: string;
  issue: string;
}

export interface CalcError {
  status: "error";
  requestId: string;
  error: {
    code: string;
    message: string;
    details?: CalcErrorDetail[];
  };
}

export type CalcApiResponse = CalcResponse | CalcError;

// ─── Screen navigation (parity with prototype SCREENS) ────

export type ScreenName =
  | "workspace"
  | "ai"
  | "steel"
  | "result"
  | "report"
  | "detailing"
  | "steel-beam"
  | "steel-col"
  | "steel-truss"
  | "projects"
  | "settings"
  | "upgrade"
  | "auth";

// ─── AI extraction ────────────────────────────────────────

export interface ExtractedParams {
  module: string;           // full module ID from AI, e.g. "rc_beam_bs_v1"
  elementType: string;      // kept for backwards compat
  geometry: Record<string, unknown>;
  materials: Record<string, unknown>;
  loads: Record<string, unknown>;
  design: Record<string, unknown>;
  confidence: "high" | "medium" | "low";
  missing: string[];
}
