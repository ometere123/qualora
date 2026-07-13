alter table public.dataset_profiles
  add column if not exists evidence_manifest_json text,
  add column if not exists evidence_public_token uuid not null default gen_random_uuid();

create unique index if not exists dataset_profiles_evidence_public_token_idx
  on public.dataset_profiles (evidence_public_token);

alter table public.genlayer_governance_verdicts
  drop constraint if exists genlayer_governance_verdicts_governance_case_id_key;

create unique index if not exists genlayer_verdict_deployment_case_idx
  on public.genlayer_governance_verdicts (contract_address, governance_case_id);

comment on column public.dataset_profiles.evidence_manifest_json is
  'Canonical public, summary-only evidence manifest. Never contains credentials or raw rows.';

comment on column public.dataset_profiles.evidence_public_token is
  'Unguessable token used to expose a validator-readable evidence manifest.';
