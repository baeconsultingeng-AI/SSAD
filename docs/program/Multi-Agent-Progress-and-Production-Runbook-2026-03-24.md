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

### Phase 0: Git repository initialization (PREREQUISITE — must complete before any CI/CD runs)

**Status: BLOCKED — no .git directory detected in SSAD folder as of 2026-03-25**

No git repository has been initialized in this project. GitHub Actions CI/CD cannot run until this is complete.

1. Initialize the repository
```bash
cd "C:\Users\MacBook\Desktop\BaeSoftIA\SSAD"
git init -b main
```

2. Create a `.gitignore` at repo root (if one does not exist, create it now):
```
# Python
backend/__pycache__/
backend/.pytest_cache/
backend/.env
backend/app/__pycache__/
backend/app/**/__pycache__/

# Node
frontend/node_modules/
frontend/.next/
frontend/.env.local

# General
.DS_Store
*.pyc
```

3. Stage all files and make the first commit
```bash
git add .
git commit -m "chore: initial commit — Stage 3 implementation baseline"
```

4. Create a GitHub repository
- Go to https://github.com/new
- Set repository name (e.g., `ssad`)
- Set visibility (private recommended)
- Do NOT initialize with README, .gitignore, or license (repo already has content)

5. Add remote and push
```bash
git remote add origin https://github.com/<your-org-or-username>/ssad.git
git push -u origin main
```

6. Verify GitHub Actions appears in the Actions tab of the new repo.
   - The `push.branches: ["main"]` trigger will fire a CI run on the first push.
   - Confirm `backend-tests`, `frontend-checks`, and `docs-presence` jobs all pass.

### Phase A: Pre-deployment freeze and checks

1. Freeze release scope
- Ensure no open high-severity defects.
- Tag release candidate branch.

2. Run local/CI quality gates
- Backend: pytest tests/ -q
- Frontend: npm run type-check
- Frontend: npm run build
- Confirm all pass.

3. Prepare production secrets
- Backend required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, API_AUTH_KEY
- Frontend required: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- Frontend optional when API_AUTH_KEY is enabled: NEXT_PUBLIC_API_AUTH_KEY
- Store in secure secret manager (GitHub Environments/Azure App Settings).

### Phase B: Database production rollout

1. Backup production database
- Trigger pre-migration backup/snapshot in Supabase.

2. Apply migrations in order
- Run 20240101000000_init.sql
- Run 20240201000000_sprint2.sql

3. Verify schema and RLS
- Confirm required tables exist.
- Confirm constraints and RLS policies are active.
- Insert and read test data using service role only.

### Phase C: Backend production deploy (Azure)

1. Build and package backend
- Use Python 3.11+ runtime.
- Install dependencies from backend/requirements.txt.

2. Configure environment
- Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend app settings.
- Disable debug mode in production startup configuration.

3. Deploy backend app
- Deploy to Azure App Service or Container App.
- Expose HTTPS endpoint.

4. Post-deploy backend checks
- Call /health and confirm status ok.
- Execute a calc request and confirm status ok.
- Verify run persistence and report metadata creation endpoint behavior.

### Phase D: Frontend production deploy (Azure)

1. Build frontend
- next build

2. Configure environment
- NEXT_PUBLIC_API_URL should point to production backend HTTPS URL.
- Set Supabase public URL and anon key.

3. Deploy frontend app
- Deploy to Azure Static Web Apps or App Service.

4. Post-deploy frontend checks
- Open workspace, run sample calc, confirm result/report/detailing render.
- Open projects page, load project runs, replay run, generate report metadata.

### Phase E: Production smoke and sign-off

1. Execute smoke script
- Flow: calculate -> runId -> project runs retrieval -> report metadata creation.

2. Verify observability
- Confirm app logs show successful request traces.
- Confirm error dashboards and alert rules are active.

3. Approve release
- Product sign-off and engineering sign-off.
- Tag release and publish release notes.

### Phase F: Rollback plan

1. Trigger rollback conditions
- Elevated 5xx rates, critical workflow breakage, or data integrity issues.

2. Backend rollback
- Revert deployment to previous stable build in Azure.

3. Frontend rollback
- Revert to previous deployment slot/build.

4. Data rollback decision
- If migration-related issue: restore from backup snapshot after incident review.

## 5.1) GitHub Deployment Secrets Checklist

Configure these repository secrets before enabling staged/prod deployment jobs:

1. AZURE_CREDENTIALS
- Azure service principal credentials JSON for github action login.

2. AZURE_BACKEND_WEBAPP_NAME_STAGING
- Azure App Service name for staging backend.

3. AZURE_FRONTEND_WEBAPP_NAME_STAGING
- Azure App Service name for staging frontend.

4. AZURE_BACKEND_WEBAPP_NAME_PRODUCTION
- Azure App Service name for production backend.

5. AZURE_FRONTEND_WEBAPP_NAME_PRODUCTION
- Azure App Service name for production frontend.

6. STAGING_BACKEND_HEALTH_URL (recommended)
- Full URL to staging backend health endpoint, for example: https://staging-api.example.com/health

7. PRODUCTION_BACKEND_HEALTH_URL (recommended)
- Full URL to production backend health endpoint, for example: https://api.example.com/health

## 5.2) GitHub Environment Approval Setup

1. Create environments
- staging
- production

2. Configure protection rules
- staging: optional reviewer gate, wait timer optional.
- production: required reviewer gate mandatory, wait timer recommended.

3. Restrict secret scope
- Put deployment secrets at environment-level where possible.
- Keep production secrets only in production environment.

4. Verification after setup
- Run workflow_dispatch with deploy_staging=true and confirm staging deployment.
- Run workflow_dispatch with deploy_production=true and confirm approval gate appears.

## 5.3) GitHub CLI Execution Commands (Agent 09)

Use these commands from repository root after installing and authenticating `gh`.

1. Authenticate GitHub CLI

```bash
gh auth login
```

2. Set repository-level secrets

```bash
gh secret set AZURE_CREDENTIALS < azure_credentials.json
gh secret set AZURE_BACKEND_WEBAPP_NAME_STAGING --body "<staging-backend-app-name>"
gh secret set AZURE_FRONTEND_WEBAPP_NAME_STAGING --body "<staging-frontend-app-name>"
gh secret set AZURE_BACKEND_WEBAPP_NAME_PRODUCTION --body "<production-backend-app-name>"
gh secret set AZURE_FRONTEND_WEBAPP_NAME_PRODUCTION --body "<production-frontend-app-name>"
gh secret set STAGING_BACKEND_HEALTH_URL --body "https://<staging-backend-domain>/health"
gh secret set PRODUCTION_BACKEND_HEALTH_URL --body "https://<production-backend-domain>/health"
```

3. Trigger staging deployment manually

```bash
gh workflow run ci.yml -f deploy_staging=true -f deploy_production=false
```

4. Trigger production deployment manually

```bash
gh workflow run ci.yml -f deploy_staging=false -f deploy_production=true
```

5. Watch deployment run status

```bash
gh run list --workflow ci.yml --limit 5
gh run watch
```

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
