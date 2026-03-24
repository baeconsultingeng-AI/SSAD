# System Architecture - Version 1 (BS Only)

## High-Level Flow

1. Engineer enters design intent in AI chat UI.
2. AI extraction service parses candidate parameters.
3. User confirms and edits parameters.
4. Frontend submits normalized request to Flask deterministic API.
5. Python engine computes deterministic result.
6. API returns checks, steps, warnings, report payload, detailing payload.
7. Frontend renders result/report/detailing.
8. Persistence service stores full input and output snapshots.

## Component Diagram (Logical)

1. Frontend App (Next.js)
- UI screens and interaction logic
- API client and state store

2. AI Orchestration Service (frontend + backend utility)
- Prompt/extraction coordination
- Confirmation contract conversion

3. Deterministic Calc API (Flask)
- Validation layer
- Module router
- BS calculation modules
- Result formatter

4. Persistence Services
- Supabase for relational records
- R2 for generated artifacts

## Frontend Runtime Modules

1. app-shell
- route/screen orchestration with parity behavior

2. ai-workflow
- extraction, confirm, calculate trigger, commentary display

3. result-renderer
- verdict, checks, utilization, actions

4. report-renderer
- report sections from deterministic payload

5. detailing-renderer
- detailing view from deterministic payload

6. project-service
- project create/select/list/save/replay

7. auth-service
- user session and tier state

## Backend Runtime Modules

1. api-gateway
- request routing and error handling

2. validation-engine
- schema and unit validation

3. module-router
- module selection by module/code/version

4. calc-modules
- deterministic V1 BS modules

5. response-builder
- standardized response envelopes

6. audit-logger
- request and response audit records

## Data Flow Contracts

1. Calculation request envelope
- module, code, version, requestId, project context, inputs

2. Calculation response envelope
- status, normalizedInputs, results, checks, steps, warnings, payloads

3. Persistence snapshot contract
- full request and response serialization for replay

## Failure Behavior

1. Validation failure
- return structured field-level errors; no partial compute

2. Compute failure
- return deterministic error envelope; no AI substitution of numeric outputs

3. Commentary failure
- deterministic result still shown; commentary is optional enhancement

## Versioning Strategy

1. API path includes version namespace
- Example: /api/v1/calc

2. Module version in payload
- module + code + version tags required

3. Forward compatibility
- v2 Eurocode and v3 ACI modules added without breaking v1 contracts
