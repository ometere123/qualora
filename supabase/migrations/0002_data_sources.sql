-- ── data_sources ────────────────────────────────────────────
create table if not exists public.data_sources (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  type                 text not null,
  name                 text not null,
  status               text not null default 'active',
  encrypted_credentials text,
  connection_config    jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.data_sources enable row level security;
drop policy if exists "Users manage own data sources" on public.data_sources;
drop policy if exists "Users insert own data sources" on public.data_sources;
create policy "Users manage own data sources" on public.data_sources
  using (auth.uid() = user_id);
create policy "Users insert own data sources" on public.data_sources
  for insert with check (auth.uid() = user_id);

-- ── dataset_profiles ─────────────────────────────────────────
create table if not exists public.dataset_profiles (
  id                   uuid primary key default gen_random_uuid(),
  data_source_id       uuid references public.data_sources(id) on delete set null,
  case_id              uuid references public.governance_cases(id) on delete set null,
  row_count            bigint,
  column_count         integer,
  columns_json         jsonb,
  missingness_json     jsonb,
  duplication_json     jsonb,
  schema_drift_json    jsonb,
  freshness_json       jsonb,
  validity_json        jsonb,
  volume_json          jsonb,
  profile_hash         text,
  schema_snapshot_hash text,
  evidence_manifest_hash text,
  created_at           timestamptz not null default now()
);

alter table public.dataset_profiles enable row level security;
drop policy if exists "Users read own profiles" on public.dataset_profiles;
drop policy if exists "Users insert own profiles" on public.dataset_profiles;
create policy "Users read own profiles" on public.dataset_profiles
  using (
    data_source_id in (
      select id from public.data_sources where user_id = auth.uid()
    )
    or
    case_id in (
      select id from public.governance_cases where user_id = auth.uid()
    )
  );
create policy "Users insert own profiles" on public.dataset_profiles
  for insert with check (true);

-- ── evidence_files ───────────────────────────────────────────
-- Table may already exist from migration 0001 — only add missing columns
create table if not exists public.evidence_files (
  id                   uuid primary key default gen_random_uuid(),
  case_id              uuid references public.governance_cases(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  file_path            text not null,
  file_hash            text not null,
  file_type            text,
  storage_bucket       text not null default 'evidence',
  public_url           text,
  created_at           timestamptz not null default now()
);

-- Add data_source_id if it doesn't exist yet
alter table public.evidence_files
  add column if not exists data_source_id uuid references public.data_sources(id) on delete set null;

alter table public.evidence_files enable row level security;
drop policy if exists "Users manage own evidence" on public.evidence_files;
drop policy if exists "Users insert own evidence" on public.evidence_files;
create policy "Users manage own evidence" on public.evidence_files
  using (auth.uid() = user_id);
create policy "Users insert own evidence" on public.evidence_files
  for insert with check (auth.uid() = user_id);

-- ── add data_source_id + profile_id to governance_cases ─────
alter table public.governance_cases
  add column if not exists data_source_id uuid references public.data_sources(id) on delete set null,
  add column if not exists profile_id     uuid references public.dataset_profiles(id) on delete set null;

-- ── add row_count_estimate + owner_team to datasets ─────────
alter table public.datasets
  add column if not exists row_count_estimate bigint,
  add column if not exists owner_team         text;

-- ── grants ───────────────────────────────────────────────────
grant all on public.data_sources      to authenticated, service_role;
grant all on public.dataset_profiles  to authenticated, service_role;
grant all on public.evidence_files    to authenticated, service_role;
