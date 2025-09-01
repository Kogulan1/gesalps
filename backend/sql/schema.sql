-- Gesalps database bootstrap
-- Run this once in your Supabase project.

-- Extensions
create extension if not exists pgcrypto;

-- Enum for run status (idempotent)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'run_status') then
    create type run_status as enum ('queued','running','succeeded','failed');
  end if;
end $$;

-- Tables
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists datasets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  file_url text not null,
  rows_count int,
  cols_count int,
  schema_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  dataset_id uuid not null references datasets(id) on delete cascade,
  started_by uuid not null references auth.users(id),
  method text not null,
  mode text not null,
  status run_status not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  logs_url text
);

create table if not exists run_artifacts (
  run_id uuid not null references runs(id) on delete cascade,
  kind text not null,
  path text not null,
  bytes bigint,
  mime text,
  created_at timestamptz not null default now(),
  primary key (run_id, kind)
);

create table if not exists metrics (
  run_id uuid primary key references runs(id) on delete cascade,
  payload_json jsonb not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_projects_owner on projects(owner_id);
create index if not exists idx_datasets_project on datasets(project_id);
create index if not exists idx_runs_project on runs(project_id);
create index if not exists idx_runs_dataset on runs(dataset_id);
create index if not exists idx_artifacts_run on run_artifacts(run_id);

-- RLS
alter table projects enable row level security;
alter table datasets enable row level security;
alter table runs enable row level security;
alter table run_artifacts enable row level security;
alter table metrics enable row level security;

-- Projects policies
drop policy if exists proj_select on projects;
drop policy if exists proj_ins on projects;
drop policy if exists proj_upd on projects;
drop policy if exists proj_del on projects;

create policy proj_select on projects for select using (owner_id = auth.uid());
create policy proj_ins    on projects for insert with check (owner_id = auth.uid());
create policy proj_upd    on projects for update using (owner_id = auth.uid());
create policy proj_del    on projects for delete using (owner_id = auth.uid());

-- Datasets policies (via owning project)
drop policy if exists ds_select on datasets;
drop policy if exists ds_ins on datasets;
drop policy if exists ds_upd on datasets;
drop policy if exists ds_del on datasets;

create policy ds_select on datasets for select
  using (exists (select 1 from projects p where p.id = datasets.project_id and p.owner_id = auth.uid()));
create policy ds_ins on datasets for insert
  with check (exists (select 1 from projects p where p.id = datasets.project_id and p.owner_id = auth.uid()));
create policy ds_upd on datasets for update
  using (exists (select 1 from projects p where p.id = datasets.project_id and p.owner_id = auth.uid()));
create policy ds_del on datasets for delete
  using (exists (select 1 from projects p where p.id = datasets.project_id and p.owner_id = auth.uid()));

-- Runs policies (via owning project)
drop policy if exists runs_select on runs;
drop policy if exists runs_ins on runs;
drop policy if exists runs_upd on runs;
drop policy if exists runs_del on runs;

create policy runs_select on runs for select
  using (exists (select 1 from projects p where p.id = runs.project_id and p.owner_id = auth.uid()));
create policy runs_ins on runs for insert
  with check (
    started_by = auth.uid()
    and exists (select 1 from projects p where p.id = runs.project_id and p.owner_id = auth.uid())
    and exists (select 1 from datasets d where d.id = runs.dataset_id and d.project_id = runs.project_id)
  );
create policy runs_upd on runs for update
  using (exists (select 1 from projects p where p.id = runs.project_id and p.owner_id = auth.uid()));
create policy runs_del on runs for delete
  using (exists (select 1 from projects p where p.id = runs.project_id and p.owner_id = auth.uid()));

-- Artifacts + Metrics policies (read-only for owners; writes from service role)
drop policy if exists ra_select on run_artifacts;
create policy ra_select on run_artifacts for select
  using (exists (
    select 1 from runs r join projects p on p.id = r.project_id
    where r.id = run_artifacts.run_id and p.owner_id = auth.uid()
  ));

drop policy if exists met_select on metrics;
create policy met_select on metrics for select
  using (exists (
    select 1 from runs r join projects p on p.id = r.project_id
    where r.id = metrics.run_id and p.owner_id = auth.uid()
  ));

-- Storage buckets (private)
-- Safe to run multiple times; errors ignored if bucket exists.
do $$
begin
  perform storage.create_bucket('datasets', false);
exception when others then null;
end $$;

do $$
begin
  perform storage.create_bucket('artifacts', false);
exception when others then null;
end $$;

