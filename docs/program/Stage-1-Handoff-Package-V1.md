# Stage 1 Handoff Package - Version 1 (BS Only)

This package translates the Stage 1 blueprint into implementation-ready directives for build agents.

## Handoff to Agent 03 (Frontend)

### Objectives

1. Preserve current Claude-designed UI and interactions.
2. Migrate screen structure into modular frontend components.
3. Integrate deterministic API contract without visual drift.

### Required Inputs from Stage 1

1. UI-Preservation-Migration-Plan.md
2. UI-Parity-Checklist-V1.md
3. Calculation-IO-Schemas-V1.md

### Deliverables

1. Screen/component map preserving current flow.
2. Typed API client for deterministic endpoints.
3. Confirm-stage binding to normalized input schema.
4. Result/report/detailing renderers bound to deterministic payload.

## Handoff to Agent 04 (Backend + Engine)

### Objectives

1. Implement deterministic BS-only calculation modules for V1 scope.
2. Expose stable API contracts aligned to schemas.
3. Emit traceable checks, steps, warnings, and report/detailing payloads.

### Required Inputs from Stage 1

1. BS-Method-Map-V1.md
2. Calculation-IO-Schemas-V1.md
3. Deterministic-Verification-Checklist-V1.md
4. Agent-02-Comprehensive-Review-Report-Stage1.md

### Deliverables

1. Flask service with module-based endpoints.
2. Deterministic calculation modules for P0 families.
3. Validation and error contracts.
4. Test fixtures for repeatability and regression.

## Handoff to Agent 05 (Database)

### Objectives

1. Design persistence schema supporting auditability and replay.
2. Support project, element, calculation, report metadata, and verification records.
3. Align storage with deterministic boundary requirements.

### Required Inputs from Stage 1

1. Calculation-IO-Schemas-V1.md
2. Deterministic-Verification-Checklist-V1.md

### Deliverables

1. Supabase schema draft with relationships.
2. Persistence strategy for input/output snapshots.
3. Query layer design for project history and report retrieval.

## Shared Cross-Agent Contracts

1. Module naming consistency
- rc_slab, rc_beam, rc_column, rc_foundation, steel_beam, steel_column, steel_truss, steel_portal

2. Version tagging
- code=BS, version=1.0 in every persisted record and API response

3. Evidence requirements
- parity evidence for frontend
- deterministic verification evidence for backend
- persistence integrity evidence for database

## Acceptance Conditions Before Stage 2

1. Agent 03 acknowledges UI freeze and parity protocol.
2. Agent 04 acknowledges BS-only deterministic scope for V1.
3. Agent 05 acknowledges replay/audit schema requirements.
4. All three acknowledge shared API and data contracts.
