# Stage 2 Architecture Lock (Version 1 - BS Only)

## Stage Objective

Lock implementation architecture for V1 while preserving existing Claude-designed UI behavior and flow.

Stage 2 inventory baseline source:

- Stage-1-Structural-Blueprint.md
- Agent-02-Comprehensive-Review-Report-Stage1.md

## Architecture Principles

1. UI parity first
- Preserve existing UI and interactions during refactor.

2. Deterministic engineering boundary
- AI never acts as final calculator.
- Python engine is the calculation authority.

3. Contract-first integration
- Frontend, backend, and database integrate through typed contracts.

4. Traceability and auditability
- Every calculation must be reproducible from stored payloads.

## Locked Tech Stack (V1)

1. Frontend
- Next.js (TypeScript)
- Componentized migration of existing screens

2. Backend
- Flask API (Python)
- Deterministic BS module engine

3. Database
- Supabase Postgres

4. Object storage
- Cloudflare R2 (reports and drawing artifacts)

5. Hosting and delivery
- Azure-hosted frontend and backend
- GitHub Actions for CI/CD

## Architecture Layers

1. Presentation layer (frontend)
- Screen modules replicating current UI.
- Client-side state and API client adapters.

2. Orchestration layer
- AI extraction and confirm workflow services.
- Deterministic API request assembly.

3. Calculation API layer
- Module endpoints by element family.
- Validation, deterministic compute, and result assembly.

4. Persistence layer
- Project, element, calculation, report metadata.
- Snapshot storage for replay and audit.

## Module Boundaries (V1)

1. Frontend modules
- workspace
- ai-chat
- results
- report
- detailing
- projects
- settings
- auth
- upgrade

2. Backend calc modules
- rc_slab_bs_v1
- rc_beam_bs_v1
- rc_column_bs_v1
- rc_foundation_bs_v1
- steel_beam_bs_v1
- steel_column_bs_v1
- steel_truss_bs_v1
- steel_portal_bs_v1

P0 subtype scope baseline (from Stage 1 review-approved inventory):

- RC Slab: one-way, two-way, cantilever
- RC Beam: simply supported, continuous (scoped), cantilever
- RC Column: axial short, uniaxial short, biaxial short (scoped)
- RC Foundation: isolated pad, strip footing (basic), combined footing
- Steel: beam (primary case), column (primary case), truss (baseline), portal frame (baseline)

## Non-Functional Locks

1. Deterministic reproducibility required for accepted outputs.
2. Explicit validation errors required for missing or invalid inputs.
3. Unified verdict model: pass, warn, fail.
4. Clause-linked checks required in result payload.

## Stage 2 Exit Criteria

1. System architecture accepted.
2. Integration contracts accepted.
3. Data model accepted.
4. Security baseline accepted.
5. Stage 3 implementation sequencing accepted.
