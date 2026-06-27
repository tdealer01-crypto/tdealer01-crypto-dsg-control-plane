-- MCP API Key Billing: keys table + usage log + RPCs
-- Stream 2: developers pay ฿490/month → DSG_API_KEY → 10,000 calls/month

create table if not exists public.dsg_mcp_api_keys (
  key_id                  uuid        primary key default gen_random_uuid(),
  actor_id                uuid        not null references auth.users(id) on delete cascade,
  key_hash                text        not null unique,
  key_prefix              text        not null,
  label                   text        not null default 'Default',
  status                  text        not null default 'ACTIVE'
                            check (status in ('ACTIVE', 'REVOKED')),
  stripe_subscription_id  text,
  stripe_customer_id      text,
  plan_id                 text        not null default 'MCP_490',
  calls_limit             integer     not null default 10000,
  period_start            timestamptz not null default date_trunc('month', now()),
  period_end              timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  created_at              timestamptz not null default now(),
  revoked_at              timestamptz
);

alter table public.dsg_mcp_api_keys enable row level security;

create policy "actor sees own keys"
  on public.dsg_mcp_api_keys for select
  using (actor_id = auth.uid());

create table if not exists public.dsg_mcp_usage (
  usage_id    uuid        primary key default gen_random_uuid(),
  key_id      uuid        not null references public.dsg_mcp_api_keys(key_id),
  actor_id    uuid        not null,
  tool_name   text        not null,
  called_at   timestamptz not null default now()
);

alter table public.dsg_mcp_usage enable row level security;

create policy "actor sees own usage"
  on public.dsg_mcp_usage for select
  using (actor_id = auth.uid());

create index if not exists dsg_mcp_usage_key_period_idx
  on public.dsg_mcp_usage(key_id, called_at);

-- Validate key + quota check in one atomic call
create or replace function validate_mcp_api_key(
  p_key_hash text
) returns table(
  key_id      uuid,
  actor_id    uuid,
  plan_id     text,
  calls_used  integer,
  calls_limit integer
)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_key  public.dsg_mcp_api_keys%rowtype;
  v_used integer;
begin
  select * into v_key
  from public.dsg_mcp_api_keys
  where key_hash = p_key_hash
    and status   = 'ACTIVE'
    and period_end > now()
  limit 1;

  if not found then return; end if;

  select count(*) into v_used
  from public.dsg_mcp_usage
  where dsg_mcp_usage.key_id   = v_key.key_id
    and called_at >= v_key.period_start
    and called_at <  v_key.period_end;

  if v_used >= v_key.calls_limit then return; end if;

  return query select v_key.key_id, v_key.actor_id, v_key.plan_id, v_used, v_key.calls_limit;
end;
$$;

create or replace function record_mcp_usage(
  p_key_id    uuid,
  p_actor_id  uuid,
  p_tool_name text
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.dsg_mcp_usage(key_id, actor_id, tool_name)
  values (p_key_id, p_actor_id, p_tool_name);
end;
$$;

create or replace function create_mcp_api_key(
  p_actor_id   uuid,
  p_key_hash   text,
  p_key_prefix text,
  p_label      text
) returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.dsg_mcp_api_keys(actor_id, key_hash, key_prefix, label)
  values (p_actor_id, p_key_hash, p_key_prefix, p_label)
  returning key_id into v_id;
  return v_id;
end;
$$;

create or replace function revoke_mcp_api_key(
  p_key_id   uuid,
  p_actor_id uuid
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.dsg_mcp_api_keys
  set status     = 'REVOKED',
      revoked_at = now()
  where key_id   = p_key_id
    and actor_id = p_actor_id;
end;
$$;

create or replace function activate_mcp_subscription(
  p_key_id                 uuid,
  p_stripe_subscription_id text,
  p_stripe_customer_id     text,
  p_period_start           timestamptz,
  p_period_end             timestamptz
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.dsg_mcp_api_keys
  set stripe_subscription_id = p_stripe_subscription_id,
      stripe_customer_id     = p_stripe_customer_id,
      period_start           = p_period_start,
      period_end             = p_period_end
  where key_id = p_key_id;
end;
$$;

create or replace function renew_mcp_subscription_period(
  p_stripe_subscription_id text,
  p_period_start           timestamptz,
  p_period_end             timestamptz
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.dsg_mcp_api_keys
  set period_start = p_period_start,
      period_end   = p_period_end
  where stripe_subscription_id = p_stripe_subscription_id
    and status = 'ACTIVE';
end;
$$;

-- Stream 1 fix: submit_template_for_sale RPC (called by /api/dsg/templates/submit)
create or replace function submit_template_for_sale(
  p_actor_id    uuid,
  p_slug        text,
  p_name        text,
  p_description text,
  p_category    text,
  p_stack       text[],
  p_price_satang integer
) returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.dsg_templates(
    id, slug, name, description, category, stack, price_satang, seller_id, stars, popular
  ) values (
    gen_random_uuid(), p_slug, p_name, p_description, p_category, p_stack,
    p_price_satang, p_actor_id, 0, false
  )
  returning id into v_id;
  return v_id;
end;
$$;
