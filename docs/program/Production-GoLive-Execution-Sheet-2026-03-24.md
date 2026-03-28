# Production Go-Live Execution Sheet (2026-03-24)

## Scope

This sheet is the live execution checklist for final promotion:
- OPS-005 (Agent 05): Supabase production migration verification
- OPS-009 (Agent 09): staged + production deployment execution

## Change Metadata

- Change ID:
- Release version/tag:
- Requested by:
- Approved by:
- Execution date/time:

## Agent and Model Compliance

1. Agent: Agent 05 Database Developer
- Required model: Claude Sonnet 4.6
- Enforcement status (enforced or not-enforced-by-tooling):

2. Agent: Agent 09 DevOp Engineer
- Required model: Claude Sonnet 4.6
- Enforcement status (enforced or not-enforced-by-tooling):

## Pre-Flight Checks

- [ ] Backend tests passed (latest run)
- [ ] Frontend type-check passed
- [ ] Frontend build passed
- [ ] Local backend health check passed (http://127.0.0.1:5000/health)
- [ ] Local UI acceptance flow passed (workspace -> result -> report -> detailing -> projects replay)
- [ ] Production backup/snapshot created in Supabase
- [ ] GitHub environments configured: staging, production
- [ ] Required GitHub secrets configured

Evidence links:
- Backend tests:
- Frontend checks:
- Local health result:
- Local UI smoke notes:
- Backup proof:

## Local Preview Execution (Mandatory)

Run these commands first and only proceed when all checks pass.

### Terminal 1 - Backend

```bash
cd backend
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe -m pip install -r requirements.txt
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe app.py
```

### Terminal 2 - Frontend

```bash
cd frontend
npm ci
npm run dev
```

### Optional local API smoke

```bash
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe qa/tests/smoke/api_flow_smoke.py --base-url http://127.0.0.1:5000 --project-id <existing-project-uuid> --api-key <optional-api-key>
```

- [ ] Local backend process started successfully
- [ ] Local frontend process started successfully
- [ ] Local /health returned status ok
- [ ] Local end-to-end UI flow passed
- [ ] Local API smoke passed (if executed)

Local execution evidence:
- Local backend startup log summary:
- Local frontend startup log summary:
- Local /health response:
- Local smoke summary:

## OPS-005: Supabase Production Verification

Reference:
- docs/program/Supabase-Production-Migration-Verification-Checklist-2026-03-24.md

- [ ] Run Step 1 (tables exist)
- [ ] Run Step 2 (calculation_runs columns)
- [ ] Run Step 3 (constraints)
- [ ] Run Step 4 (indexes)
- [ ] Run Step 5 (RLS enabled)
- [ ] Run Step 6 (policies present)
- [ ] Run Step 7 (trigger function and triggers)
- [ ] Run Step 8 (FK and uniqueness checks)
- [ ] Run Step 9 (service-role smoke in transaction)
- [ ] Record SQL output in evidence log

OPS-005 sign-off:
- Agent name:
- Timestamp:
- Result (Pass/Fail):
- Notes:

OPS-005 evidence capture block (paste SQL outputs):

```text
Step 1 output:

Step 2 output:

Step 3 output:

Step 4 output:

Step 5 output:

Step 6 output:

Step 7 output:

Step 8 output:

Step 9 output:

Verifier name:
Verifier timestamp:
```

## OPS-009: Staging Deployment Execution

Commands:

```bash
gh workflow run ci.yml -f deploy_staging=true -f deploy_production=false
gh run list --workflow ci.yml --limit 5
gh run watch
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe qa/tests/smoke/api_flow_smoke.py --base-url <staging-api-url> --project-id <existing-project-uuid> --api-key <optional-api-key>
```

- [ ] Manual staging workflow dispatched
- [ ] Staging deploy job succeeded
- [ ] Staging backend health check passed
- [ ] Staging frontend smoke check passed
- [ ] Staging API smoke script passed

Staging evidence:
- Workflow run URL:
- Health URL and response:
- Smoke test notes:
- API smoke script output:

## Cloudflare Cutover Checklist (Between Staging and Production)

- [ ] DNS record for app host points to production frontend target
- [ ] DNS record for api host points to production backend target
- [ ] SSL/TLS mode set to Full (strict)
- [ ] API routes are not aggressively cached
- [ ] WAF/firewall rules allow GET, POST, OPTIONS for required routes
- [ ] CORS verified through Cloudflare proxy

Cloudflare evidence:
- App hostname:
- API hostname:
- SSL mode screenshot/log:
- Cache/WAF notes:

## OPS-009: Production Deployment Execution

Commands:

```bash
gh workflow run ci.yml -f deploy_staging=false -f deploy_production=true
gh run list --workflow ci.yml --limit 5
gh run watch
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe qa/tests/smoke/api_flow_smoke.py --base-url <production-api-url> --project-id <existing-project-uuid> --api-key <optional-api-key>
```

- [ ] Manual production workflow dispatched
- [ ] Production environment approval completed
- [ ] Production deploy job succeeded
- [ ] Production backend health check passed
- [ ] Production frontend smoke check passed
- [ ] Production API smoke script passed

Production evidence:
- Workflow run URL:
- Approval record:
- Health URL and response:
- Smoke test notes:
- API smoke script output:

OPS-009 evidence capture block (paste run logs/URLs):

```text
Staging workflow run URL:
Staging backend health response:
Staging frontend smoke summary:

Production workflow run URL:
Production approval evidence:
Production backend health response:
Production frontend smoke summary:

Executor name:
Executor timestamp:
```

## Rollback Gate (If Needed)

Trigger conditions:
- [ ] Elevated 5xx after deploy
- [ ] Critical workflow failure
- [ ] Data integrity anomalies

Rollback actions:
- [ ] Backend reverted to previous stable slot/build
- [ ] Frontend reverted to previous stable slot/build
- [ ] Database restore decision reviewed and approved (if required)

Rollback evidence:
- Incident ID:
- Actions executed:
- Final status:

## Final Release Decision

- [ ] OPS-005 complete (Pass)
- [ ] OPS-009 complete (Pass)
- [ ] Agent 07 final code/security gate complete
- [ ] Agent 08 release documentation pack complete
- [ ] Product/engineering sign-off completed

Final sign-off:
- Engineering lead:
- Product owner:
- Date/time:
- Decision: Go / No-Go
