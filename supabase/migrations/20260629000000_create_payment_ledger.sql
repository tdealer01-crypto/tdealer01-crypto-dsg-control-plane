-- Phase 3 Feature 2: Live SOL Settlement Payment Ledger
-- Immutable audit trail for all SOL payment transactions
-- Supports idempotency checks and compliance reporting

create table public.payment_ledger (
  id uuid primary key default gen_random_uuid(),

  -- Payment identifiers
  execution_id uuid not null,
  agent_id uuid not null,
  idempotency_key text not null unique,

  -- Payment details
  recipient_wallet text not null,
  amount_sol numeric not null check (amount_sol > 0),
  description text not null default '',

  -- Transaction status
  status text not null check (status in ('pending', 'confirmed', 'failed')),
  transaction_signature text unique,
  confirmation_block_height bigint,

  -- Error handling
  error_message text,

  -- Metadata
  metadata jsonb,

  -- Timestamps (immutable audit trail)
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,

  -- Organization scoping
  org_id uuid not null references public.organizations(id) on delete cascade
);

-- Immutable append-only enforcement: no updates or deletes allowed
create policy payment_ledger_append_only on public.payment_ledger
  as restrictive
  for update using (false),
  for delete using (false);

enable row level security on public.payment_ledger;

-- Indexes for efficient queries
create index idx_payment_ledger_execution_id on public.payment_ledger(execution_id);
create index idx_payment_ledger_agent_id on public.payment_ledger(agent_id);
create index idx_payment_ledger_idempotency_key on public.payment_ledger(idempotency_key);
create index idx_payment_ledger_org_id on public.payment_ledger(org_id);
create index idx_payment_ledger_status on public.payment_ledger(status);
create index idx_payment_ledger_created_at on public.payment_ledger(created_at desc);
create index idx_payment_ledger_wallet on public.payment_ledger(recipient_wallet);

-- Audit log trigger for payment ledger inserts
create or replace function audit_payment_ledger_insert()
returns trigger as $$
begin
  insert into public.audit_logs (
    org_id,
    action,
    resource_type,
    resource_id,
    description,
    metadata
  ) values (
    new.org_id,
    'create',
    'payment_ledger',
    new.id,
    'Live SOL payment processed: ' || new.amount_sol || ' SOL to ' || substring(new.recipient_wallet for 10) || '...',
    jsonb_build_object(
      'execution_id', new.execution_id,
      'agent_id', new.agent_id,
      'status', new.status,
      'amount_sol', new.amount_sol
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger tr_audit_payment_ledger
  after insert on public.payment_ledger
  for each row
  execute function audit_payment_ledger_insert();

-- View for payment history queries
create or replace view payment_summary as
  select
    agent_id,
    status,
    count(*) as transaction_count,
    sum(amount_sol) as total_sol,
    min(created_at) as earliest_payment,
    max(created_at) as latest_payment
  from public.payment_ledger
  group by agent_id, status;
