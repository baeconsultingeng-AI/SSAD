# Multi-Agent Progress and Production Runbook (2026-03-24)

## Quick Links

1. Daily operations board: Daily-Agent-Operations-Board-2026-03-24.md
2. Stage evidence log: Stage-3-Evidence-Log-2026-03-24.md
3. Supabase production verification: Supabase-Production-Migration-Verification-Checklist-2026-03-24.md
4. Production go-live execution sheet: Production-GoLive-Execution-Sheet-2026-03-24.md

## 0) Model Assignment and Compliance

1. Historical compliance statement
- The earlier implementation log did not explicitly enforce or report model-by-agent mapping at each step.
- This is now corrected with mandatory per-step model reporting.

2. Required model map (commissioned)
- Agent 01 (Project Leader): GPT 5.3 Codex
- Agent 02 (Structural Engineer): GPT 5.3 Codex
- Agent 03 (Front End Developer): GPT 5.3 Codex
- Agent 04 (Back End Developer): Claude Sonnet 4.6
- Agent 05 (Database Developer): Claude Sonnet 4.6
- Agent 06 (Quality Assurance Engineer): Claude Sonnet 4.6
- Agent 07 (Code Review Engineer): Claude Sonnet 4.6
- Agent 08 (Document Engineer): Claude Sonnet 4.6
- Agent 09 (DevOp Engineer): Claude Sonnet 4.6

3. Enforcement note
- In this VS Code workflow, explicit model switching for subagents may be constrained by available tooling.
- When direct model forcing is unavailable, each step must be labeled as:
	- requested model
	- executed agent/tool
	- enforcement status: enforced or not-enforced-by-tooling

4. Mandatory execution log format (every update)
- Agent:
- Requested model:
- Execution mechanism:
- Enforcement status:
- Task:
- Evidence:
- Next handoff:

## 1) Agent Responsibility Map

1. Agent 02 (Integration Orchestrator)
- Coordinates stage progression, cross-agent contracts, and acceptance evidence.
- Reviews handoff completeness and closes cross-cutting gaps.

2. Agent 03 (Frontend)
- Owns Next.js UI parity and deterministic render bindings.
- Owns projects run-history/replay/report actions in frontend.

3. Agent 04 (Backend + Engine)
- Owns Flask API contracts and deterministic calc modules.
- Owns persistence endpoint integration and report metadata endpoint behavior.

4. Agent 05 (Database)
- Owns Supabase schema, migration scripts, RLS, and retrieval model.

5. Agent 06 (QA)
- Owns contract tests, module reproducibility checks, and smoke flow coverage.

6. Agent 07 (Code Review)
- Owns deterministic boundary review, contract alignment, and security baseline review.

7. Agent 08 (Documentation)
- Owns handoff updates, evidence logs, and operational runbooks.

8. Agent 09 (DevOps)
- Owns CI/CD hardening, staging and production deployment to Azure, and environment governance.

## 2) Current Progression Snapshot

### Stage 1 and Stage 2 foundations
- Architecture and contract docs are present.
- CI baseline workflow exists.

### Stage 3 implementation status

1. Frontend (Agent 03)
- Result screen now renders checks plus detailed calculation steps.
- Report screen now renders structured sections from deterministic payload.
- Detailing screen now renders element-specific SVG schematics.
- Projects screen now loads project run history, supports replay, and triggers report metadata generation.
- Build status: pass.

2. Backend (Agent 04)
- All P0 deterministic BS modules integrated.
- Calc endpoint persists runs (fire-and-forget) and returns runId when available.
- Project runs and single run retrieval endpoints implemented.
- Report metadata generation endpoint implemented (no longer stub).
- Nested project.projectId and project.elementId mapping fixed for persistence.
- Test status: pass.

3. Database (Agent 05)
- Supabase migration scripts prepared and documented.
- Base schema + sprint2 schema updates present.
- RLS policies and constraints added.
- Live cloud migration still requires dashboard or CLI execution with real credentials.

4. QA (Agent 06)
- Backend contract tests and module tests exist.
- Persistence tests expanded.
- Smoke flow test added for calc -> runs -> report metadata path.

5. Documentation (Agent 08)
- Evidence log created for parity/workflow checks and test outcomes.
- Version tagging normalized in handoff docs to 1.0 convention.

## 3) Most Recent Quality Gates

1. Backend full suite
- Command: pytest tests/ -q
- Result: 159 passed

2. Frontend type-check
- Command: npm run type-check
- Result: pass

