#!/usr/bin/env node
// Run a specific migration directly via Supabase REST API
// Usage: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/run-migration.mjs

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Usage: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/run-migration.mjs');
  process.exit(1);
}

const sql = `
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
create policy if not exists "service role full access" on public.leads for all using (true) with check (true);
`;

const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

if (res.ok) {
  console.log('✅ Migration applied successfully');
} else {
  // Fallback: try direct SQL via pg connection hint
  const err = await res.text();
  console.log('exec_sql RPC not available — use Supabase Dashboard instead:');
  console.log(`\n1. Go to: ${url.replace('.supabase.co', '')}.supabase.co → Studio → SQL Editor`);
  console.log('2. Paste and run:\n');
  console.log(sql);
  process.exit(1);
}
