# Stage 3 Implementation Sequence (Version 1 - BS)

## Objective

Execute modular build in dependency order with parallel tracks and gated integration.

## Sprint 1: Foundation

1. Frontend
- Initialize Next.js TypeScript app shell.
- Create frozen UI token and layout map from existing prototype.

2. Backend
- Initialize Flask project structure.
- Implement /api/v1/calc stub with validation scaffold.

3. Database
- Create Supabase schema migrations for core tables.
- Enable RLS base policies.

4. QA
- Create contract and parity test harness skeleton.

## Sprint 2: Core Vertical Slice

1. Frontend
- Implement AI confirm flow UI parity.
- Connect to calc API client.

2. Backend
- Implement first deterministic module (rc_beam_bs_v1).
- Return standardized checks and payloads.

3. Database
- Persist run snapshots and project associations.

4. QA
- Validate end-to-end request -> deterministic result -> persistence.

## Sprint 3: P0 Module Expansion

1. Backend
- Add remaining P0 BS modules.

2. Frontend
- Add result/report/detailing views per payload contracts.

3. Database
- Add report artifact metadata and retrieval queries.

4. QA
- Run deterministic verification checklist.

## Sprint 4: Hardening and Release Readiness

1. Security
- Validate auth boundaries and RLS behavior.

2. Performance
- Baseline latency and optimize module hotspots.

3. DevOps
- Set CI/CD gates in GitHub Actions.
- Deploy staging on Azure.

4. Release
- Gate review for Stage 4 approval.

## Integration Gates Inside Stage 3

1. Gate A (after Sprint 1)
- Foundation stack running with health checks.

2. Gate B (after Sprint 2)
- First vertical slice accepted.

3. Gate C (after Sprint 3)
- All P0 modules integrated and validated.

4. Gate D (after Sprint 4)
- Release readiness accepted.
