-- =========================================================
-- DSG MONITOR / STATS / READINESS / ANALYTICS SCHEMA
-- For PostgreSQL / Supabase
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1) ENUM-LIKE CHECKS
-- ---------------------------------------------------------

create table if not exists dsg_schema_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into dsg_schema_meta (key, value)
values ('monitor_schema_version', '1')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();


-- ---------------------------------------------------------
-- 2) CORE MONITOR SNAPSHOTS
-- One row per org per collection window
-- ---------------------------------------------------------

create table if not exists core_monitor_snapshots (
  id bigserial primary key,

  org_id text not null,
  snapshot_at timestamptz not null default now(),
  window_seconds integer not null default 60 check (window_seconds > 0),

  -- core truth checks
  core_health_ok boolean not null default false,
  core_metrics_ok boolean not null default false,
  ledger_ok boolean not null default false,
  audit_ok boolean not null default false,
  determinism_ok boolean not null default false,

  -- source path / endpoint info
  core_url text,
  health_source_path text,
  metrics_source_path text,
  ledger_source_path text,
  audit_source_path text,
  determinism_source_path text,

  -- latest known core state
  latest_sequence bigint,
  deterministic boolean,
  region_count integer,
  unique_state_hashes integer,
  max_entropy numeric(18,6),
  gate_action text,

  -- product/control-plane aggregates
  requests_today integer not null default 0,
  allow_count_today integer not null default 0,
  block_count_today integer not null default 0,
  stabilize_count_today integer not null default 0,

  allow_rate numeric(8,6) not null default 0,
  block_rate numeric(8,6) not null default 0,
  stabilize_rate numeric(8,6) not null default 0,

  avg_latency_ms numeric(12,3) not null default 0,
  p95_latency_ms numeric(12,3),
  error_count_today integer not null default 0,

  active_agents integer not null default 0,
  active_users integer not null default 0,

  -- billing / quota overlay
  executions_this_month integer not null default 0,
  included_executions integer not null default 0,
  overage_executions integer not null default 0,
  projected_amount_usd numeric(14,4) not null default 0,

  -- readiness
  readiness_status text not null default 'unknown'
    check (readiness_status in ('ready', 'degraded', 'down', 'blocked', 'unknown')),
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  readiness_reasons jsonb not null default '[]'::jsonb,

  -- rolled-up alerts
  alerts_count integer not null default 0,
  alerts jsonb not null default '[]'::jsonb,

  raw_core_metrics jsonb,
  raw_health jsonb,
  raw_ledger_summary jsonb,
  raw_audit_summary jsonb,
  raw_determinism jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_core_monitor_snapshots_org_time
  on core_monitor_snapshots (org_id, snapshot_at desc);

create index if not exists idx_core_monitor_snapshots_status_time
  on core_monitor_snapshots (readiness_status, snapshot_at desc);


-- ---------------------------------------------------------
-- 3) READINESS HISTORY
-- Lightweight history table for state transitions
-- ---------------------------------------------------------

create table if not exists readiness_history (
  id bigserial primary key,

  org_id text not null,
  recorded_at timestamptz not null default now(),

  status text not null
    check (status in ('ready', 'degraded', 'down', 'blocked', 'unknown')),

  score integer not null default 0 check (score between 0 and 100),

  core_health_ok boolean,
  core_metrics_ok boolean,
  ledger_ok boolean,
  audit_ok boolean,
  determinism_ok boolean,
  db_ok boolean,
  billing_ok boolean,
  auth_ok boolean,

  reason_codes jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_readiness_history_org_time
  on readiness_history (org_id, recorded_at desc);


-- ---------------------------------------------------------
-- 4) ALERT EVENTS
-- Persistent alert log for dashboard + agents
-- ---------------------------------------------------------

create table if not exists alert_events (
  id bigserial primary key,

  org_id text not null,

  level text not null
    check (level in ('info', 'warning', 'error', 'critical')),
  code text not null,
  message text not null,

  source text not null
    check (source in ('core', 'control_plane', 'billing', 'quota', 'auth', 'db', 'system', 'agent')),

  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved', 'suppressed')),

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,

  occurrence_count integer not null default 1 check (occurrence_count > 0),

  severity_score integer not null default 0 check (severity_score between 0 and 100),

  fingerprint text,
  payload jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb
);

create index if not exists idx_alert_events_org_status_time
  on alert_events (org_id, status, last_seen_at desc);

create index if not exists idx_alert_events_code
  on alert_events (code);


-- ---------------------------------------------------------
-- 5) AGENT STATS DAILY
-- Daily rollups per agent
-- ---------------------------------------------------------

