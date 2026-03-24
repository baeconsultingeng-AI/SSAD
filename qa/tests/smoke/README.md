# API Smoke Flow

This folder contains deployment-targeted smoke checks for SSAD API workflows.

## Script

- `api_flow_smoke.py`

## What It Verifies

1. `/health` is reachable and returns `status=ok`.
2. `/api/v1/calc` returns a successful deterministic result.
3. `/api/v1/projects/{projectId}/runs` returns a list response.
4. `/api/v1/reports/{runId}/generate` returns report artifact metadata.

## Run Example

```bash
python qa/tests/smoke/api_flow_smoke.py \
  --base-url https://staging-api.example.com \
  --project-id <existing-project-uuid> \
  --api-key <optional-api-key>
```

## Notes

- `project-id` must be a valid project UUID in the target environment.
- If backend API auth is enabled (`API_AUTH_KEY`), pass matching `--api-key`.
- Script exits with code `0` on pass and `1` on failure.
