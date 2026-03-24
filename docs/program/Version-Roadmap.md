# SSAD Version Roadmap

## Confirmed Version Strategy

- Version 1 (Option A): BS-only MVP
- Version 2: Add Eurocode support
- Version 3: Add ACI support

## Product Principle (Non-Negotiable)

- AI performs conversation and parameter extraction.
- Deterministic Python calculation engine performs all structural calculations.
- AI performs explanation, reporting language, and workflow assistance.
- AI does not perform final structural calculations.

## Version 1 Scope (BS-Only MVP)

- Primary market: Nigeria.
- Materials:
  - Reinforced concrete (MVP mandatory)
  - Structural steel (MVP mandatory)
- RC element families for MVP:
  - Slabs
  - Beams
  - Columns
  - Foundations
- Steel element families for MVP:
  - Steel beams
  - Steel columns
  - Trusses
  - Portal frames
- Delivery channels:
  - Web app (MVP production target)
  - Mobile app baseline plan and API compatibility (execution starts in V1, full hardening can continue)

## Version 2 Scope (Eurocode Layer)

- Add Eurocode pathways to existing V1 elements.
- Reuse deterministic calculation engine architecture with code-specific modules.
- Maintain identical AI workflow and reporting structure.

## Version 3 Scope (ACI Layer)

- Add ACI pathways to existing V1/V2 element modules.
- Preserve deterministic engine boundaries and verification model.
- Extend report templates for ACI clause references and checks.

## Out-of-Phase Item Guidance

- Prestressed concrete: planned after V1 BS baseline is stable unless explicitly re-prioritized.
- Advanced offline AI mode: treated as constrained/degraded capability track and not full parity target.

## Release Naming

- SSAD v1.x: BS-only baseline line
- SSAD v2.x: Eurocode-enabled line
- SSAD v3.x: ACI-enabled line