create table if not exists agent_stats_daily (
  id bigserial primary key,

  org_id text not null,
  agent_id text not null,
  stat_date date not null,

  requests_count integer not null default 0,
  allow_count integer not null default 0,
  block_count integer not null default 0,
  stabilize_count integer not null default 0,

  allow_rate numeric(8,6) not null default 0,
  block_rate numeric(8,6) not null default 0,
  stabilize_rate numeric(8,6) not null default 0,

  avg_latency_ms numeric(12,3) not null default 0,
  p95_latency_ms numeric(12,3),

  quota_hits integer not null default 0,
  error_count integer not null default 0,

  last_used_at timestamptz,
  latest_decision text,

  extra jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (org_id, agent_id, stat_date)
);

create index if not exists idx_agent_stats_daily_org_date
  on agent_stats_daily (org_id, stat_date desc);

create index if not exists idx_agent_stats_daily_agent_date
  on agent_stats_daily (agent_id, stat_date desc);


-- ---------------------------------------------------------
-- 6) ORG STATS HOURLY
-- Hourly rollups for trend charts and readiness analysis
-- ---------------------------------------------------------

create table if not exists org_stats_hourly (
  id bigserial primary key,

  org_id text not null,
  bucket_start timestamptz not null,

  requests_count integer not null default 0,
  allow_count integer not null default 0,
  block_count integer not null default 0,
  stabilize_count integer not null default 0,
  error_count integer not null default 0,

  allow_rate numeric(8,6) not null default 0,
  block_rate numeric(8,6) not null default 0,
  stabilize_rate numeric(8,6) not null default 0,

  avg_latency_ms numeric(12,3) not null default 0,
  p95_latency_ms numeric(12,3),

  active_agents integer not null default 0,
  active_users integer not null default 0,

  core_ok_ratio numeric(8,6),
  determinism_ok_ratio numeric(8,6),

  alerts_count integer not null default 0,
  degraded_minutes integer not null default 0,
  down_minutes integer not null default 0,

  created_at timestamptz not null default now(),

  unique (org_id, bucket_start)
);

create index if not exists idx_org_stats_hourly_org_bucket
  on org_stats_hourly (org_id, bucket_start desc);


-- ---------------------------------------------------------
-- 7) CORE EVENT INGEST (OPTIONAL LIGHTWEIGHT CACHE)
-- Sanitized cache of recent core-side events for dashboard
-- ---------------------------------------------------------

create table if not exists core_audit_event_cache (
  id bigserial primary key,

  org_id text not null,
  sequence bigint not null,
  region_id text,
  gate_result text,
  state_hash text,
  entropy numeric(18,6),
  signature text,
  created_at_core timestamptz,
  collected_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_core_audit_event_cache_org_seq
  on core_audit_event_cache (org_id, sequence desc);

create index if not exists idx_core_audit_event_cache_org_time
  on core_audit_event_cache (org_id, collected_at desc);


create table if not exists core_ledger_cache (
  id bigserial primary key,

  org_id text not null,
  sequence bigint,
  region_id text,
  gate_result text,
  state_hash text,
  created_at_core timestamptz,
  collected_at timestamptz not null default now(),

  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_core_ledger_cache_org_seq
  on core_ledger_cache (org_id, sequence desc);


-- ---------------------------------------------------------
-- 8) AGENT TRAINING EVENTS (SANITIZED)
-- For analytics/retrieval/training-safe downstream use
-- ---------------------------------------------------------

create table if not exists agent_training_events (
  id bigserial primary key,

  org_id text not null,
  agent_id text,
  execution_id text,

  event_type text not null,
  decision text,
  readiness_status text,
  quota_state text,

  latency_ms integer,
  signal_payload jsonb not null default '{}'::jsonb,
  label_payload jsonb not null default '{}'::jsonb,

  -- sanitized source references only
  source_snapshot_id bigint references core_monitor_snapshots(id) on delete set null,
  source_alert_id bigint references alert_events(id) on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists idx_agent_training_events_org_time
  on agent_training_events (org_id, created_at desc);

create index if not exists idx_agent_training_events_agent_time
  on agent_training_events (agent_id, created_at desc);


-- ---------------------------------------------------------
-- 9) USER / ORG READINESS SIGNALS
-- Compact signals for agent reasoning about user/org state
-- ---------------------------------------------------------

create table if not exists user_readiness_signals (
  id bigserial primary key,

  org_id text not null,
  user_ref text,
  signal_time timestamptz not null default now(),

  auth_ok boolean,
  profile_active boolean,
  billing_ok boolean,
  quota_ok boolean,
  core_ok boolean,

  signal_code text not null,
  signal_value numeric(18,6),
  signal_text text,

  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_user_readiness_signals_org_time
  on user_readiness_signals (org_id, signal_time desc);


-- ---------------------------------------------------------
-- 10) MATERIALIZED VIEW: CURRENT ORG READINESS
-- Latest known readiness snapshot per org
-- ---------------------------------------------------------

drop materialized view if exists org_current_readiness;

create materialized view org_current_readiness as
select distinct on (org_id)
  org_id,
  snapshot_at,
  readiness_status,
  readiness_score,
  readiness_reasons,
  core_health_ok,
  core_metrics_ok,
  ledger_ok,
  audit_ok,
  determinism_ok,
  requests_today,
  avg_latency_ms,
  active_agents,
  executions_this_month,
  overage_executions,
  alerts_count
from core_monitor_snapshots
order by org_id, snapshot_at desc;

create unique index if not exists idx_org_current_readiness_org
  on org_current_readiness (org_id);


-- ---------------------------------------------------------
-- 11) MATERIALIZED VIEW: AGENT HOTSPOTS
-- Most problematic agents for dashboards / agents
-- ---------------------------------------------------------

