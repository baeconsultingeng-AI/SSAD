# Stage 2 Handoff Package (Architecture Lock to Implementation)

## Purpose

Translate approved architecture lock into implementation directives for Stage 3 build execution.

## Required Inputs

1. Stage-2-Architecture-Lock.md
2. System-Architecture-V1.md
3. API-Contract-V1.md
4. Data-Architecture-Supabase-V1.md
5. Security-Baseline-V1.md
6. Agent-02-Comprehensive-Review-Report-Stage1.md

## Handoff to Agent 03 (Frontend)

### Build directives

1. Create Next.js TypeScript structure preserving current UI parity.
2. Implement screen modules mapped from frozen UI inventory.
3. Implement API client using Calculation-IO-Schemas-V1.
4. Bind result/report/detailing renderers to deterministic payload only.

### Acceptance evidence

1. UI parity checklist pass evidence.
2. Critical workflow pass evidence.

## Handoff to Agent 04 (Backend)

### Build directives

1. Create Flask service with contract-first endpoints.
2. Implement validation layer before module execution.
3. Implement deterministic BS modules for P0 scope.
4. Return standardized checks, steps, warnings, and payloads.

### Acceptance evidence

1. Deterministic verification checklist pass evidence.
2. Regression reproducibility test output.

## Handoff to Agent 05 (Database)

### Build directives

1. Implement Supabase schema for:
- users
- projects
- elements
- calculation_runs
- report_artifacts
- audit_events
2. Store request/response snapshots for replay.
3. Support retrieval for project list, result replay, and report regeneration.

### Acceptance evidence

1. Schema migration scripts.
2. Query examples for key workflows.

## Handoff to Agent 06 (QA)

### Build directives

1. Build test matrix for critical workflows and module outcomes.
2. Add deterministic reproducibility tests.
3. Add API contract conformance tests.

## Handoff to Agent 07 (Code Review)

### Build directives

1. Verify deterministic boundary enforcement.
2. Verify security baseline adherence.
3. Verify contract and schema consistency.

## Handoff to Agent 08 (Documentation)

### Build directives

1. Produce developer onboarding docs.
2. Produce API and module docs.
3. Produce operations and troubleshooting notes.

## Handoff to Agent 09 (DevOps)

### Preconditions

- Stages 3 and 4 approved.

### Build directives

1. Configure Azure deployment for frontend/backend.
2. Configure GitHub Actions CI/CD with gated promotion.
3. Configure environment settings for Supabase and R2.

## Stage 3 Start Conditions

1. Frontend, backend, and database teams acknowledge contracts.
2. Implementation sequencing is accepted.
3. Gate 2 approval is granted.
