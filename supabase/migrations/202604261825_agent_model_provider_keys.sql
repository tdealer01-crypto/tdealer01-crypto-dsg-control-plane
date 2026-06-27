create table if not exists public.agent_model_provider_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('openrouter')),
  encrypted_api_key text not null,
  api_key_preview text not null default 'hidden',
  status text not null default 'active' check (status in ('active', 'disabled', 'replaced')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_model_provider_keys_org_provider_status
  on public.agent_model_provider_keys(org_id, provider, status, updated_at desc);

alter table public.agent_model_provider_keys enable row level security;

drop policy if exists agent_model_provider_keys_no_client_access on public.agent_model_provider_keys;
create policy agent_model_provider_keys_no_client_access
  on public.agent_model_provider_keys
  for all
  using (false)
  with check (false);
