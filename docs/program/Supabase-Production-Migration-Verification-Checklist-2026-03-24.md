# Supabase Production Migration Verification Checklist (2026-03-24)

## Purpose

Operational verification guide for Agent 05 after applying production migrations:
- 20240101000000_init.sql
- 20240201000000_sprint2.sql

Run each SQL block in Supabase SQL Editor and confirm expected results before moving to production sign-off.

## Prerequisites

1. Production project backup/snapshot completed.
2. Migrations applied in correct order.
3. You have SQL Editor access in the target production project.

## Verification Steps

### 1) Required tables exist

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'users',
    'projects',
    'elements',
    'calculation_runs',
    'report_artifacts',
    'audit_events'
  )
order by table_name;
```

Expected: 6 rows.

### 2) calculation_runs has required columns

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'calculation_runs'
  and column_name in (
    'id',
    'project_id',
    'element_id',
    'request_id',
    'module',
    'code',
    'version',
    'status',
    'normalized_inputs',
    'result_payload',
    'steps',
    'warnings',
    'checks',
    'created_by',
    'created_at'
  )
order by column_name;
```

Expected: 15 rows including steps jsonb.

### 3) Module and status constraints are present

```sql
select conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname in ('calculation_runs', 'users')
  and conname in ('chk_runs_module', 'chk_runs_status', 'chk_users_tier')
order by conname;
```

Expected:
1. chk_runs_module present with 8 allowed modules.
2. chk_runs_status present with ok, error, pending.
3. chk_users_tier present with free, trial, pro.

### 4) Required indexes exist

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('projects', 'elements', 'calculation_runs', 'audit_events')
order by tablename, indexname;
```

Expected includes:
1. idx_projects_user_updated
2. idx_elements_project_type
3. idx_runs_project_created
4. idx_audit_project_created

### 5) RLS is enabled on all required tables

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'users',
    'projects',
    'elements',
    'calculation_runs',
    'report_artifacts',
    'audit_events'
  )
order by tablename;
```

Expected: rowsecurity = true for all rows.

### 6) Required policies exist

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'users',
    'projects',
    'elements',
    'calculation_runs',
    'report_artifacts',
    'audit_events'
  )
order by tablename, policyname;
```

Expected policy names:
1. users: own row
2. projects: own
3. elements: via project
4. runs: via project
5. artifacts: via run
6. audit: own

### 7) updated_at trigger function and triggers exist

```sql
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'set_updated_at';

select event_object_table as table_name, trigger_name
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'trg_projects_updated_at',
    'trg_elements_updated_at',
    'trg_users_updated_at'
  )
order by table_name, trigger_name;
```

Expected:
1. set_updated_at function exists.
2. Three triggers exist for users, projects, elements.

### 8) Foreign keys and uniqueness checks

```sql
select tc.table_name, tc.constraint_name, tc.constraint_type
from information_schema.table_constraints tc
where tc.table_schema = 'public'
  and tc.table_name in ('projects', 'elements', 'calculation_runs', 'report_artifacts', 'audit_events')
  and tc.constraint_type in ('FOREIGN KEY', 'UNIQUE')
order by tc.table_name, tc.constraint_type, tc.constraint_name;
```

Expected:
1. request_id unique on calculation_runs.
2. FK relationships present between core tables.

### 9) Safe write/read smoke (service role context)

Run in a transaction and rollback to avoid persistent test records.

```sql
begin;

-- Replace with real UUIDs from your environment if needed
-- or generate values directly.

insert into users (id, email, full_name, tier)
values (
  gen_random_uuid(),
  'prod-smoke-user@example.com',
  'Prod Smoke User',
  'trial'
)
returning id;

-- Use returned user id in project insert
-- then verify update trigger by updating the project row.

rollback;
```

Expected:
1. Insert succeeds with service role.
2. No persistent data remains after rollback.

## Pass Criteria

All sections above pass without errors and expected objects are present.

## Failure Handling

1. Stop deployment promotion.
2. Record failing SQL output in evidence log.
3. Re-apply missing migration or corrective SQL.
4. Re-run full verification checklist.

## Evidence Recording

Record outcomes in:
- docs/program/Stage-3-Evidence-Log-2026-03-24.md
- docs/program/Daily-Agent-Operations-Board-2026-03-24.md (OPS-005 evidence column)
