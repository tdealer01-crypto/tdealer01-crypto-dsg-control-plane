-- MCP OAuth 2.0 Token Storage
-- Supports RFC 8414 OAuth server + RFC 9728 protected resource
-- Tokens are opaque, stored with hash, linked to user's MCP API key

-- Main token storage table
create table if not exists public.mcp_oauth_tokens (
  token_id          uuid        primary key default gen_random_uuid(),
  actor_id          uuid        not null references auth.users(id) on delete cascade,
  key_id            uuid        not null references public.dsg_mcp_api_keys(key_id) on delete cascade,
  token_hash        text        not null unique,
  token_type        text        not null default 'bearer',
  scope             text        not null default 'mcp:execute',
  refresh_token     text,
  refresh_token_hash text,
  expires_at        timestamptz not null,
  refresh_expires_at timestamptz,
  revoked_at        timestamptz,
  client_id         text        not null default 'claude-ai-connector-v1',
  code_challenge    text,
  code_challenge_method text     default 'S256',
  created_at        timestamptz not null default now(),
  last_used_at      timestamptz,
  user_agent        text,
  ip_address        text
);

-- Row-level security: users can only see their own tokens
alter table public.mcp_oauth_tokens enable row level security;

create policy "actor sees own oauth tokens"
  on public.mcp_oauth_tokens for select
  using (actor_id = auth.uid());

create policy "actor can revoke own tokens"
  on public.mcp_oauth_tokens for update
  using (actor_id = auth.uid())
  with check (actor_id = auth.uid() and revoked_at is not null);

-- Authorization codes (transient, stored in Redis, but audit log here)
create table if not exists public.mcp_oauth_codes (
  code_id           uuid        primary key default gen_random_uuid(),
  actor_id          uuid        not null references auth.users(id) on delete cascade,
  code_hash         text        not null unique,
  code_challenge    text        not null,
  code_challenge_method text     not null default 'S256',
  scope             text        not null default 'mcp:execute',
  client_id         text        not null default 'claude-ai-connector-v1',
  redirect_uri      text        not null,
  state_hash        text        not null,
  nonce             text        not null,
  expires_at        timestamptz not null,
  exchanged_at      timestamptz,
  exchanged_token_id uuid,
  created_at        timestamptz not null default now()
);

alter table public.mcp_oauth_codes enable row level security;

create policy "actor sees own oauth codes"
  on public.mcp_oauth_codes for select
  using (actor_id = auth.uid());

-- Indexes for performance
create index if not exists mcp_oauth_tokens_actor_idx on public.mcp_oauth_tokens(actor_id);
create index if not exists mcp_oauth_tokens_key_idx on public.mcp_oauth_tokens(key_id);
create index if not exists mcp_oauth_tokens_expires_idx on public.mcp_oauth_tokens(expires_at);
create index if not exists mcp_oauth_tokens_revoked_idx on public.mcp_oauth_tokens(revoked_at) where revoked_at is null;

create index if not exists mcp_oauth_codes_actor_idx on public.mcp_oauth_codes(actor_id);
create index if not exists mcp_oauth_codes_expires_idx on public.mcp_oauth_codes(expires_at);

-- RPC: Validate OAuth access token (lookup by hash)
create or replace function validate_mcp_oauth_token(
  p_token_hash text
) returns table(
  token_id          uuid,
  actor_id          uuid,
  key_id            uuid,
  scope             text,
  token_type        text,
  expires_at        timestamptz,
  subscription_active boolean,
  calls_used        integer,
  calls_limit       integer
)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_token   public.mcp_oauth_tokens%rowtype;
  v_key     public.dsg_mcp_api_keys%rowtype;
  v_used    integer;
begin
  -- Lookup token by hash
  select * into v_token
  from public.mcp_oauth_tokens
  where token_hash = p_token_hash
    and revoked_at is null
    and expires_at > now()
  limit 1;

  if not found then return; end if;

  -- Lookup linked API key
  select * into v_key
  from public.dsg_mcp_api_keys
  where key_id = v_token.key_id
    and status = 'ACTIVE'
    and period_end > now()
  limit 1;

  if not found then return; end if;

  -- Count usage in current period
  select count(*) into v_used
  from public.dsg_mcp_usage
  where dsg_mcp_usage.key_id = v_key.key_id
    and called_at >= v_key.period_start
    and called_at < v_key.period_end;

  -- Return token + key + usage info
  return query select
    v_token.token_id,
    v_token.actor_id,
    v_key.key_id,
    v_token.scope,
    v_token.token_type,
    v_token.expires_at,
    (v_key.stripe_subscription_id is not null and v_key.period_end > now())::boolean as subscription_active,
    v_used,
    v_key.calls_limit;
