create table if not exists public.defi_accounts (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,
  deposit_usd numeric not null default 0,
  share_pct numeric not null default 0,
  joined_at timestamptz not null default now()
);

create table if not exists public.defi_txns (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  type text not null check (type in ('deposit','withdraw','rebalance','yield')),
  amount_usd numeric not null,
  tx_hash text,
  protocol text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists defi_txns_wallet_idx on public.defi_txns(wallet_address);
alter table public.defi_accounts enable row level security;
alter table public.defi_txns enable row level security;
