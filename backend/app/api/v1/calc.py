from __future__ import annotations

import importlib
import os
from datetime import datetime, timezone
from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS

from app.db import runs_repo
from app.ai import extractor as ai_extractor

# ── Module registry ───────────────────────────────────────────────────────────
# Maps module identifier strings to importable Python paths.
# Add new modules here as they are implemented; no other file needs to change.
_MODULE_REGISTRY: dict[str, str] = {
    "rc_beam_bs_v1":        "app.calc_modules.rc_beam_bs_v1",
    "rc_slab_bs_v1":        "app.calc_modules.rc_slab_bs_v1",
    "rc_column_bs_v1":      "app.calc_modules.rc_column_bs_v1",
    "rc_foundation_bs_v1":  "app.calc_modules.rc_foundation_bs_v1",
    "steel_beam_bs_v1":     "app.calc_modules.steel_beam_bs_v1",
    "steel_column_bs_v1":   "app.calc_modules.steel_column_bs_v1",
    "steel_truss_bs_v1":    "app.calc_modules.steel_truss_bs_v1",
    "steel_portal_bs_v1":   "app.calc_modules.steel_portal_bs_v1",
}

_REQUIRED_FIELDS = ("requestId", "module", "code", "version", "inputs")


def _run_module(module_id: str, inputs: dict[str, Any]) -> dict[str, Any]:
    """Import and execute a deterministic calc module by registry key."""
    module_path = _MODULE_REGISTRY.get(module_id)
    if module_path is None:
        return {
            "status": "error",
            "error": {
                "code": "MODULE_NOT_FOUND",
                "message": f"Module '{module_id}' is not registered or not yet implemented.",
                "details": [{"field": "module", "issue": f"Unknown module: {module_id}"}],
            },
        }
    mod = importlib.import_module(module_path)
    return mod.run(inputs)  # type: ignore[no-any-return]