end;
$$;

-- RPC: Create OAuth token after successful authorization
create or replace function create_mcp_oauth_token(
  p_actor_id        uuid,
  p_key_id          uuid,
  p_token_hash      text,
  p_scope           text,
  p_expires_in_seconds integer
) returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_token_id uuid;
begin
  insert into public.mcp_oauth_tokens(
    actor_id, key_id, token_hash, scope, expires_at, client_id
  ) values (
    p_actor_id, p_key_id, p_token_hash, p_scope, now() + (p_expires_in_seconds || ' seconds')::interval, 'claude-ai-connector-v1'
  )
  returning token_id into v_token_id;

  return v_token_id;
end;
$$;

-- RPC: Revoke OAuth token
create or replace function revoke_mcp_oauth_token(
  p_token_hash text,
  p_actor_id   uuid
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.mcp_oauth_tokens
  set revoked_at = now()
  where token_hash = p_token_hash
    and actor_id = p_actor_id;
end;
$$;

-- RPC: Record OAuth token usage
create or replace function record_mcp_oauth_token_usage(
  p_token_id uuid
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.mcp_oauth_tokens
  set last_used_at = now()
  where token_id = p_token_id;
end;
$$;

-- RPC: Exchange authorization code for token
create or replace function exchange_mcp_oauth_code(
  p_code_hash       text,
  p_code_verifier   text,
  p_token_hash      text,
  p_key_id          uuid,
  p_expires_in_seconds integer
) returns table(
  token_id          uuid,
  token_hash        text,
  token_type        text,
  expires_in        integer,
  scope             text
)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_code       public.mcp_oauth_codes%rowtype;
  v_actor_id   uuid;
  v_token_id   uuid;
  v_challenge_hash text;
begin
  -- Lookup code
  select * into v_code
  from public.mcp_oauth_codes
  where code_hash = p_code_hash
    and exchanged_at is null
    and expires_at > now()
  limit 1;

  if not found then return; end if;

  -- Validate PKCE: S256(code_verifier) == code_challenge
  if v_code.code_challenge_method = 'S256' then
    select encode(digest(p_code_verifier, 'sha256'), 'base64') into v_challenge_hash;
    if v_challenge_hash != v_code.code_challenge then
      return;  -- PKCE validation failed
    end if;
  end if;

  v_actor_id := v_code.actor_id;

  -- Create token
  insert into public.mcp_oauth_tokens(
    actor_id, key_id, token_hash, scope, expires_at, client_id, code_challenge, code_challenge_method
  ) values (
    v_actor_id, p_key_id, p_token_hash, v_code.scope, now() + (p_expires_in_seconds || ' seconds')::interval,
    v_code.client_id, v_code.code_challenge, v_code.code_challenge_method
  )
  returning token_id into v_token_id;

  -- Mark code as exchanged
  update public.mcp_oauth_codes
  set exchanged_at = now(), exchanged_token_id = v_token_id
  where code_id = v_code.code_id;

  return query select
    v_token_id,
    p_token_hash,
    'bearer'::text,
    p_expires_in_seconds,
    v_code.scope;
end;
$$;

-- RPC: Create authorization code
create or replace function create_mcp_oauth_code(
  p_actor_id               uuid,
  p_code_hash              text,
  p_code_challenge         text,
  p_code_challenge_method  text,
  p_redirect_uri           text,
  p_state_hash             text,
  p_nonce                  text
) returns text
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_code_id uuid;
begin
  insert into public.mcp_oauth_codes(
    actor_id, code_hash, code_challenge, code_challenge_method,
    scope, client_id, redirect_uri, state_hash, nonce,
    expires_at
  ) values (
    p_actor_id, p_code_hash, p_code_challenge, p_code_challenge_method,
    'mcp:execute', 'claude-ai-connector-v1', p_redirect_uri, p_state_hash, p_nonce,
    now() + interval '10 minutes'
  )
  returning code_id into v_code_id;

  return v_code_id::text;
end;
$$;
