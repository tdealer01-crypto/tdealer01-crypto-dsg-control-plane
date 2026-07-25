-- Create org_scim_tokens table for SCIM API token management
create table if not exists org_scim_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  token_hash text not null unique, -- SHA256 hash of the actual token
  token_prefix text not null, -- First 8 chars for display (e.g. "scim_abc123")
  display_name text not null, -- Human-readable name
  is_enabled boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,

  -- Constraints
  unique (org_id, token_prefix),
  constraint org_scim_tokens_org_id_chk check (char_length(org_id) > 0),
  constraint org_scim_tokens_token_hash_chk check (char_length(token_hash) = 64), -- SHA256 is 64 chars hex
  constraint org_scim_tokens_prefix_chk check (char_length(token_prefix) >= 8)
);

-- Create indexes
create index if not exists idx_org_scim_tokens_org_id
  on org_scim_tokens (org_id, is_enabled);

create index if not exists idx_org_scim_tokens_token_hash
  on org_scim_tokens (token_hash);

create index if not exists idx_org_scim_tokens_expires_at
  on org_scim_tokens (expires_at) where is_enabled = true and expires_at is not null;

-- Enable RLS
alter table org_scim_tokens enable row level security;

-- RLS: Org admins and owners can read their tokens
create policy "org_scim_tokens_org_select"
  on org_scim_tokens for select
  using (
    exists (
      select 1 from user_org_roles
      where org_id = org_scim_tokens.org_id
        and user_id = auth.uid()
        and role_name in ('admin', 'owner')
    )
  );

-- RLS: Org admins and owners can insert tokens for their org
create policy "org_scim_tokens_org_insert"
  on org_scim_tokens for insert
  with check (
    exists (
      select 1 from user_org_roles
      where org_id = org_scim_tokens.org_id
        and user_id = auth.uid()
        and role_name in ('admin', 'owner')
    )
  );

-- RLS: Org admins and owners can update tokens for their org
create policy "org_scim_tokens_org_update"
  on org_scim_tokens for update
  using (
    exists (
      select 1 from user_org_roles
      where org_id = org_scim_tokens.org_id
        and user_id = auth.uid()
        and role_name in ('admin', 'owner')
    )
  );

-- RLS: Org admins and owners can delete tokens for their org
create policy "org_scim_tokens_org_delete"
  on org_scim_tokens for delete
  using (
    exists (
      select 1 from user_org_roles
      where org_id = org_scim_tokens.org_id
        and user_id = auth.uid()
        and role_name in ('admin', 'owner')
    )
  );

-- Create function to verify SCIM token and update last_used_at
create or replace function verify_scim_token(
  p_org_id text,
  p_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_token_exists boolean;
begin
  -- Check if token exists, is enabled, and not expired
  select exists(
    select 1 from org_scim_tokens
    where org_id = p_org_id
      and token_hash = p_token_hash
      and is_enabled = true
      and (expires_at is null or expires_at > now())
  ) into v_token_exists;

  -- Update last_used_at if token is valid
  if v_token_exists then
    update org_scim_tokens
    set last_used_at = now()
    where org_id = p_org_id and token_hash = p_token_hash;
  end if;

  return v_token_exists;
end;
$$;

-- Grant permission for the function
grant execute on function verify_scim_token(text, text) to anon, authenticated;