def create_app() -> Flask:
    app = Flask(__name__)
    api_auth_key = os.getenv("API_AUTH_KEY", "").strip()

    # CORS — registered first so its before_request handles OPTIONS preflight
    # before our auth middleware ever runs.
    CORS(
        app,
        origins=[r"http://localhost:.*", r"http://127\.0\.0\.1:.*"],
        allow_headers=["Content-Type", "X-API-Key"],
        methods=["GET", "POST", "OPTIONS"],
        max_age=86400,
    )

    @app.before_request
    def enforce_api_key():
        # Auth applies only to API routes and is opt-in via API_AUTH_KEY.
        if request.method == "OPTIONS":
            return None  # CORS preflight always allowed
        if not api_auth_key:
            return None
        if not request.path.startswith("/api/v1/"):
            return None
        provided = request.headers.get("X-API-Key", "").strip()
        if provided == api_auth_key:
            return None
        return jsonify({
            "status": "error",
            "error": {
                "code": "UNAUTHORIZED",
                "message": "Missing or invalid API key.",
            },
        }), 401

    # ── Health ────────────────────────────────────────────────────────────────
    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "service": "ssad-calc-api-v1"})

    # ── POST /api/v1/calc ─────────────────────────────────────────────────────
    @app.post("/api/v1/calc")
    def calc_v1():
        payload: dict[str, Any] = request.get_json(silent=True) or {}
        request_id = payload.get("requestId", "unknown")
        project_meta = payload.get("project") or {}
        if not isinstance(project_meta, dict):
            project_meta = {}

        # Support both nested `project.projectId/elementId` (contract) and
        # legacy top-level fields for backward compatibility.
        project_id = project_meta.get("projectId") or payload.get("projectId")
        element_id = project_meta.get("elementId") or payload.get("elementId")

        # 1. Envelope-level required-field check
        missing = [f for f in _REQUIRED_FIELDS if f not in payload]
        if missing:
            return jsonify({
                "status":    "error",
                "requestId": request_id,
                "error": {
                    "code":    "VALIDATION_ERROR",
                    "message": "One or more required envelope fields are missing",
                    "details": [
                        {"field": f, "issue": "required field missing"} for f in missing
                    ],
                },
            }), 400

        # 2. Dispatch to deterministic module
        result = _run_module(payload["module"], payload.get("inputs") or {})

        # 3. Propagate envelope metadata onto successful responses
        if result.get("status") == "ok":
            result["requestId"] = request_id
            result.setdefault("module",  payload["module"])
            result.setdefault("code",    payload["code"])
            result.setdefault("version", payload["version"])

            # Persist — fire-and-forget; failures are logged but never surface to caller
            try:
                run_id = runs_repo.save_run(
                    request_id        = request_id,
                    module            = payload["module"],
                    code              = payload["code"],
                    version           = payload["version"],
                    status            = "ok",
                    normalized_inputs = result.get("normalizedInputs") or {},
                    result_payload    = result.get("results") or {},
                    steps             = result.get("steps") or [],
                    warnings          = result.get("warnings") or [],
                    checks            = result.get("checks") or [],
                    project_id        = project_id,
                    element_id        = element_id,
                    created_by        = payload.get("userId"),
                )
                if run_id:
                    result["runId"] = run_id
            except Exception:
                pass  # persistence failure must never break the calculation response

            return jsonify(result), 200

        # 4. Error responses — still include requestId for traceability
        result["requestId"] = request_id
        return jsonify(result), 400

    # ── GET /api/v1/projects/:projectId/runs ────────────────────────────────
    @app.get("/api/v1/projects/<project_id>/runs")
    def project_runs(project_id: str):
        limit  = min(int(request.args.get("limit",  "50")), 200)
        offset = max(int(request.args.get("offset", "0")),  0)
        rows = runs_repo.get_runs_by_project(project_id, limit=limit, offset=offset)
        return jsonify(rows), 200

    # ── GET /api/v1/runs/:runId ──────────────────────────────────────────────
    @app.get("/api/v1/runs/<run_id>")
    def get_run(run_id: str):
        row = runs_repo.get_run_by_id(run_id)
        if row is None:
            return jsonify({
                "status": "error",
                "error": {"code": "NOT_FOUND", "message": f"Run '{run_id}' not found."},
            }), 404
        return jsonify(row), 200

    # ── POST /api/v1/report/render ────────────────────────────────────────────
    @app.post("/api/v1/report/render")
    def render_report():
        """
        Render formula steps through the Python handcalcs engine.
        Accepts  { steps: [{ label, expression, value, unit?, clause? }, ...] }
        Returns  { status:"ok", engine:"handcalcs"|"fallback", items:[...] }
        """
        payload: dict[str, Any] = request.get_json(silent=True) or {}
        steps = payload.get("steps", [])
        if not isinstance(steps, list):
            return jsonify({
                "status": "error",
                "error": {"code": "VALIDATION_ERROR", "message": "'steps' must be a list."},
            }), 400

        from app.reporting.handcalcs_report import render_formula_steps  # noqa: PLC0415
        result = render_formula_steps([
            {k: v for k, v in s.items() if isinstance(s, dict)}
            for s in steps if isinstance(s, dict)
        ])
        return jsonify({"status": "ok", **result}), 200

    # ── POST /api/v1/reports/:runId/generate ─────────────────────────────────
    @app.post("/api/v1/reports/<run_id>/generate")
    def generate_report(run_id: str):
        run_row = runs_repo.get_run_by_id(run_id)
        if run_row is None:
            return jsonify({
                "status": "error",
                "error": {"code": "NOT_FOUND", "message": f"Run '{run_id}' not found."},
            }), 404

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        storage_key = f"reports/{run_id}/{timestamp}.json"

        artifact = runs_repo.create_report_artifact(
            run_id=run_id,
            artifact_type="report",
            storage_key=storage_key,
        )
        if artifact is None:
            return jsonify({
                "status": "error",
                "error": {
                    "code": "PERSISTENCE_UNAVAILABLE",
                    "message": "Could not persist report artifact metadata.",
                },
            }), 503

        return jsonify({
            "id": artifact["id"],
            "storageKey": artifact["storage_key"],
            "artifactType": artifact["artifact_type"],
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }), 200

    # ── POST /api/v1/ai/extract ──────────────────────────────────────────────
    @app.post("/api/v1/ai/extract")
    def ai_extract():
        payload: dict[str, Any] = request.get_json(silent=True) or {}
        description = (payload.get("description") or "").strip()
        if not description:
            return jsonify({
                "status": "error",
                "error": {"code": "VALIDATION_ERROR", "message": "Field 'description' is required."},
            }), 400

        try:
            result = ai_extractor.extract_params(description)
            return jsonify({
                "status":           "ok",
                "module":           result.get("module"),
                "extracted":        result.get("extracted", {}),
                "summary":          result.get("summary", "Parameters extracted successfully."),
                "confidence":       result.get("confidence", "medium"),
                "missing":          result.get("missing", []),
                "param_confidence": result.get("param_confidence", {}),
            }), 200
        except ValueError as e:
            return jsonify({
                "status": "error",
                "error": {"code": "AI_NOT_CONFIGURED", "message": str(e)},
            }), 503
        except Exception as e:
            return jsonify({
                "status": "error",
                "error": {"code": "AI_ERROR", "message": f"AI extraction failed: {str(e)}"},
            }), 500

    return app
