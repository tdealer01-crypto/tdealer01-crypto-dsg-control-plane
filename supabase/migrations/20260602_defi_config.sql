-- DeFi optimizer configuration (non-secret values only)
-- Private keys must stay in Vercel env vars — never stored here.
create table if not exists public.defi_config (
  key   text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.defi_config enable row level security;

create policy "service_role_full_access" on public.defi_config
  for all using (true) with check (true);

create policy "no_direct_user_access" on public.defi_config
  for all to authenticated using (false) with check (false);

-- Pre-seed keys so the UI can display empty fields immediately
insert into public.defi_config (key, value) values
  ('YIELD_OPTIMIZER_ENABLED',    'false'),
  ('KUB_WALLET_ADDRESS',         ''),
  ('KUB_LIQUID_STAKE_ADDRESS',   ''),
  ('KUB_LEND_ADDRESS',           ''),
  ('KUBSWAP_ROUTER_ADDRESS',     ''),
  ('KKUB_ADDRESS',               ''),
  ('KUB_USDT_ADDRESS',           '')
on conflict (key) do nothing;
