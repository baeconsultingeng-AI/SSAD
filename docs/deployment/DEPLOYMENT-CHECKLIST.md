# SSAD Deployment Checklist
**Stack:** Vercel (frontend) · Railway (backend) · Supabase (database) · Cloudflare R2 (object storage) · GitHub (CI/CD)

---

## Phase 1 — Supabase (Database)

### 1.1 Create project
- [ ] Log in at supabase.com → **New project**
- [ ] Name: `ssad-production` | Region: pick closest to your users
- [ ] Save the **database password** securely (password manager)
- [ ] Wait for provisioning (~2 min)

### 1.2 Schema setup
- [ ] Open **SQL Editor** in the Supabase dashboard
- [ ] Run your schema migration SQL (create tables: users, projects, calculations, etc.)
- [ ] Confirm tables appear under **Table Editor**

### 1.3 Auth setup
- [ ] Go to **Authentication → Providers**
- [ ] Enable **Email** provider; configure "Confirm email" to match your app's flow
- [ ] Set **Site URL** to your Vercel domain (you'll fill this in after Phase 3): `https://ssad.vercel.app`
- [ ] Add redirect URLs: `https://ssad.vercel.app/**`

### 1.4 Collect credentials
Note these — you'll need them in every subsequent phase:
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon/public key>           # Settings → API
SUPABASE_SERVICE_ROLE_KEY=<service_role key>  # Settings → API (keep secret)
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

---

## Phase 2 — Cloudflare R2 (Object Storage)

### 2.1 Create bucket
- [ ] Log in at dash.cloudflare.com → **R2** (left sidebar)
- [ ] Click **Create bucket** → Name: `ssad-reports`
- [ ] Location: **Automatic** (or pick a region near users)

### 2.2 API credentials
- [ ] R2 → **Manage R2 API tokens** → **Create API token**
- [ ] Permissions: **Object Read & Write**
- [ ] Scope to bucket: `ssad-reports`
- [ ] Save:
```
R2_ACCOUNT_ID=<Cloudflare account ID>        # top-right of R2 page
R2_ACCESS_KEY_ID=<token access key id>
R2_SECRET_ACCESS_KEY=<token secret>
R2_BUCKET=ssad-reports
R2_PUBLIC_URL=https://pub-<hash>.r2.dev       # enable public access if needed
```

### 2.3 (Optional) Custom domain for bucket
- [ ] R2 bucket → **Settings → Custom Domains** → add `storage.yourdomain.com`
- [ ] Follow DNS verification steps in Cloudflare DNS panel

---

## Phase 3 — Railway (Backend)

### 3.1 Create project
- [ ] Log in at railway.app → **New Project → Deploy from GitHub repo**
- [ ] Select your repo | Root directory: `/backend`
- [ ] Railway auto-detects Python; confirm **Nixpacks** build

### 3.2 Set environment variables
- [ ] Railway project → **Variables** tab → add all of:
```
FLASK_ENV=production
SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_hex(32))">
DATABASE_URL=<from Phase 1.4>
SUPABASE_URL=<from Phase 1.4>
SUPABASE_SERVICE_ROLE_KEY=<from Phase 1.4>
R2_ACCOUNT_ID=<from Phase 2.2>
R2_ACCESS_KEY_ID=<from Phase 2.2>
R2_SECRET_ACCESS_KEY=<from Phase 2.2>
R2_BUCKET=ssad-reports
ALLOWED_ORIGINS=https://ssad.vercel.app
ANTHROPIC_API_KEY=<your key>
OPENAI_API_KEY=<your key if used>
```

### 3.3 Configure start command
- [ ] Railway → **Settings → Deploy** → Start command:
  ```
  gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
  ```
- [ ] Confirm `gunicorn` is in `backend/requirements.txt`

### 3.4 Verify deployment
- [ ] Railway deploys automatically on push to `main`
- [ ] Check **Deploy logs** — look for `Listening at: http://0.0.0.0:xxxx`
- [ ] Note your Railway URL: `https://ssad-backend.up.railway.app`
- [ ] Test health endpoint: `GET https://ssad-backend.up.railway.app/api/health` → `200 OK`

### 3.5 (Optional) Custom domain
- [ ] Railway → **Settings → Domains** → **Add custom domain**: `api.yourdomain.com`
- [ ] Add the CNAME record shown in your DNS provider

---

## Phase 4 — Vercel (Frontend)

### 4.1 Import project
- [ ] Log in at vercel.com → **Add New Project → Import Git Repository**
- [ ] Select your repo | Root directory: `/frontend`
- [ ] Framework preset: **Next.js** (auto-detected)

### 4.2 Set environment variables
- [ ] Vercel → **Project Settings → Environment Variables** → add:
```
NEXT_PUBLIC_API_URL=https://ssad-backend.up.railway.app   # or custom domain
NEXT_PUBLIC_SUPABASE_URL=<from Phase 1.4>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Phase 1.4>
```
- [ ] Set all three for **Production**, **Preview**, and **Development** environments

### 4.3 Deploy
- [ ] Click **Deploy** — Vercel builds and deploys
- [ ] Check build logs for TypeScript/ESLint errors
- [ ] Note your Vercel URL: `https://ssad.vercel.app` (or custom)

### 4.4 Go back to Supabase and update URLs
- [ ] Supabase → **Authentication → URL Configuration**
- [ ] **Site URL**: `https://ssad.vercel.app`
- [ ] **Redirect URLs**: `https://ssad.vercel.app/**`

### 4.5 (Optional) Custom domain
- [ ] Vercel → **Project → Domains** → add `yourdomain.com`
- [ ] Add the DNS records Vercel shows (A record or CNAME) in Cloudflare DNS
- [ ] Wait for SSL to provision (~5 min)
- [ ] Update `NEXT_PUBLIC_API_URL` and Supabase URLs to match

---

## Phase 5 — GitHub CI/CD

### 5.1 Verify auto-deploy is working
- [ ] Vercel auto-deploys `main` branch by default — confirm in **Project → Git** settings
- [ ] Railway auto-deploys `main` branch by default — confirm in **Service → Settings → Deploy**

### 5.2 Add GitHub Secrets (for any custom Actions)
- [ ] GitHub repo → **Settings → Secrets → Actions** → add if you have custom workflows:
```
VERCEL_TOKEN       # Vercel → Account Settings → Tokens
RAILWAY_TOKEN      # Railway → Account → Tokens
```

### 5.3 (Optional) Add a basic CI workflow
Create `.github/workflows/ci.yml` if not already present:
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  frontend-typecheck:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx tsc --noEmit
  backend-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r requirements.txt
      - run: python -m pytest --tb=short || true
```

---

## Phase 6 — Smoke Tests (Post-Deploy)

- [ ] Open `https://ssad.vercel.app` — login screen loads
- [ ] Sign up with a new email — confirmation email arrives (check spam)
- [ ] Log in — workspace loads correctly
- [ ] Run a calculation — result returned from Railway backend
- [ ] Check report generation — PDF/output stored in R2 bucket
- [ ] Check Railway logs — no 500 errors
- [ ] Check Supabase → **Table Editor** — rows written correctly

---

## Phase 7 — Environment File Cleanup

- [ ] Ensure `frontend/.env.local` is in `.gitignore` (never commit real keys)
- [ ] Ensure `backend/.env` is in `.gitignore`
- [ ] Update `frontend/.env.local.example` and `backend/.env.example` with placeholder key names (no values)

---

## Quick Reference — Service URLs

| Service | URL |
|---|---|
| Frontend | https://ssad.vercel.app |
| Backend API | https://ssad-backend.up.railway.app |
| Supabase dashboard | https://supabase.com/dashboard |
| Cloudflare R2 | https://dash.cloudflare.com → R2 |
| Railway | https://railway.app |
| Vercel | https://vercel.com |

---

*Good luck with deployment — pick it up fresh tomorrow!*
