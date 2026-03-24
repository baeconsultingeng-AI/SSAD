# Deterministic Verification Checklist - Version 1 (BS Only)

Use this checklist before accepting any module into V1 production scope.

## 1. Input Validation

1. Required fields are enforced.
2. Unit mismatches are rejected.
3. Range sanity checks exist for key variables.
4. Ambiguous inputs return structured validation errors.

## 2. Deterministic Boundary Enforcement

1. AI extraction output is treated as candidate input, not final calculation.
2. Confirmed parameters are passed to deterministic engine.
3. Final design values come only from engine response.
4. Report values match engine response values exactly.

## 3. Calculation Traceability

1. Each check has identifiable code reference.
2. Steps are emitted in deterministic order.
3. Governing check and utilization are explicit.
4. Warning generation logic is deterministic and repeatable.

## 4. Numerical Reproducibility

1. Same inputs produce same outputs across repeated runs.
2. Rounding policy is documented and consistent.
3. No hidden randomness exists in engine path.
4. Regression test snapshots exist for representative cases.

## 5. Engineering QA (Structural Review)

1. Representative sample calculations manually checked by structural reviewer.
2. Boundary-case checks reviewed (high utilization, near limits).
3. Pass/warn/fail thresholds validated against module intent.
4. Clause references verified against module documentation.

## 6. UI and Report Integrity

1. UI displays engine outputs without transformation drift.
2. Result card utilization equals report utilization.
3. Report governing check equals result card governing check.
4. Detailing payload consumes engine-approved values.

## 7. Persistence Integrity

1. Stored calculation record includes full input snapshot.
2. Stored output includes deterministic result payload and version tags.
3. Record can be replayed to reconstruct report/details.
4. Audit fields include timestamp, module, code, and version.

## 8. Release Readiness Criteria

A module is release-ready only if:

1. All checklist sections pass.
2. Known limitations are documented.
3. Reviewer signoff is recorded.
4. Stage gate approval is granted.
