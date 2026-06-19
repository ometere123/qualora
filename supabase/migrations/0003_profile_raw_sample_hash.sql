alter table public.dataset_profiles
  add column if not exists raw_sample_hash text;
