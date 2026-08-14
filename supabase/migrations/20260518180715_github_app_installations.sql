create table if not exists github_app_installations (
  installation_id bigint primary key,
  org_id text not null,
  agent_id text not null,
  agent_api_key text not null,
  github_account_login text,
  installed_at timestamptz not null default now()
);
alter table github_app_installations enable row level security;
-- no public access — server-side only via service role
