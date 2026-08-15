create table if not exists public.billing_activation_proofs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  tier text not null check (tier in ('pro', 'enterprise')),
  subscription_status text not null check (subscription_status in ('active', 'trialing')),
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  proof_version text not null default 'billing-activation-v1',
  evidence jsonb not null,
  proof_hash text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists billing_activation_proofs_org_created_idx
  on public.billing_activation_proofs (org_id, created_at desc);

alter table public.billing_activation_proofs enable row level security;

revoke all on public.billing_activation_proofs from anon;
revoke insert, update, delete on public.billing_activation_proofs from authenticated;
grant select on public.billing_activation_proofs to authenticated;

drop policy if exists billing_activation_proofs_select_org on public.billing_activation_proofs;
create policy billing_activation_proofs_select_org
  on public.billing_activation_proofs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.auth_user_id = auth.uid()
        and u.is_active is true
        and u.org_id::text = billing_activation_proofs.org_id
    )
  );

create or replace function public.reject_billing_activation_proof_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'billing_activation_proofs is append-only';
end;
$$;

drop trigger if exists billing_activation_proofs_append_only on public.billing_activation_proofs;
create trigger billing_activation_proofs_append_only
before update or delete on public.billing_activation_proofs
for each row execute function public.reject_billing_activation_proof_mutation();

create or replace function public.capture_billing_activation_proof()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_evidence jsonb;
  v_hash text;
begin
  if new.tier not in ('pro', 'enterprise')
     or new.subscription_status not in ('active', 'trialing')
     or new.stripe_customer_id is null
     or new.stripe_subscription_id is null then
    return new;
  end if;

  v_evidence := jsonb_build_object(
    'proof_type', 'billing_activation',
    'proof_version', 'billing-activation-v1',
    'org_id', new.org_id,
    'tier', new.tier,
    'subscription_status', new.subscription_status,
    'stripe_customer_id', new.stripe_customer_id,
    'stripe_subscription_id', new.stripe_subscription_id,
    'current_period_start', new.current_period_start,
    'current_period_end', new.current_period_end
  );

  v_hash := 'sha256:' || encode(digest(convert_to(v_evidence::text, 'UTF8'), 'sha256'), 'hex');

  insert into public.billing_activation_proofs (
    org_id,
    tier,
    subscription_status,
    stripe_customer_id,
    stripe_subscription_id,
    current_period_start,
    current_period_end,
    proof_version,
    evidence,
    proof_hash
  ) values (
    new.org_id,
    new.tier,
    new.subscription_status,
    new.stripe_customer_id,
    new.stripe_subscription_id,
    new.current_period_start,
    new.current_period_end,
    'billing-activation-v1',
    v_evidence,
    v_hash
  )
  on conflict (proof_hash) do nothing;

  return new;
end;
$$;

drop trigger if exists dsg_gate_entitlement_capture_activation_proof on public.dsg_gate_entitlements;
create trigger dsg_gate_entitlement_capture_activation_proof
after insert or update of tier, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end
on public.dsg_gate_entitlements
for each row execute function public.capture_billing_activation_proof();;
