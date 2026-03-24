# Supabase Migrations

## Status
- `20240101000000_init.sql` — Sprint 1: base schema (users, projects, elements, calculation_runs, report_artifacts, audit_events).
- `20240201000000_sprint2.sql` — Sprint 2: steps column, module/status allowlist constraints, RLS policies, updated_at triggers.

## How to Apply

### Option A — Supabase Dashboard (no CLI required)

1. Go to [supabase.com](https://supabase.com) → your project → **SQL Editor**.
2. Open `20240101000000_init.sql`, paste the entire contents, click **Run**.
3. Open `20240201000000_sprint2.sql`, paste the entire contents, click **Run**.
4. Copy your **Project URL** and **anon key** from Settings → API.
5. Paste them into `frontend/.env.local` and `backend/.env` (see below).

### Option B — Supabase CLI (requires Docker)

```bash
# Install CLI
npm install -g supabase

# From repo root
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Environment Variables to Set After Migration

### `frontend/.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### `backend/.env`

```
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

> Use the **service role key** (not anon key) on the backend — it bypasses RLS for server-side inserts.
