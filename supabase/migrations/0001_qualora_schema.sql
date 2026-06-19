-- ============================================================
-- Qualora — Initial Schema Migration
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  email                text not null,
  display_name         text,
  role                 text not null default 'user',
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id)
);

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Admin can read all profiles
create policy "Admins read all profiles"
  on public.profiles for select
  using ((auth.jwt() ->> 'role') = 'admin');

-- ── wallets ───────────────────────────────────────────────
create table if not exists public.wallets (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  address              text not null,
  encrypted_private_key text not null,
  encryption_version   integer not null default 1,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id),
  unique (address)
);

alter table public.wallets enable row level security;

create policy "Users read own wallet"
  on public.wallets for select
  using (auth.uid() = user_id);

create policy "Service role manages wallets"
  on public.wallets for all
  using (true)
  with check (true);

-- ── wallet_key_wraps ──────────────────────────────────────
create table if not exists public.wallet_key_wraps (
  id                   uuid primary key default gen_random_uuid(),
  wallet_id            uuid not null references public.wallets(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  method               text not null, -- 'password' | 'recovery'
  encrypted_wallet_key text not null,
  salt                 text not null,
  kdf_params           jsonb not null default '{}',
  created_at           timestamptz not null default now()
);

alter table public.wallet_key_wraps enable row level security;

create policy "Users read own key wraps"
  on public.wallet_key_wraps for select
  using (auth.uid() = user_id);

create policy "Service role manages key wraps"
  on public.wallet_key_wraps for all
  using (true)
  with check (true);

-- ── workspaces ────────────────────────────────────────────
create table if not exists public.workspaces (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  organisation_name    text,
  data_function        text,
  data_environment     text,
  primary_dataset_type text,
  governance_role      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create policy "Users manage own workspaces"
  on public.workspaces for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── datasets ──────────────────────────────────────────────
create table if not exists public.datasets (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  workspace_id         uuid not null references public.workspaces(id) on delete cascade,
  name                 text not null,
  domain               text,
  owner_name           text,
  source_system        text,
  refresh_cadence      text,
  downstream_consumers text,
  business_criticality text not null default 'medium',
  schema_summary       text,
  expected_primary_key text,
  quality_expectations text,
  governance_status    text not null default 'active',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.datasets enable row level security;

create policy "Users manage own datasets"
  on public.datasets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── governance_cases ──────────────────────────────────────
create table if not exists public.governance_cases (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  workspace_id                uuid not null references public.workspaces(id) on delete cascade,
  dataset_id                  uuid not null references public.datasets(id) on delete cascade,
  issue_type                  text not null,
  affected_columns            text,
  missingness_summary         text,
  duplication_summary         text,
  schema_drift_summary        text,
  freshness_summary           text,
  invalid_values_summary      text,
  historical_baseline_summary text,
  downstream_impact           text,
  proposed_fix                text,
  analyst_notes               text,
  candidate_outcome_a         text,
  candidate_outcome_b         text,
  candidate_outcome_c         text,
  status                      text not null default 'draft',
  submitted_to_genlayer_at    timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

alter table public.governance_cases enable row level security;

create policy "Users manage own cases"
  on public.governance_cases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all cases"
  on public.governance_cases for select
  using ((auth.jwt() ->> 'role') = 'admin');

-- ── evidence_files ────────────────────────────────────────
create table if not exists public.evidence_files (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  governance_case_id  uuid not null references public.governance_cases(id) on delete cascade,
  file_url            text not null,
  file_path           text not null,
  file_bucket         text not null,
  file_type           text not null,
  file_size           bigint not null,
  evidence_hash       text not null,
  uploaded_by         uuid not null references auth.users(id),
  created_at          timestamptz not null default now()
);

alter table public.evidence_files enable row level security;

create policy "Users manage own evidence"
  on public.evidence_files for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── data_snapshots ────────────────────────────────────────
create table if not exists public.data_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  governance_case_id  uuid not null references public.governance_cases(id) on delete cascade,
  source_type         text not null,
  source_url          text,
  snapshot_json       jsonb not null default '{}',
  snapshot_hash       text not null,
  created_at          timestamptz not null default now()
);

alter table public.data_snapshots enable row level security;

create policy "Users manage own snapshots"
  on public.data_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── genlayer_governance_verdicts ──────────────────────────
create table if not exists public.genlayer_governance_verdicts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  governance_case_id  uuid not null references public.governance_cases(id) on delete cascade,
  contract_address    text not null,
  transaction_hash    text not null,
  case_id_on_chain    text not null,
  verdict             text not null,
  dataset_action      text not null,
  severity            text not null,
  confidence_label    text not null,
  selected_outcome    text,
  reasoning_summary   text not null,
  evidence_digest     text,
  fix_assessment      text,
  downstream_risk     text,
  consensus_status    text not null default 'pending',
  consensus_timestamp timestamptz,
  created_at          timestamptz not null default now()
);

alter table public.genlayer_governance_verdicts enable row level security;

create policy "Users read own verdicts"
  on public.genlayer_governance_verdicts for select
  using (auth.uid() = user_id);

create policy "Service role manages verdicts"
  on public.genlayer_governance_verdicts for all
  using (true)
  with check (true);

create policy "Admins read all verdicts"
  on public.genlayer_governance_verdicts for select
  using ((auth.jwt() ->> 'role') = 'admin');

-- ── recovery_audit_logs ───────────────────────────────────
create table if not exists public.recovery_audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  wallet_id   uuid not null references public.wallets(id) on delete cascade,
  action      text not null,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

alter table public.recovery_audit_logs enable row level security;

create policy "Users read own audit logs"
  on public.recovery_audit_logs for select
  using (auth.uid() = user_id);

create policy "Service role manages audit logs"
  on public.recovery_audit_logs for all
  using (true)
  with check (true);

-- ── admin_review_notes ────────────────────────────────────
create table if not exists public.admin_review_notes (
  id                  uuid primary key default gen_random_uuid(),
  governance_case_id  uuid not null references public.governance_cases(id) on delete cascade,
  admin_user_id       uuid not null references auth.users(id),
  note                text not null,
  created_at          timestamptz not null default now()
);

alter table public.admin_review_notes enable row level security;

create policy "Admins manage review notes"
  on public.admin_review_notes for all
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- ── contract_activity_logs ────────────────────────────────
create table if not exists public.contract_activity_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  governance_case_id  uuid not null references public.governance_cases(id) on delete cascade,
  contract_address    text,
  transaction_hash    text,
  action              text not null,
  status              text not null,
  error_message       text,
  created_at          timestamptz not null default now()
);

alter table public.contract_activity_logs enable row level security;

create policy "Users read own contract logs"
  on public.contract_activity_logs for select
  using (auth.uid() = user_id);

create policy "Service role manages contract logs"
  on public.contract_activity_logs for all
  using (true)
  with check (true);

create policy "Admins read all contract logs"
  on public.contract_activity_logs for select
  using ((auth.jwt() ->> 'role') = 'admin');

-- ── updated_at triggers ───────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_wallets
  before update on public.wallets
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_workspaces
  before update on public.workspaces
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_datasets
  before update on public.datasets
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_governance_cases
  before update on public.governance_cases
  for each row execute function public.handle_updated_at();

-- ── Supabase Storage — evidence-files bucket ──────────────
insert into storage.buckets (id, name, public)
values ('evidence-files', 'evidence-files', false)
on conflict (id) do nothing;

-- Storage RLS: users can only access their own evidence files
create policy "Users upload own evidence"
  on storage.objects for insert
  with check (
    bucket_id = 'evidence-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own evidence"
  on storage.objects for select
  using (
    bucket_id = 'evidence-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own evidence"
  on storage.objects for delete
  using (
    bucket_id = 'evidence-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
