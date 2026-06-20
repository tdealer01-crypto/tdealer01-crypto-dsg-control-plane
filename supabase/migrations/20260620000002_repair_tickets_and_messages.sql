-- Repair Tickets Table
-- Allows customers to submit repair/support requests

create table if not exists public.repair_tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid references public.users(id) on delete set null,
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Repair Ticket Messages
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.repair_tickets(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete restrict,
  message text not null,
  is_internal_note boolean default false,
  created_at timestamp with time zone default now()
);

-- Ticket Status History (audit trail)
create table if not exists public.ticket_status_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.repair_tickets(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid not null references public.users(id) on delete restrict,
  reason text,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_repair_tickets_org_id on public.repair_tickets(org_id);
create index if not exists idx_repair_tickets_customer_id on public.repair_tickets(customer_id);
create index if not exists idx_repair_tickets_status on public.repair_tickets(status);
create index if not exists idx_repair_tickets_assigned_to on public.repair_tickets(assigned_to);
create index if not exists idx_ticket_messages_ticket_id on public.ticket_messages(ticket_id);
create index if not exists idx_ticket_messages_sender_id on public.ticket_messages(sender_id);
create index if not exists idx_ticket_status_history_ticket_id on public.ticket_status_history(ticket_id);

-- Row Level Security
alter table public.repair_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_status_history enable row level security;

-- Repair Tickets: Users can view tickets in their org
drop policy if exists repair_tickets_select on public.repair_tickets;
create policy repair_tickets_select on public.repair_tickets
  for select
  using (
    org_id = (select org_id from public.users where auth_user_id = auth.uid())
  );

-- Repair Tickets: Users can create tickets for themselves
drop policy if exists repair_tickets_insert on public.repair_tickets;
create policy repair_tickets_insert on public.repair_tickets
  for insert
  with check (
    org_id = (select org_id from public.users where auth_user_id = auth.uid())
    and customer_id = (select id from public.users where auth_user_id = auth.uid())
  );

-- Repair Tickets: Customer or assigned support can update status
drop policy if exists repair_tickets_update on public.repair_tickets;
create policy repair_tickets_update on public.repair_tickets
  for update
  using (
    org_id = (select org_id from public.users where auth_user_id = auth.uid())
    and (customer_id = (select id from public.users where auth_user_id = auth.uid())
         or assigned_to = (select id from public.users where auth_user_id = auth.uid()))
  );

-- Ticket Messages: Users in org can view
drop policy if exists ticket_messages_select on public.ticket_messages;
create policy ticket_messages_select on public.ticket_messages
  for select
  using (
    exists (
      select 1 from public.repair_tickets
      where id = ticket_messages.ticket_id
        and org_id = (select org_id from public.users where auth_user_id = auth.uid())
    )
  );

-- Ticket Messages: Users can post messages to tickets in their org
drop policy if exists ticket_messages_insert on public.ticket_messages;
create policy ticket_messages_insert on public.ticket_messages
  for insert
  with check (
    exists (
      select 1 from public.repair_tickets
      where id = ticket_messages.ticket_id
        and org_id = (select org_id from public.users where auth_user_id = auth.uid())
    )
    and sender_id = (select id from public.users where auth_user_id = auth.uid())
  );

-- Status History: Users in org can view
drop policy if exists ticket_status_history_select on public.ticket_status_history;
create policy ticket_status_history_select on public.ticket_status_history
  for select
  using (
    exists (
      select 1 from public.repair_tickets
      where id = ticket_status_history.ticket_id
        and org_id = (select org_id from public.users where auth_user_id = auth.uid())
    )
  );

-- Status History: Automatically created by trigger (see below)
drop policy if exists ticket_status_history_insert on public.ticket_status_history;
create policy ticket_status_history_insert on public.ticket_status_history
  for insert
  with check (true);  -- Triggers bypass RLS

-- Trigger: Auto-record status changes
drop function if exists public.record_ticket_status_change();
create function public.record_ticket_status_change()
returns trigger as $$
begin
  if new.status != old.status then
    insert into public.ticket_status_history (ticket_id, old_status, new_status, changed_by, created_at)
    values (new.id, old.status, new.status, new.updated_at::uuid, now());
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_ticket_status_change on public.repair_tickets;
create trigger tr_ticket_status_change
  before update on public.repair_tickets
  for each row
  execute function public.record_ticket_status_change();
