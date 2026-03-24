# API Contract - Version 1 (BS)

## Base

- Namespace: /api/v1
- Content type: application/json

## Endpoints

1. POST /api/v1/calc
- Executes deterministic calculation for a selected module.

2. GET /api/v1/projects/:projectId/runs
- Lists runs for a project.

3. GET /api/v1/runs/:runId
- Returns stored deterministic result payload.

4. POST /api/v1/reports/:runId/generate
- Generates report artifact metadata and storage reference.

## POST /calc Request Schema

```json
{
  "requestId": "req_20260324_001",
  "module": "rc_beam_bs_v1",
  "code": "BS",
  "version": "1.0",
  "project": {
    "projectId": "uuid",
    "elementId": "uuid"
  },
  "inputs": {
    "geometry": {},
    "materials": {},
    "loads": {},
    "design": {}
  },
  "meta": {
    "units": "metric",
    "requestedBy": "user_uuid"
  }
}
```

## POST /calc Success Response Schema

```json
{
  "status": "ok",
  "requestId": "req_20260324_001",
  "module": "rc_beam_bs_v1",
  "code": "BS",
  "version": "1.0",
  "normalizedInputs": {},
  "results": {
    "verdict": "pass",
    "utilization": 0.78,
    "summary": "Section satisfies governing checks"
  },
  "checks": [
    {
      "id": "flexure_uls",
      "label": "Flexure ULS",
      "status": "pass",
      "value": 210.4,
      "limit": 270.0,
      "clause": "BS xxxx"
    }
  ],
  "steps": [],
  "warnings": [],
  "reportPayload": {},
  "detailingPayload": {}
}
```

## Error Envelope

```json
{
  "status": "error",
  "requestId": "req_20260324_001",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid",
    "details": [
      {
        "field": "inputs.geometry.width",
        "issue": "must be greater than zero"
      }
    ]
  }
}
```

## Contract Rules

1. AI fields cannot bypass schema validation.
2. Deterministic response must contain checks and verdict.
3. Missing clause references are treated as contract violation.
4. Unknown module or version returns deterministic error only.
