# SSAD Stage 0 Work Package

## Stage Objective

Create execution-ready governance and delivery baseline before feature implementation.

## Inputs

- User-approved versioning: V1 = BS-only, V2 = Eurocode, V3 = ACI.
- AI-centric deterministic architecture requirement.
- Multi-agent team structure and priority/dependency ordering.
- Approval required at every stage transition.

## Stage 0 Deliverables

1. Versioned roadmap and scope lock.
2. Agent orchestration model and dependency map.
3. Stage gates and explicit approval checklist.
4. Initial risk register.
5. Stage 1 kickoff package definition.
6. UI preservation migration plan and parity checklist.

## Agent Orchestration (as directed)

1. Agent 01 - Project Leader (GPT-5.3-Codex)
- Owns planning, sequencing, integration, and stage governance.
- Must complete setup and planning baseline first.

2. Agent 02 - Structural Engineer (GPT-5.3-Codex)
- Produces structural element prioritization and implementation roadmap.
- Must complete core roadmap before Agent 04 calc-engine implementation starts.

3. Agents 03/04/05 - Build Core (parallel)
- Agent 03 Frontend (Next.js UI and integration).
- Agent 04 Backend (Flask + deterministic Python engine + APIs).
- Agent 05 Database (Supabase schema, queries, integration support).

4. Agents 06/07/08 - Assurance and Documentation (post core build)
- QA, code review/security review, and documentation.

5. Agent 09 - DevOps (final stage)
- Deployment and CI/CD after 02-08 complete required outputs.

## Stage Dependencies

- Stage 0 completion is required before Stage 1 starts.
- Stage 1 structural roadmap approval is required before Stage 2 architecture lock.
- Stage 2 approval is required before Stage 3 implementation.
- Stage 3 completion is required before Stage 4 QA/review.
- Stage 4 completion is required before Stage 5 deployment.

## Initial Risk Register

1. Scope expansion risk
- Risk: Too many code systems and element classes in one cycle.
- Mitigation: Version locking (V1 BS-only) and strict gate approval.

2. Determinism boundary erosion
- Risk: AI output leaks into direct calculations.
- Mitigation: Enforce engine-only calculation contract and result provenance.

3. Monolith migration risk
- Risk: Existing single-file prototype slows scalable build.
- Mitigation: Modular architecture in Stage 2 with phased migration.

4. Code-compliance interpretation variance
- Risk: Clause interpretation inconsistency.
- Mitigation: Clause-level verification templates and Structural Engineer review signoff.

5. Mobile delivery timing risk
- Risk: Parallel mobile hardening delays V1 core.
- Mitigation: Prioritize web production path while keeping mobile-compatible APIs.

## Definition of Done for Stage 0

- Version strategy documented and approved.
- Agent workflow and dependency ordering documented.
- Stage gate checklist documented.
- Initial risks documented.
- Stage 1 kickoff package ready.
- UI preservation migration plan documented.
- UI parity checklist documented.

## Stage 1 Kickoff Package (Prepared)

Stage 1 target: Structural scope blueprint for V1 BS-only.

Required outputs for Stage 1:
1. Complete V1 element inventory (RC and Steel) with priority tiers.
2. BS code method map per element (actions, checks, limit states, detailing outputs).
3. Calculation input/output schema draft per element family.
4. Verification checklist for deterministic engine acceptance.
5. Hand-off package to backend/frontend/database workstreams.

Supporting migration controls already prepared:
1. UI-Preservation-Migration-Plan.md
2. UI-Parity-Checklist-V1.md
