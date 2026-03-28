# SSAD Manual Deployment Guide (Step-by-Step)

## Purpose

This guide is designed for fully manual execution by you.
It covers:
1. Local testing and validation before deployment
2. GitHub setup
3. Supabase setup and migration verification
4. Azure staging and production deployment
5. Cloudflare DNS/proxy cutover
6. Final production validation and rollback readiness

Follow phases in exact order. Do not skip steps.

## Prerequisites

1. Local tools installed
- Python 3.11+ (workspace currently uses Python 3.12 locally)
- Node.js 20+
- Git
- GitHub CLI (`gh`)

2. Access required
- GitHub repo admin: https://github.com/baeconsultingeng-AI/SSAD
- Supabase production project admin
- Azure subscription with App Service permissions
- Cloudflare zone admin for your domain

3. Required repo files
- backend/.env.example
- frontend/.env.local.example
- .github/workflows/ci.yml
- supabase/migrations/20240101000000_init.sql
- supabase/migrations/20240201000000_sprint2.sql
- qa/tests/smoke/api_flow_smoke.py

## AI Model Wiring Status (Important)

Current status in this repository:
1. The AI chat screen exists in the frontend UI.
2. It is currently a stub (placeholder behavior), not a live model call.
3. The production deployment path today is deterministic calculation + persistence APIs.
4. No OpenAI/Anthropic provider key is currently wired in backend runtime.

Evidence in code:
1. frontend/src/components/workspace/AIChatPanel.tsx has a Sprint 1 stub comment and no provider request logic.
2. backend/app/api/v1/calc.py contains deterministic calculation endpoints, not LLM provider endpoints.

If you want live AI in production, complete Phase AI below before Phase 4.

## Phase AI - Wire Live AI Provider (Optional, Manual + Code Change Required)

Goal: safely connect a real model provider (for example Claude/OpenAI) to the app through backend only.

### Routing policy selected for this project

Use this exact provider/model order:
1. Primary: Claude
2. Fallback 1: ChatGPT
3. Fallback 2: DeepSeek

Routing behavior:
1. Try primary first.
2. If primary fails (timeout/rate-limit/5xx), call fallback 1.
3. If fallback 1 fails, call fallback 2.
4. If all fail, return controlled error payload to UI.

### Step AI.1 - Select provider and model policy

Use and document these concrete values:
1. Primary provider: Anthropic (Claude)
2. Fallback 1 provider: OpenAI (ChatGPT)
3. Fallback 2 provider: DeepSeek
4. Per-provider model IDs (set exact model names in secrets)
5. Max tokens, timeout, retries, and failover trigger rules

### Step AI.2 - Add backend-only secrets (never expose in frontend)

Add these to Azure App Service configuration and/or GitHub environment secrets:
1. AI_ROUTING_ENABLED=true
2. AI_PRIMARY_PROVIDER=anthropic
3. AI_PRIMARY_MODEL=<claude-model-id>
4. ANTHROPIC_API_KEY=<anthropic-key>
5. AI_FALLBACK_1_PROVIDER=openai
6. AI_FALLBACK_1_MODEL=<chatgpt-model-id>
7. OPENAI_API_KEY=<openai-key>
8. AI_FALLBACK_2_PROVIDER=deepseek
9. AI_FALLBACK_2_MODEL=<deepseek-model-id>
10. DEEPSEEK_API_KEY=<deepseek-key>
11. AI_TIMEOUT_SECONDS=30
12. AI_MAX_RETRIES_PER_PROVIDER=1

Rule:
1. Do not place provider secret in frontend env vars.

### Step AI.3 - Implement backend proxy endpoint

Implement a backend endpoint (example path):
1. POST /api/v1/ai/extract

Required behavior:
1. Accept user prompt and context
2. Call provider using server-side secret only
3. Return sanitized structured extraction payload
4. Enforce timeout, retries, and max tokens
5. Log request IDs without logging secret or sensitive content

### Step AI.4 - Wire frontend chat to backend endpoint

In frontend AI chat flow:
1. Replace stub response path with call to backend /api/v1/ai/extract
2. Keep deterministic calculation confirmation step unchanged
3. Show graceful error states for timeout/provider failure

### Step AI.5 - Add tests before deployment

1. Backend unit tests for AI endpoint validation and error mapping
2. Backend integration test with provider call mocked
3. Frontend interaction test for chat -> extract -> confirm path
4. Smoke test for AI extraction endpoint in staging

### Step AI.6 - Deploy AI wiring to staging first

1. Trigger staging deployment
2. Validate AI extraction in staging UI
3. Validate deterministic calculation still works after extraction
4. Confirm no secret leakage in logs

### Step AI.7 - Promote AI wiring to production

Only after all pass in staging:
1. Set production AI secrets
2. Trigger production deployment with approval gate
3. Run production smoke including AI extraction flow

