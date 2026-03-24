"""
API smoke flow checker for deployed SSAD environments.

Flow:
1. GET /health
2. POST /api/v1/calc
3. GET /api/v1/projects/{project_id}/runs
4. POST /api/v1/reports/{run_id}/generate

Usage:
  python qa/tests/smoke/api_flow_smoke.py \
    --base-url https://staging-api.example.com \
    --project-id <project-id> \
    --api-key <optional-api-key>

Exit code:
  0 on success, 1 on failure.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def _request_json(
    method: str,
    url: str,
    *,
    api_key: str | None = None,
    payload: dict[str, Any] | None = None,
    timeout: float = 20.0,
) -> tuple[int, dict[str, Any]]:
    headers: dict[str, str] = {"Accept": "application/json"}
    body: bytes | None = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode("utf-8")
    if api_key:
        headers["X-API-Key"] = api_key

    req = Request(url=url, method=method, headers=headers, data=body)
    try:
        with urlopen(req, timeout=timeout) as resp:
            status = resp.getcode()
            raw = resp.read().decode("utf-8")
            data = json.loads(raw) if raw else {}
            return status, data
    except HTTPError as exc:
        raw = exc.read().decode("utf-8") if exc.fp else ""
        try:
            data = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            data = {"raw": raw}
        return exc.code, data
    except URLError as exc:
        raise RuntimeError(f"Network error calling {url}: {exc}") from exc


def _build_calc_payload(project_id: str) -> dict[str, Any]:
    request_id = f"smoke-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    return {
        "requestId": request_id,
        "module": "rc_beam_bs_v1",
        "code": "BS",
        "version": "1.0",
        "project": {"projectId": project_id},
        "inputs": {
            "geometry": {
                "span": 5.0,
                "b": 250.0,
                "h": 450.0,
                "cover": 30.0,
                "support_type": "simply_supported",
            },
            "materials": {"fcu": 30.0, "fy": 460.0},
            "loads": {"gk": 10.0, "qk": 7.5},
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run SSAD API smoke flow checks")
    parser.add_argument("--base-url", required=True, help="API base URL, e.g. https://staging-api.example.com")
    parser.add_argument("--project-id", required=True, help="Existing project UUID for runs listing")
    parser.add_argument("--api-key", default="", help="Optional X-API-Key for protected /api/v1 routes")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    api_key = args.api_key.strip() or None
    project_id = args.project_id.strip()

    failures: list[str] = []

    print("[1/4] Health check")
    status, data = _request_json("GET", f"{base_url}/health", api_key=api_key)
    if status != 200 or data.get("status") != "ok":
        failures.append(f"Health failed: status={status}, data={data}")
    else:
        print("  PASS")

    print("[2/4] Calculation endpoint")
    payload = _build_calc_payload(project_id)
    status, data = _request_json("POST", f"{base_url}/api/v1/calc", api_key=api_key, payload=payload)
    run_id = data.get("runId") if isinstance(data, dict) else None
    if status != 200 or not isinstance(data, dict) or data.get("status") != "ok":
        failures.append(f"Calc failed: status={status}, data={data}")
    else:
        print(f"  PASS (runId={run_id})")

    print("[3/4] Project runs listing")
    status, data = _request_json(
        "GET",
        f"{base_url}/api/v1/projects/{project_id}/runs?limit=20&offset=0",
        api_key=api_key,
    )
    if status != 200 or not isinstance(data, list):
        failures.append(f"Project runs failed: status={status}, data={data}")
    else:
        print(f"  PASS (rows={len(data)})")

    print("[4/4] Report metadata generation")
    if not run_id:
        failures.append("Report generation skipped: runId missing from calc response")
    else:
        status, data = _request_json(
            "POST",
            f"{base_url}/api/v1/reports/{run_id}/generate",
            api_key=api_key,
            payload={},
        )
        if status != 200 or not isinstance(data, dict) or "id" not in data:
            failures.append(f"Report generation failed: status={status}, data={data}")
        else:
            print(f"  PASS (artifactId={data.get('id')})")

    if failures:
        print("\nSMOKE RESULT: FAIL")
        for item in failures:
            print(f"- {item}")
        return 1

    print("\nSMOKE RESULT: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
