-- Sprint 2 migration: add steps column + module constraint + RLS boilerplate
-- Applied after 20240101000000_init.sql

-- 1. Add calculation steps storage to calculation_runs
--    (stores the ordered computation steps for report rendering)
alter table calculation_runs
    add column if not exists steps jsonb not null default '[]'::jsonb;

-- 2. Add module allowlist constraint (matches _MODULE_REGISTRY in backend)
alter table calculation_runs
    drop constraint if exists chk_runs_module;

alter table calculation_runs
    add constraint chk_runs_module check (module in (
        'rc_beam_bs_v1',
        'rc_slab_bs_v1',
        'rc_column_bs_v1',
        'rc_foundation_bs_v1',
        'steel_beam_bs_v1',
        'steel_column_bs_v1',
        'steel_truss_bs_v1',
        'steel_portal_bs_v1'
    ));

-- 3. Add status allowlist constraint
alter table calculation_runs
    drop constraint if exists chk_runs_status;

alter table calculation_runs
    add constraint chk_runs_status check (status in ('ok', 'error', 'pending'));

-- 4. Add tier allowlist on users
alter table users
    drop constraint if exists chk_users_tier;

alter table users
    add constraint chk_users_tier check (tier in ('free', 'trial', 'pro'));

-- 5. Enable Row Level Security on all tables (deny-by-default)
alter table users              enable row level security;
alter table projects           enable row level security;
alter table elements           enable row level security;
alter table calculation_runs   enable row level security;
alter table report_artifacts   enable row level security;
alter table audit_events       enable row level security;

-- 6. RLS policies — users can only see their own data
--    (Supabase auth.uid() returns the authenticated user's UUID)

-- users: own row only
drop policy if exists "users: own row" on users;
create policy "users: own row" on users
    for all using (auth.uid() = id);

-- projects: own projects only
drop policy if exists "projects: own" on projects;
create policy "projects: own" on projects
    for all using (auth.uid() = user_id);

-- elements: via project ownership
drop policy if exists "elements: via project" on elements;
create policy "elements: via project" on elements
    for all using (
        exists (
            select 1 from projects p
            where p.id = elements.project_id and p.user_id = auth.uid()
        )
    );

-- calculation_runs: via project ownership
drop policy if exists "runs: via project" on calculation_runs;
create policy "runs: via project" on calculation_runs
    for all using (
        exists (
            select 1 from projects p
            where p.id = calculation_runs.project_id and p.user_id = auth.uid()
        )
    );

-- report_artifacts: via calculation_run ownership
drop policy if exists "artifacts: via run" on report_artifacts;
create policy "artifacts: via run" on report_artifacts
    for all using (
        exists (
            select 1 from calculation_runs cr
            join projects p on p.id = cr.project_id
            where cr.id = report_artifacts.calculation_run_id and p.user_id = auth.uid()
        )
    );

-- audit_events: own events only
drop policy if exists "audit: own" on audit_events;
create policy "audit: own" on audit_events
    for all using (auth.uid() = user_id);

-- 7. Updated_at trigger helper (reusable for any table)
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at
    before update on projects
    for each row execute function set_updated_at();

drop trigger if exists trg_elements_updated_at on elements;
create trigger trg_elements_updated_at
    before update on elements
    for each row execute function set_updated_at();

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
    before update on users
    for each row execute function set_updated_at();