## Phase 1 - Local Test First (Mandatory)

Goal: verify app behavior locally and fix issues before any cloud deployment.

### Step 1.1 - Create local env files

1. Copy backend env template
- Source: backend/.env.example
- Target: backend/.env

2. Copy frontend env template
- Source: frontend/.env.local.example
- Target: frontend/.env.local

### Step 1.2 - Fill backend env values in backend/.env

Set these values:
1. SUPABASE_URL=https://<your-supabase-project-ref>.supabase.co
2. SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
3. API_AUTH_KEY=<optional; leave blank to disable API key guard locally>
4. FLASK_RUN_HOST=127.0.0.1
5. FLASK_RUN_PORT=5000
6. FLASK_DEBUG=0

### Step 1.3 - Fill frontend env values in frontend/.env.local

Set these values:
1. NEXT_PUBLIC_API_URL=http://localhost:5000
2. NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
3. NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
4. NEXT_PUBLIC_API_AUTH_KEY=<only if backend API_AUTH_KEY is set>

### Step 1.4 - Run local quality gates

From repository root, run:

```powershell
cd C:/Users/MacBook/Desktop/BaeSoftIA/SSAD/backend
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe -m pip install -r requirements.txt
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe -m pytest tests/ -q
```

```powershell
cd C:/Users/MacBook/Desktop/BaeSoftIA/SSAD/frontend
npm ci
npm run type-check
npm run build
```

Expected result:
1. Backend tests pass
2. Frontend type-check passes
3. Frontend build passes

### Step 1.5 - Run backend and frontend locally

Terminal A (backend):

```powershell
cd C:/Users/MacBook/Desktop/BaeSoftIA/SSAD/backend
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe app.py
```

Terminal B (frontend):

```powershell
cd C:/Users/MacBook/Desktop/BaeSoftIA/SSAD/frontend
npm run dev
```

