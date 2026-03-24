-- Sprint 1 foundation migration (draft)

create table if not exists users (
    id uuid primary key,
    email text unique not null,
    full_name text,
    tier text not null default 'free',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists projects (
    id uuid primary key,
    user_id uuid not null references users(id),
    name text not null,
    description text,
    status text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists elements (
    id uuid primary key,
    project_id uuid not null references projects(id),
    element_type text not null,
    element_name text,
    code text not null,
    version text not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists calculation_runs (
    id uuid primary key,
    project_id uuid not null references projects(id),
    element_id uuid references elements(id),
    request_id text unique not null,
    module text not null,
    code text not null,
    version text not null,
    status text not null,
    normalized_inputs jsonb not null default '{}'::jsonb,
    result_payload jsonb not null default '{}'::jsonb,
    warnings jsonb not null default '[]'::jsonb,
    checks jsonb not null default '[]'::jsonb,
    created_by uuid references users(id),
    created_at timestamptz not null default now()
);

create table if not exists report_artifacts (
    id uuid primary key,
    calculation_run_id uuid not null references calculation_runs(id),
    artifact_type text not null,
    storage_key text not null,
    checksum text,
    created_at timestamptz not null default now()
);

create table if not exists audit_events (
    id uuid primary key,
    user_id uuid references users(id),
    project_id uuid references projects(id),
    calculation_run_id uuid references calculation_runs(id),
    event_type text not null,
    event_payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_projects_user_updated
on projects (user_id, updated_at desc);

create index if not exists idx_elements_project_type
on elements (project_id, element_type);

create index if not exists idx_runs_project_created
on calculation_runs (project_id, created_at desc);

create index if not exists idx_audit_project_created
on audit_events (project_id, created_at desc);
