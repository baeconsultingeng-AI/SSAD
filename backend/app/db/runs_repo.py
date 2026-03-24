"""
app/db/runs_repo.py
───────────────────
Repository for the `calculation_runs` table.

All public functions return None / [] silently when the Supabase
client is not configured, so the calculation API degrades gracefully.

Schema (from supabase/migrations):
    id                uuid PRIMARY KEY
    project_id        uuid REFERENCES projects
    element_id        uuid REFERENCES elements (nullable)
    request_id        text UNIQUE NOT NULL
    module            text NOT NULL
    code              text NOT NULL
    version           text NOT NULL
    status            text NOT NULL  ('ok' | 'error' | 'pending')
    normalized_inputs jsonb
    result_payload    jsonb
    steps             jsonb
    warnings          jsonb
    checks            jsonb
    created_by        uuid REFERENCES users (nullable)
    created_at        timestamptz
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from app.db.client import get_client

log = logging.getLogger(__name__)

_TABLE = "calculation_runs"


def save_run(
    *,
    request_id: str,
    module: str,
    code: str,
    version: str,
    status: str,
    normalized_inputs: dict[str, Any],
    result_payload:    dict[str, Any],
    steps:             list[dict[str, Any]],
    warnings:          list[str],
    checks:            list[dict[str, Any]],
    project_id: str | None = None,
    element_id: str | None = None,
    created_by: str | None = None,
) -> str | None:
    """
    Insert a completed calculation run into Supabase.

    Returns the generated UUID string on success, or None if persistence
    is unavailable or the insert fails.
    """
    sb = get_client()
    if sb is None:
        return None

    run_id = str(uuid.uuid4())
    row: dict[str, Any] = {
        "id":                run_id,
        "request_id":        request_id,
        "module":            module,
        "code":              code,
        "version":           version,
        "status":            status,
        "normalized_inputs": normalized_inputs,
        "result_payload":    result_payload,
        "steps":             steps,
        "warnings":          warnings,
        "checks":            checks,
    }
    if project_id:
        row["project_id"] = project_id
    if element_id:
        row["element_id"] = element_id
    if created_by:
        row["created_by"] = created_by

    try:
        sb.table(_TABLE).insert(row).execute()
        log.debug("Saved run %s (module=%s, status=%s)", run_id, module, status)
        return run_id
    except Exception as exc:
        log.error("Failed to save run %s: %s", run_id, exc)
        return None


def get_run_by_id(run_id: str) -> dict[str, Any] | None:
    """
    Fetch a single calculation run by its UUID.

    Returns the row dict, or None if not found / persistence unavailable.
    """
    sb = get_client()
    if sb is None:
        return None

    try:
        resp = sb.table(_TABLE).select("*").eq("id", run_id).limit(1).execute()
        rows = resp.data or []
        return rows[0] if rows else None
    except Exception as exc:
        log.error("Failed to fetch run %s: %s", run_id, exc)
        return None


def get_runs_by_project(
    project_id: str, *, limit: int = 50, offset: int = 0
) -> list[dict[str, Any]]:
    """
    List calculation runs for a project, newest first.

    Returns a list of row dicts (may be empty).
    """
    sb = get_client()
    if sb is None:
        return []

    try:
        resp = (
            sb.table(_TABLE)
            .select(
                "id, request_id, module, code, version, status, "
                "created_at, result_payload->>verdict"
            )
            .eq("project_id", project_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return resp.data or []
    except Exception as exc:
        log.error("Failed to list runs for project %s: %s", project_id, exc)
        return []


def create_report_artifact(
    *,
    run_id: str,
    artifact_type: str = "report",
    storage_key: str,
    checksum: str | None = None,
) -> dict[str, Any] | None:
    """
    Insert a report artifact metadata row for a calculation run.

    Returns the inserted row-like dict on success, or None when persistence is
    unavailable / insert fails.
    """
    sb = get_client()
    if sb is None:
        return None

    artifact_id = str(uuid.uuid4())
    row: dict[str, Any] = {
        "id": artifact_id,
        "calculation_run_id": run_id,
        "artifact_type": artifact_type,
        "storage_key": storage_key,
    }
    if checksum:
        row["checksum"] = checksum

    try:
        sb.table("report_artifacts").insert(row).execute()
        log.debug("Saved report artifact %s for run %s", artifact_id, run_id)
        return row
    except Exception as exc:
        log.error("Failed to save report artifact for run %s: %s", run_id, exc)
        return None
