create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'public-chat',
  intent text,
  intent_score integer default 0 check (intent_score between 0 and 100),
  messages jsonb,
  org_id text,
  converted boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create unique index if not exists leads_email_source_idx on public.leads (email, source);
create index if not exists leads_converted_idx on public.leads (converted, created_at desc);
alter table public.leads enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='leads' and policyname='service role full access') then
    create policy "service role full access" on public.leads for all using (true) with check (true);
  end if;
end $$;;
