-- OpenClaw session registry
-- Tracks Android/Termux agent sessions for DSG audit trail

create table if not exists openclaw_sessions (
  session_id  text primary key,
  event       text not null default 'connect',
  channel     text,
  device_id   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table openclaw_sessions enable row level security;

-- Service role can read/write; authenticated users can read their own sessions
create policy "service_role_all" on openclaw_sessions
  for all using (auth.role() = 'service_role');