drop materialized view if exists agent_hotspots_7d;

create materialized view agent_hotspots_7d as
select
  org_id,
  agent_id,
  sum(requests_count) as requests_count_7d,
  sum(block_count) as block_count_7d,
  sum(stabilize_count) as stabilize_count_7d,
  avg(avg_latency_ms) as avg_latency_ms_7d,
  sum(quota_hits) as quota_hits_7d,
  max(last_used_at) as last_used_at
from agent_stats_daily
where stat_date >= current_date - interval '7 days'
group by org_id, agent_id;

create index if not exists idx_agent_hotspots_7d_org
  on agent_hotspots_7d (org_id);


-- ---------------------------------------------------------
-- 12) HELPER VIEW: ALERT SUMMARY
-- ---------------------------------------------------------

create or replace view alert_summary_open as
select
  org_id,
  level,
  code,
  count(*) as open_count,
  max(last_seen_at) as last_seen_at
from alert_events
where status in ('open', 'acknowledged')
group by org_id, level, code;


-- ---------------------------------------------------------
-- 13) OPTIONAL RLS ENABLEMENT
-- You likely want org-scoped reads in app-facing queries.
-- Keep service-role writes unrestricted at the app layer.
-- ---------------------------------------------------------

alter table core_monitor_snapshots enable row level security;
alter table readiness_history enable row level security;
alter table alert_events enable row level security;
alter table agent_stats_daily enable row level security;
alter table org_stats_hourly enable row level security;
alter table core_audit_event_cache enable row level security;
alter table core_ledger_cache enable row level security;
alter table agent_training_events enable row level security;
alter table user_readiness_signals enable row level security;

-- NOTE:
-- These policies assume your JWT/app layer can provide org_id safely
-- through auth.uid()-based joins or request.jwt.claims.
-- Replace this pattern with your actual Supabase auth design.

drop policy if exists core_monitor_snapshots_org_read on core_monitor_snapshots;
create policy core_monitor_snapshots_org_read
on core_monitor_snapshots
for select
to authenticated
using (
  public.current_user_is_active()
  and org_id = public.current_user_org_id()
);

drop policy if exists readiness_history_org_read on readiness_history;
create policy readiness_history_org_read
on readiness_history
for select
to authenticated
using (
  public.current_user_is_active()
  and org_id = public.current_user_org_id()
);

drop policy if exists alert_events_org_read on alert_events;
create policy alert_events_org_read
on alert_events
for select
to authenticated
using (
  public.current_user_is_active()
  and org_id = public.current_user_org_id()
);

drop policy if exists agent_stats_daily_org_read on agent_stats_daily;
create policy agent_stats_daily_org_read
on agent_stats_daily
for select
to authenticated
using (
  public.current_user_is_active()
  and org_id = public.current_user_org_id()
);

drop policy if exists org_stats_hourly_org_read on org_stats_hourly;
create policy org_stats_hourly_org_read
on org_stats_hourly
for select
to authenticated
using (
  public.current_user_is_active()
  and org_id = public.current_user_org_id()
);

drop policy if exists core_audit_event_cache_org_read on core_audit_event_cache;
create policy core_audit_event_cache_org_read
on core_audit_event_cache
for select
to authenticated
using (
  public.current_user_is_active()
  and org_id = public.current_user_org_id()
);

drop policy if exists core_ledger_cache_org_read on core_ledger_cache;
create policy core_ledger_cache_org_read
on core_ledger_cache
for select
to authenticated
using (
  public.current_user_is_active()
  and org_id = public.current_user_org_id()
);

drop policy if exists agent_training_events_org_read on agent_training_events;
create policy agent_training_events_org_read
on agent_training_events
for select
to authenticated
using (
  public.current_user_is_active()
  and org_id = public.current_user_org_id()
);

drop policy if exists user_readiness_signals_org_read on user_readiness_signals;
create policy user_readiness_signals_org_read
on user_readiness_signals
for select
to authenticated
using (
  public.current_user_is_active()
  and org_id = public.current_user_org_id()
);

-- Writes should normally happen via service-role/admin path only.
-- So we do not add public insert/update policies here.

commit;
