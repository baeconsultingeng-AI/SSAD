# UI Preservation Migration Plan (Single HTML to Scalable Architecture)

## Purpose

Scale SSAD from the current single-file implementation into a modular production architecture while preserving the existing Claude-designed UI and interaction behavior.

## Non-Negotiable Constraint

- The current UI design is frozen for Version 1.
- No intentional visual redesign is allowed during migration.
- No intentional flow redesign is allowed during migration.
- Migration work must be behind-the-UI refactoring and service separation.

## Source UI Baseline

- Baseline source file: ssad-v2-fullscreen (71).html
- Baseline mode: pixel and behavior reference for all screens

## UI Contract (Frozen for V1)

1. Screen structure
- Keep all current screens and screen-level navigation behaviors.

2. Visual identity
- Keep typography, spacing, color system, iconography, gradients, and motion style.

3. Interaction model
- Keep current conversational AI flow:
  - Describe
  - Extract
  - Confirm
  - Design
- Keep current result and report progression.

4. Output surfaces
- Keep report and detailing output structures and user affordances.

5. Responsive behavior
- Keep current desktop, tablet, and mobile layout behavior patterns.

## Existing Screen Inventory to Preserve

1. Workspace
2. AI chat
3. Results
4. Report
5. Detailing
6. Projects
7. Settings
8. Upgrade
9. Auth
10. Steel beam form
11. Steel column form
12. Steel truss form

## Migration Strategy

### Phase A - Stabilize and Snapshot

1. Freeze baseline UI artifact
- Store copy of source UI as immutable reference.

2. Build parity checklist
- Define acceptance criteria per screen and per critical interaction.

3. Define visual regression protocol
- Capture baseline screenshots for key states on desktop/tablet/mobile.

### Phase B - Carve Frontend Structure (No UI Change)

1. Frontend framework setup
- Create Next.js TypeScript app shell.

2. Screen extraction
- Port screen sections into componentized modules.
- Preserve CSS tokens and class behavior.

3. Routing and state shell
- Map current screen switching to framework-safe route/state model.
- Keep user-visible transitions equivalent.

### Phase C - Extract Business Logic (No UI Change)

1. Service boundaries
- Separate logic into modules:
  - Auth service
  - Project persistence service
  - AI orchestration service
  - Calculation client service
  - Reporting service

2. Keep deterministic boundary
- AI extraction in orchestration layer.
- Deterministic Python engine as calculation authority.

3. Data contracts
- Define typed request/response models for extraction, confirm, calculate, report.

### Phase D - Backend and Engine Integration

1. Flask API
- Expose deterministic calculation endpoints by element family (V1 BS-only).

2. Frontend integration
- Replace in-page monolith calls with API client calls.
- Preserve UI text and timing patterns where possible.

3. Persistence integration
- Move from local storage prototype persistence to structured backend persistence with Supabase.

### Phase E - Hardening and Release Readiness

1. Regression verification
- Run UI parity checklist and visual diff checks.

2. Interaction verification
- Verify all key flows from auth to report/detailing.

3. Performance and reliability checks
- Validate behavior under realistic network conditions.

## Target Production Architecture (V1)

1. Frontend
- Next.js app with componentized screen modules.

2. Backend
- Flask API with deterministic BS calculation modules.

3. Data
- Supabase Postgres for persistence.

4. Storage
- Cloudflare R2 for report/drawing artifacts.

5. Deployment
- Azure-hosted frontend/backend with GitHub Actions CI/CD.

## UI Parity Acceptance Criteria

A migration increment is acceptable only if:

1. Visual parity
- Screen appears materially identical in layout hierarchy and style.

2. Interaction parity
- Same button actions, transitions, and state progression.

3. Workflow parity
- Same AI-first sequence and reporting progression.

4. No regressions
- No loss of existing screens, forms, reports, or detailing outputs.

## Change Control During V1

Allowed:

1. Internal refactors
2. API wiring
3. Reliability and correctness fixes
4. Accessibility and semantic improvements that do not alter UI look/flow

Not allowed:

1. New visual redesigns
2. Navigation restructuring visible to users
3. Typography/palette/theme changes
4. UX model changes not explicitly approved

## Approval Gates for Migration Work

1. Gate M1 - Baseline and parity checklist approved
2. Gate M2 - Frontend componentization parity approved
3. Gate M3 - Backend integration parity approved
4. Gate M4 - Full regression pass approved
5. Gate M5 - Release packaging approved

## Deliverables Produced by This Plan

1. Frozen UI contract
2. Screen-level migration sequence
3. Architecture-aligned extraction path
4. Parity acceptance framework for controlled scaling
