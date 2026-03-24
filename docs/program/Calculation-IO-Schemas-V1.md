# Calculation I/O Schemas - Version 1

These schemas define deterministic engine contracts between frontend AI workflow and backend calculation APIs.

## Global Request Envelope

```json
{
  "module": "rc_beam",
  "code": "BS",
  "version": "v1",
  "requestId": "uuid",
  "projectContext": {
    "projectId": "string",
    "elementId": "string"
  },
  "inputs": {}
}
```

## Global Response Envelope

```json
{
  "module": "rc_beam",
  "code": "BS",
  "version": "v1",
  "requestId": "uuid",
  "status": "ok",
  "normalizedInputs": {},
  "results": {
    "verdict": "PASS",
    "utilizationPct": 78,
    "governingCheck": "deflection",
    "summary": {}
  },
  "checks": [],
  "steps": [],
  "warnings": [],
  "reportPayload": {},
  "detailingPayload": {}
}
```

## rc_slab_bs_v1 Inputs

```json
{
  "subtype": "one_way|two_way",
  "spans": {"lx_m": 4.0, "ly_m": 5.0},
  "thickness_mm": 175,
  "cover_mm": 25,
  "materials": {"concreteGrade": "C35", "steelGrade": "fy460"},
  "loads": {"gk_kNm2": 5.0, "qk_kNm2": 3.0},
  "support": {"condition": "simply_supported|continuous_scoped"}
}
```

## rc_beam_bs_v1 Inputs

```json
{
  "subtype": "simply_supported|continuous|cantilever",
  "span_m": 6.0,
  "section": {"b_mm": 300, "h_mm": 500, "cover_mm": 25},
  "materials": {"concreteGrade": "C35", "steelGrade": "fy460"},
  "loads": {"gk_kNm": 15.0, "qk_kNm": 10.0}
}
```

## rc_column_bs_v1 Inputs

```json
{
  "subtype": "axial|uniaxial|biaxial",
  "section": {"b_mm": 300, "h_mm": 400, "cover_mm": 40},
  "effectiveHeight_m": 3.5,
  "materials": {"concreteGrade": "C35", "steelGrade": "fy460"},
  "actions": {"n_kN": 1200, "mx_kNm": 80, "my_kNm": 0}
}
```

## rc_foundation_bs_v1 Inputs

```json
{
  "subtype": "isolated_pad|strip",
  "geometry": {"L_m": 2.8, "B_m": 2.8, "D_m": 0.55, "cover_mm": 50},
  "materials": {"concreteGrade": "C35", "steelGrade": "fy460"},
  "actions": {"n_kN": 1200},
  "geotech": {"qa_kNm2": 150}
}
```

## steel_beam_bs_v1 Inputs

```json
{
  "subtype": "simply_supported",
  "span_m": 7.5,
  "steelGrade": "S275",
  "loads": {"gk_kNm2": 5.0, "qk_kNm2": 4.0},
  "assumptions": {"tributarySpacing_m": 3.0, "restraint": "scoped"}
}
```

## steel_column_bs_v1 Inputs

```json
{
  "subtype": "axial|axial_bending",
  "effectiveLength_m": 4.0,
  "steelGrade": "S275",
  "actions": {"n_kN": 900, "my_kNm": 45}
}
```

## steel_truss_bs_v1 Inputs

```json
{
  "subtype": "pratt|warren|howe|fink",
  "geometry": {"span_m": 18.0, "depth_m": 2.25, "panels": 4},
  "steelGrade": "S275",
  "loads": {"gk_kNm2": 0.75, "qk_kNm2": 0.6}
}
```

## steel_portal_bs_v1 Inputs

```json
{
  "subtype": "single_span_scoped",
  "geometry": {"span_m": 20.0, "height_m": 6.0},
  "steelGrade": "S275",
  "loads": {"gk_kNm2": 0.75, "qk_kNm2": 0.6},
  "assumptions": {"sway": true}
}
```

## Mandatory Check Object Schema

```json
{
  "id": "string",
  "name": "string",
  "codeRef": "string",
  "status": "pass|warn|fail",
  "utilizationPct": 0,
  "demand": 0,
  "capacity": 0,
  "units": "string"
}
```

## Mandatory Step Object Schema

```json
{
  "order": 1,
  "label": "string",
  "formula": "string",
  "substitution": "string",
  "result": "string",
  "codeRef": "string"
}
```

## Response Error Contract

```json
{
  "status": "error",
  "requestId": "uuid",
  "errors": [
    {
      "field": "span_m",
      "code": "MISSING_REQUIRED_INPUT",
      "message": "span_m is required for module rc_beam"
    }
  ]
}
```

## Contract Rules

1. Units are explicit in field names where practical.
2. Engine returns normalizedInputs to avoid UI ambiguity.
3. reportPayload must be sufficient for report rendering without recomputation.
4. detailingPayload must be sufficient for detailing screen rendering without recomputation.
5. No hidden AI-side calculations are allowed outside deterministic engine outputs.
