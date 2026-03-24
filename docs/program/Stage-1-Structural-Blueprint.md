# Stage 1 Structural Blueprint (Version 1 - BS Only)

## Scope Lock for Stage 1

- Version target: V1 (BS-only)
- UI constraint: preserve existing Claude-designed UI behavior and appearance
- Calculation principle: deterministic engine is calculation authority
- AI role: extraction, confirmation UX, explanation, reporting language

## Element Inventory and Priority

### Priority Tier P0 (MVP launch critical)

1. RC Slab family
- Solid one-way slab
- Solid two-way slab
- Cantilever slab

2. RC Beam family
- Simply supported beam
- Continuous beam (basic coefficients and redistribution constraints)
- Cantilever beam

3. RC Column family
- Axially loaded short column
- Uniaxial short column
- Biaxial short column (interaction approach)

4. RC Foundation family
- Isolated pad footing
- Strip footing (basic)
- Combined footing

5. Steel family
- Steel beam (simply supported primary case)
- Steel column (axial and axial+bending primary case)
- Steel truss (global member force/check baseline workflow)
- Steel portal frame (baseline sway/non-sway assumptions and member checks)

### Priority Tier P1 (V1 post-MVP hardening)

1. RC Slab
- Ribbed slab
- Flat slab (including punching checks in scoped form)
- Continuous slab
- Waffle slab

2. RC Foundation
- Raft footing (baseline design workflow)
- Pile cap (baseline)

3. Steel
- Additional beam support cases and lateral torsional buckling depth
- Connection baseline modules (fin plate, end plate)

### Priority Tier P2 (deferred from V1)

1. Prestressed concrete element modules
2. Advanced steel connection design suites
3. Highly nonlinear/advanced staged analyses

## V1 Design Code Basis

- Primary code family for V1:
  - BS 8110 pathways for reinforced concrete modules
  - BS steel code pathways for V1 steel modules (with clear references in module docs)
- Clause-level references will be attached per module in method map.

## Deterministic Workflow Contract

1. Engineer provides natural language design request.
2. AI extracts structured parameters.
3. User confirms/edits parameters.
4. Deterministic Python engine computes results.
5. AI presents explanation, summary, and report narrative using deterministic output values.
6. Report and detailing are generated from deterministic result payload.

## Assumption Controls

1. Every module must declare assumptions before first result.
2. Every result must include governing check and utilization.
3. Every result must include warning states (pass/warn/fail bands).
4. Missing or ambiguous required inputs must block calculation and request clarification.

## Output Standard (All Modules)

Each element module must output:

1. Input echo block (normalized units)
2. Intermediate calculation steps
3. Final design actions (reinforcement/section selection)
4. Clause-linked compliance checks
5. Governing utilization and verdict
6. Warning list and engineering notes
7. Report payload for the UI/report generator

## Stage 1 Exit Criteria

Stage 1 is complete when the following are approved:

1. Prioritized element list for V1 agreed.
2. BS method map for V1 modules agreed.
3. Calculation input/output schema draft agreed.
4. Verification checklist agreed.
5. Handoff package to frontend/backend/database tracks agreed.

## Agent 02 Comprehensive Review and Reprioritization Rule

1. Agent 02 conducts the comprehensive all-elements review in Stage 1, before Gate 1 -> Gate 2 approval.
2. The review output is treated as authoritative research input for inventory completeness and sequencing risk.
3. After Agent 02 review is completed, element inventory and priority tiers may be updated before Gate 1 -> Gate 2 is granted.
4. Any approved updates must be reflected in this blueprint and carried forward into Stage 2 architecture lock artifacts.