### Step 1.6 - Verify local API health

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -UseBasicParsing
```

Expected body contains: status=ok

### Step 1.7 - Verify local UI flow manually

Open: http://localhost:3000

Check all items:
1. Workspace page opens
2. Run a sample calculation
3. Result panel renders
4. Report panel renders
5. Detailing panel renders
6. Projects page loads
7. Replay a run from projects page
8. Report metadata generation succeeds

### Step 1.8 - Optional local API smoke test

```powershell
cd C:/Users/MacBook/Desktop/BaeSoftIA/SSAD
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe qa/tests/smoke/api_flow_smoke.py --base-url http://127.0.0.1:5000 --project-id <existing-project-uuid> --api-key <optional-api-key>
```

Do not continue to Phase 2 until Phase 1 is fully green.

## Phase 2 - GitHub Setup (Manual)

Goal: configure deployment control plane in GitHub.

### Step 2.1 - Verify repository and workflow

1. Open repo: https://github.com/baeconsultingeng-AI/SSAD
2. Confirm workflow file exists: .github/workflows/ci.yml
3. Confirm Actions tab is available

### Step 2.2 - Create GitHub environments

In GitHub repo Settings -> Environments:
1. Create environment: staging
2. Create environment: production
3. Configure production required reviewers (mandatory)
4. Optional: production wait timer

### Step 2.3 - Add GitHub Actions secrets

In GitHub repo Settings -> Secrets and variables -> Actions, add:
1. AZURE_CREDENTIALS
2. AZURE_BACKEND_WEBAPP_NAME_STAGING
3. AZURE_FRONTEND_WEBAPP_NAME_STAGING
4. AZURE_BACKEND_WEBAPP_NAME_PRODUCTION
5. AZURE_FRONTEND_WEBAPP_NAME_PRODUCTION
6. STAGING_BACKEND_HEALTH_URL
7. PRODUCTION_BACKEND_HEALTH_URL

Optional CLI method:

```powershell
gh auth login
gh secret set AZURE_CREDENTIALS < azure_credentials.json
gh secret set AZURE_BACKEND_WEBAPP_NAME_STAGING --body "<staging-backend-app-name>"
gh secret set AZURE_FRONTEND_WEBAPP_NAME_STAGING --body "<staging-frontend-app-name>"
gh secret set AZURE_BACKEND_WEBAPP_NAME_PRODUCTION --body "<production-backend-app-name>"
gh secret set AZURE_FRONTEND_WEBAPP_NAME_PRODUCTION --body "<production-frontend-app-name>"
gh secret set STAGING_BACKEND_HEALTH_URL --body "https://<staging-backend-domain>/health"
gh secret set PRODUCTION_BACKEND_HEALTH_URL --body "https://<production-backend-domain>/health"
```

## Phase 3 - Supabase Setup and Production Verification (Manual)

Goal: apply schema migrations safely and verify RLS/constraints before staging/production cutover.

### Step 3.1 - Backup first

1. Open Supabase production project
2. Trigger backup/snapshot
3. Record backup timestamp and identifier

### Step 3.2 - Apply migrations in order

Run these SQL files in sequence:
1. supabase/migrations/20240101000000_init.sql
2. supabase/migrations/20240201000000_sprint2.sql

### Step 3.3 - Run verification checklist

Use this checklist document and execute all SQL blocks:
- docs/program/Supabase-Production-Migration-Verification-Checklist-2026-03-24.md

Record outputs in:
- docs/program/Production-GoLive-Execution-Sheet-2026-03-24.md

Do not continue unless all verification checks pass.

## Phase 4 - Azure Staging Deployment (Manual)

Goal: deploy and validate staging end-to-end.

### Step 4.1 - Trigger staging workflow

```powershell
cd C:/Users/MacBook/Desktop/BaeSoftIA/SSAD
gh workflow run ci.yml -f deploy_staging=true -f deploy_production=false
gh run list --workflow ci.yml --limit 5
gh run watch
```

### Step 4.2 - Validate staging backend health

Call the URL configured in STAGING_BACKEND_HEALTH_URL and confirm HTTP 200.

### Step 4.3 - Run staging API smoke

```powershell
cd C:/Users/MacBook/Desktop/BaeSoftIA/SSAD
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe qa/tests/smoke/api_flow_smoke.py --base-url <staging-api-url> --project-id <existing-project-uuid> --api-key <optional-api-key>
```

### Step 4.4 - Run staging UI smoke manually

Validate in staging browser:
1. Workspace opens
2. Calculation succeeds
3. Result/report/detailing render correctly
4. Projects replay works
5. Report metadata generation works

Do not proceed to production unless staging is fully green.

## Phase 5 - Cloudflare Setup and Cutover Preparation (Manual)

Goal: route production traffic safely through Cloudflare.

### Step 5.1 - DNS records

Create/verify records:
1. app.<your-domain> -> production frontend host (proxied)
2. api.<your-domain> -> production backend host (proxied)

### Step 5.2 - SSL/TLS

1. Set SSL mode to Full (strict)
2. Confirm origin certificates on Azure endpoints are valid

### Step 5.3 - Cache and firewall behavior

1. Disable aggressive caching for API paths (for example /api/*)
2. Allow static caching for frontend assets only
3. Verify WAF/firewall allows GET, POST, OPTIONS for required routes

### Step 5.4 - CORS sanity check

1. Confirm backend allows production frontend origin
2. Confirm OPTIONS preflight works for API requests

Do not switch live DNS if these checks fail.

## Phase 6 - Azure Production Deployment (Manual)

Goal: production release with approval gate and full smoke verification.

### Step 6.1 - Trigger production workflow

```powershell
cd C:/Users/MacBook/Desktop/BaeSoftIA/SSAD
gh workflow run ci.yml -f deploy_staging=false -f deploy_production=true
gh run list --workflow ci.yml --limit 5
gh run watch
```

### Step 6.2 - Approve production environment

When GitHub requests environment approval, approve production deployment.

### Step 6.3 - Validate production backend health

Call PRODUCTION_BACKEND_HEALTH_URL and confirm HTTP 200.

### Step 6.4 - Run production API smoke

```powershell
cd C:/Users/MacBook/Desktop/BaeSoftIA/SSAD
C:/Users/MacBook/AppData/Local/Programs/Python/Python312/python.exe qa/tests/smoke/api_flow_smoke.py --base-url <production-api-url> --project-id <existing-project-uuid> --api-key <optional-api-key>
```

### Step 6.5 - Run production UI smoke manually

Check:
1. Workspace flow
2. Deterministic calculation behavior
3. Result/report/detailing rendering
4. Projects replay and report metadata endpoints

## Phase 7 - Final Sign-Off and Rollback Preparedness

### Step 7.1 - Complete evidence capture

Fill all sections in:
- docs/program/Production-GoLive-Execution-Sheet-2026-03-24.md

### Step 7.2 - Final decision

Mark release decision:
1. Go, if all phases passed
2. No-Go, if any critical check failed

### Step 7.3 - Rollback conditions

Trigger rollback if any occurs:
1. Sustained 5xx or failed health checks
2. Critical user workflow break
3. Data integrity anomaly

### Step 7.4 - Rollback actions

1. Backend rollback in Azure to previous stable release
2. Frontend rollback in Azure to previous stable release
3. Database restore from snapshot only after incident approval

## Stop Rules

1. Stop if local phase is not green.
2. Stop if Supabase verification has any failed check.
3. Stop if staging smoke fails.
4. Stop if Cloudflare introduces 403/5xx or CORS issues.
5. Stop if production smoke fails.

## Execution Record Template

After each phase, record:
1. Phase number
2. Pass or Fail
3. Exact command(s) run
4. Output summary
5. Screenshot/log links
6. Next phase readiness decision
