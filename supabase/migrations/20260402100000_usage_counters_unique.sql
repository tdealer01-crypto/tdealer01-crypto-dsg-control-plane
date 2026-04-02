create unique index if not exists idx_usage_counters_agent_period
  on public.usage_counters(agent_id, billing_period);