3. Frontend production build
- Command: npm run build
- Result: pass

## 4) Remaining Work to Declare Production Ready

1. Supabase live activation
- Apply migrations to production project.
- Replace placeholder credentials with real production secrets.

2. CI/CD hardening
- Expand CI from import smoke + docs presence to full backend tests and frontend build in workflow.
- Add staged deployment gates.

3. Production operations controls
- Add release rollback procedure, health probes, and monitoring alerts.

## 5) Step-by-Step Production Deployment Runbook

### Phase 0: Workspace readiness and repository state

Status as of 2026-03-25:
- Repository initialized and connected: https://github.com/baeconsultingeng-AI/SSAD
- Branch tracking configured: main -> origin/main
- Local quality gates verified in this workspace:
	- backend tests: 164 passed
	- frontend type-check: pass
	- frontend build: pass
	- local backend health probe: GET /health returned status ok

### Phase 1: Local pre-deployment preview (mandatory before staging)

Objective:
- Validate application behavior locally and apply code changes before any cloud deployment.

What Copilot already completed:
- Confirmed backend test suite and frontend build gates pass locally.
- Confirmed backend service starts and responds on /health.

What you execute manually now:

1. Prepare local environment files
- Backend file: copy backend/.env.example -> backend/.env
- Frontend file: copy frontend/.env.local.example -> frontend/.env.local
- Fill values for local testing:
	- backend/.env
		- SUPABASE_URL
		- SUPABASE_SERVICE_ROLE_KEY
		- API_AUTH_KEY (optional; leave empty to disable key guard locally)
		- FLASK_RUN_HOST=127.0.0.1
		- FLASK_RUN_PORT=5000
		- FLASK_DEBUG=0
	- frontend/.env.local
		- NEXT_PUBLIC_API_URL=http://localhost:5000
		- NEXT_PUBLIC_SUPABASE_URL
		- NEXT_PUBLIC_SUPABASE_ANON_KEY
		- NEXT_PUBLIC_API_AUTH_KEY (only if backend API_AUTH_KEY is set)

2. Start backend
```bash
cd backend
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe -m pip install -r requirements.txt
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe app.py
```

3. Start frontend in a second terminal
```bash
cd frontend
npm ci
npm run dev
```

4. Local browser acceptance checklist
- Open http://localhost:3000
- Validate this full flow:
	- workspace opens
	- run a sample calculation
	- result panel renders
	- report panel renders
	- detailing panel renders
	- projects page loads
	- replay a prior run
	- report metadata generation succeeds

5. Local API smoke (optional but recommended)
```bash
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe qa/tests/smoke/api_flow_smoke.py --base-url http://127.0.0.1:5000 --project-id <existing-project-uuid> --api-key <optional-api-key>
```

Exit criteria for Phase 1:
- No critical UX regressions
- No critical API errors in local flow
- Any required code changes applied before staging

### Phase 2: GitHub deployment controls (manual)

1. Configure GitHub repository secrets
- AZURE_CREDENTIALS
- AZURE_BACKEND_WEBAPP_NAME_STAGING
- AZURE_FRONTEND_WEBAPP_NAME_STAGING
- AZURE_BACKEND_WEBAPP_NAME_PRODUCTION
- AZURE_FRONTEND_WEBAPP_NAME_PRODUCTION
- STAGING_BACKEND_HEALTH_URL
- PRODUCTION_BACKEND_HEALTH_URL

2. Configure GitHub environments
- Create environment: staging
- Create environment: production
- Add required reviewer gate for production
- Optional: set wait timer for production

3. Verify workflow visibility
- Open GitHub Actions in baeconsultingeng-AI/SSAD
- Confirm workflow file ci.yml exists and is runnable via workflow_dispatch

### Phase 3: Supabase production rollout (manual)

1. Pre-check and backup
- Create a production backup/snapshot in Supabase.
- Confirm maintenance window and rollback owner.

2. Apply migrations in order
- 20240101000000_init.sql
- 20240201000000_sprint2.sql

3. Execute verification checklist
- Run all SQL checks in docs/program/Supabase-Production-Migration-Verification-Checklist-2026-03-24.md
- Record all outputs in docs/program/Production-GoLive-Execution-Sheet-2026-03-24.md

Exit criteria for Phase 3:
- Tables, constraints, indexes, RLS, policies, and triggers verified
- Service-role smoke transaction passes

### Phase 4: Azure staging deployment (manual)

