-- Conversation lifecycle and backend UI config
create table if not exists conversations (
  id text primary key,
  agent_id text not null,
  org_id text not null,
  status text not null default 'active' check (status in ('active','ended','archived')),
  ended_at timestamptz,
  ui_edit_enabled boolean not null default false,
  ui_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_org_created
  on conversations (org_id, created_at desc);

create index if not exists idx_conversations_agent_status
  on conversations (agent_id, status);

comment on table conversations is
  'Tracks conversation lifecycle and enables backend UI config editing only after conversation ends.';
