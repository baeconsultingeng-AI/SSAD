# BS Method Map - Version 1

This document defines implementation method pathways for V1 deterministic calculation modules.

## RC Slab Module (BS Path)

### Covered subtypes

1. One-way slab
2. Two-way slab
3. Cantilever slab

### P1 roadmap subtypes (post-MVP)

1. Ribbed slab
2. Flat slab (scoped punching checks)
3. Continuous slab
4. Waffle slab

### Inputs

1. Geometry: span(s), thickness, cover
2. Materials: concrete grade, rebar grade
3. Loading: dead, live, load factors per project defaults
4. Support condition and continuity assumptions

### Core checks

1. Design actions and moments
2. Flexural steel demand/provision
3. Shear checks where applicable
4. Deflection/serviceability limits
5. Minimum and maximum reinforcement rules

### Outputs

1. Required steel in principal directions
2. Proposed bar diameter/spacing set
3. Utilization and governing criterion
4. Clause references and warning notes

## RC Beam Module (BS Path)

### Covered subtypes

1. Simply supported
2. Continuous (scoped)
3. Cantilever

### Inputs

1. Geometry: span, b, h, cover
2. Material: concrete grade, steel grade
3. Loading: dead/live/action factors
4. Support type

### Core checks

1. Bending design
2. Shear design
3. Deflection/serviceability
4. Minimum/maximum reinforcement

### Outputs

1. Bottom/top steel proposal
2. Shear link proposal
3. Governing utilization and verdict
4. Clause references and warnings

## RC Column Module (BS Path)

### Covered subtypes

1. Axial short column
2. Uniaxial short column
3. Biaxial short column (scoped interaction)

### Inputs

1. Geometry: section dimensions, effective height, cover
2. Material: concrete/steel grades
3. Actions: axial, moments
4. End restraint/slenderness assumptions

### Core checks

1. Slenderness classification
2. Axial-bending capacity path
3. Reinforcement ratio bounds
4. Tie/link spacing bounds

### Outputs

1. Longitudinal reinforcement proposal
2. Link/tie proposal
3. Governing utilization and verdict
4. Clause references and warnings

## RC Foundation Module (BS Path)

### Covered subtypes

1. Isolated pad
2. Strip footing (scoped)
3. Combined footing

### P1 roadmap subtypes (post-MVP)

1. Raft footing (baseline)
2. Pile cap (baseline)

### Inputs

1. Geometry: L, B, D
2. Actions: design column/wall loads
3. Geotechnical: allowable bearing
4. Material: concrete/steel grades, cover

### Core checks

1. Bearing pressure
2. Flexural checks
3. One-way shear
4. Punching shear where applicable
5. Reinforcement minimum rules

### Outputs

1. Base geometry adequacy status
2. Reinforcement proposal
3. Governing utilization and verdict
4. Clause references and warnings

## Steel Beam Module (V1 BS Steel Path)

### Covered subtypes

1. Simply supported primary workflow

### Inputs

1. Span, loading, spacing tributary assumptions
2. Steel grade, section family candidates
3. Lateral restraint assumptions

### Core checks

1. Bending resistance
2. Shear resistance
3. Deflection/serviceability
4. Stability-bounded checks in scoped form

### Outputs

1. Candidate section with adequacy status
2. Utilization and governing criterion
3. Clause references and warning notes

## Steel Column Module (V1 BS Steel Path)

### Covered subtypes

1. Axial
2. Axial + bending (scoped)

### Inputs

1. Effective length assumptions
2. Axial and moment actions
3. Section and grade candidates

### Core checks

1. Compression resistance
2. Buckling effects (scoped)
3. Combined action check

### Outputs

1. Candidate section recommendation
2. Utilization and governing criterion
3. Clause references and warning notes

## Steel Truss Module (V1 scoped)

### Inputs

1. Truss geometry and panelization
2. Support assumptions
3. Load cases and combinations
4. Section candidates

### Core checks

1. Global member force extraction path
2. Member tension/compression adequacy
3. Serviceability constraints in scoped form

### Outputs

1. Member schedule with adequacy states
2. Governing utilization and verdict
3. Clause references and warning notes

## Steel Portal Frame Module (V1 scoped)

### Inputs

1. Frame geometry and support conditions
2. Load actions and combinations
3. Sway/non-sway assumption
4. Section candidates

### Core checks

1. Frame-level action extraction (scoped)
2. Beam-column adequacy path
3. Serviceability drift check (scoped)

### Outputs

1. Member adequacy summary
2. Governing utilization and verdict
3. Clause references and warning notes

## Common Rules for All Modules

1. No probabilistic AI substitution for deterministic checks.
2. Required input absence must block calculation.
3. Every result includes:
- verdict
- utilization percent
- governing check
- warnings
- traceable clause refs
4. Every module emits report-ready structured payload.