1. Trigger staging workflow
```bash
gh workflow run ci.yml -f deploy_staging=true -f deploy_production=false
gh run list --workflow ci.yml --limit 5
gh run watch
```

2. Verify staging backend health
- Call STAGING_BACKEND_HEALTH_URL
- Expect HTTP 200 and body with status ok

3. Run staging API smoke
```bash
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe qa/tests/smoke/api_flow_smoke.py --base-url <staging-api-url> --project-id <existing-project-uuid> --api-key <optional-api-key>
```

4. Run staging UI smoke
- Validate the same flow used in local acceptance checklist.

Exit criteria for Phase 4:
- Staging deployment succeeds
- Staging health probe succeeds
- API smoke and UI smoke both pass

### Phase 5: Cloudflare cutover preparation (manual)

Use this phase only when staging is green.

1. DNS records
- Create/confirm proxied DNS records for:
	- api.<your-domain> -> production backend host
	- app.<your-domain> -> production frontend host

2. SSL/TLS
- Set SSL mode to Full (strict)
- Confirm valid origin certificates on Azure targets

3. Caching and rules
- Disable aggressive caching for API routes (/api/*)
- Keep caching for static frontend assets only
- If using WAF rules, allow required methods: GET, POST, OPTIONS

4. CORS sanity check
- Ensure backend allows frontend production origin
- Verify preflight OPTIONS requests return valid headers

Exit criteria for Phase 5:
- app and api hostnames resolve correctly
- HTTPS green lock for both hostnames
- no 403/5xx introduced by proxy/firewall rules

### Phase 6: Production deployment (manual, approval gated)

1. Trigger production workflow
```bash
gh workflow run ci.yml -f deploy_staging=false -f deploy_production=true
gh run list --workflow ci.yml --limit 5
gh run watch
```

2. Complete GitHub production approval
- Approve environment gate when prompted

3. Post-deploy health and smoke
- Check PRODUCTION_BACKEND_HEALTH_URL
- Run production API smoke:
```bash
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe qa/tests/smoke/api_flow_smoke.py --base-url <production-api-url> --project-id <existing-project-uuid> --api-key <optional-api-key>
```

4. Production UI acceptance
- Validate workspace -> result -> report -> detailing -> projects replay flow

Exit criteria for Phase 6:
- Deploy job succeeded
- Approval recorded
- API smoke pass
- UI smoke pass

### Phase 7: Release sign-off and rollback readiness

1. Complete execution evidence
- Fill all evidence blocks in docs/program/Production-GoLive-Execution-Sheet-2026-03-24.md

2. Final decision
- Engineering lead and product owner set Go or No-Go.

3. Rollback trigger conditions
- elevated 5xx rates
- critical workflow failure
- data integrity anomaly

4. Rollback actions
- backend: revert to previous stable deployment in Azure
- frontend: revert to previous stable deployment in Azure
- database: restore snapshot only after incident approval

## 5.1) Manual Inputs Checklist (You Must Provide)

GitHub:
1. Repository admin access for secrets and environments
2. GitHub account access for manual workflow dispatch approvals

Azure:
1. Service principal credentials JSON for AZURE_CREDENTIALS
2. Staging backend web app name
3. Staging frontend web app name
4. Production backend web app name
5. Production frontend web app name

Supabase:
1. Production project URL
2. Service role key
3. SQL editor/project access for migration and verification

Cloudflare:
1. Zone admin access
2. Domain/subdomain DNS control for app and api hostnames

## 5.2) Commands You Will Run Manually

```bash
gh auth login

gh secret set AZURE_CREDENTIALS < azure_credentials.json
gh secret set AZURE_BACKEND_WEBAPP_NAME_STAGING --body "<staging-backend-app-name>"
gh secret set AZURE_FRONTEND_WEBAPP_NAME_STAGING --body "<staging-frontend-app-name>"
gh secret set AZURE_BACKEND_WEBAPP_NAME_PRODUCTION --body "<production-backend-app-name>"
gh secret set AZURE_FRONTEND_WEBAPP_NAME_PRODUCTION --body "<production-frontend-app-name>"
gh secret set STAGING_BACKEND_HEALTH_URL --body "https://<staging-backend-domain>/health"
gh secret set PRODUCTION_BACKEND_HEALTH_URL --body "https://<production-backend-domain>/health"

gh workflow run ci.yml -f deploy_staging=true -f deploy_production=false
gh workflow run ci.yml -f deploy_staging=false -f deploy_production=true

gh run list --workflow ci.yml --limit 5
gh run watch
```

## 5.3) Do-Not-Proceed Rules

1. Do not deploy staging if Phase 1 local acceptance fails.
2. Do not deploy production if Supabase verification (Phase 3) is incomplete.
3. Do not update Cloudflare DNS to production until staging smoke is green.
4. Do not mark Go-Live complete until all evidence fields are filled.

## 6) Reporting Format Going Forward

For each update cycle, report these fields:

1. Agent
- Which agent executed work.

2. Task
- What specific scope item was addressed.

3. Status
- done, in-progress, blocked.

4. Evidence
- Tests/build output and affected files.

5. Next handoff
- Which agent receives the next action item.

## 7) Commissioned Agent Scope Matrix

1. Agent 01 - Project Leader (GPT 5.3 Codex)
- Set up project structure
- Create folder layout
- Initialize git

2. Agent 02 - Structural Engineer (GPT 5.3 Codex)
- Comprehensive review of structural elements across concrete and steel.
- Categorize elements and prioritize implementation.
- Review analysis/design pathways for BS, Eurocode, and American code.
- Produce roadmap for calculation engine implementation.
- Verify calculation outputs before production release.
- Produce comprehensive structural review report.

3. Agent 03 - Front End Developer (GPT 5.3 Codex)
- Create Next.js app
- Build UI components
- Connect to backend
- Ensure responsiveness across devices

4. Agent 04 - Back End Developer (Claude Sonnet 4.6)
- Create Flask app
- Build Python structural calculation engine
- Build API endpoints for model integration

5. Agent 05 - Database Developer (Claude Sonnet 4.6)
- Design/build persistence schemas, tables, and relationships
- Write queries/store procedures and optimize data access
- Integrate with backend in coordination with Agent 04

6. Agent 06 - Quality Assurance Engineer (Claude Sonnet 4.6)
- Design and execute functionality/performance/security tests
- Identify, document, and track defects
- Validate feature behavior against requirements
- Coordinate retesting with Agents 03, 04, and 05

7. Agent 07 - Code Review Engineer (Claude Sonnet 4.6)
- Review code quality and consistency
- Review security

8. Agent 08 - Document Engineer (Claude Sonnet 4.6)
- Create project documentation

9. Agent 09 - DevOp Engineer (Claude Sonnet 4.6)
- Deploy SSAD as web app
- Deploy SSAD as mobile app

## 8) Summary Dashboard (Agent x Task)

Last updated: 2026-03-24

| Agent | Required Model | Primary Tasks | Status | Latest Evidence | Next Action |
|---|---|---|---|---|---|
| Agent 01 Project Leader | GPT 5.3 Codex | Structure, folders, git init | Done | Repository has top-level structure and git workflow baseline | Maintain release branch discipline |
| Agent 02 Structural Engineer | GPT 5.3 Codex | Scope review, categorization, code pathways, roadmap, verification | In progress | Program docs and structural module inventory exist | Finalize production verification report pack |
| Agent 03 Front End Developer | GPT 5.3 Codex | Next.js UI, backend integration, responsiveness | Done | Frontend type-check pass, frontend build pass | UX polish and staged UAT fixes |
| Agent 04 Back End Developer | Claude Sonnet 4.6 | Flask API, calc engine, integration endpoints | Done | Backend tests pass, runs/report endpoints active | Add auth boundary hardening |
| Agent 05 Database Developer | Claude Sonnet 4.6 | Schema, queries, integration | In progress | Supabase migrations and RLS scripts present | Apply production migrations and validate policies |
| Agent 06 QA Engineer | Claude Sonnet 4.6 | Functional/perf/security tests, defects, retest | In progress | 159 backend tests passed, smoke flow present | Expand frontend and E2E coverage |
| Agent 07 Code Review Engineer | Claude Sonnet 4.6 | Quality and security review | In progress | Deterministic boundary checks and gap review logs | Perform final pre-prod review gate |
| Agent 08 Document Engineer | Claude Sonnet 4.6 | Project documentation | In progress | Evidence log and runbook completed | Publish release notes + operator handbook |
| Agent 09 DevOp Engineer | Claude Sonnet 4.6 | Web/mobile deployment | In progress | CI baseline workflow exists | Implement staged deployment and rollback automation |

## 9) Execution Compliance Ledger Template

Use this block for every future update:

1. Agent:
2. Requested model:
3. Execution mechanism:
4. Enforcement status (enforced or not-enforced-by-tooling):
5. Task:
6. Evidence:
7. Next handoff:
