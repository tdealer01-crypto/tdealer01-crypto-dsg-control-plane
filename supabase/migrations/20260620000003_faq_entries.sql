-- FAQ Entries Table
-- Allows organizations to manage frequently asked questions for their customers

create table if not exists public.faq_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete restrict,
  question text not null,
  answer text not null,
  category text default 'general',
  search_keywords text,
  order_index integer default 0,
  is_published boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_faq_entries_org_id on public.faq_entries(org_id);
create index if not exists idx_faq_entries_category on public.faq_entries(category);
create index if not exists idx_faq_entries_is_published on public.faq_entries(is_published);
create index if not exists idx_faq_entries_order_index on public.faq_entries(order_index);

-- Full-text search index
create index if not exists idx_faq_entries_question_search on public.faq_entries
  using gin(to_tsvector('english', question || ' ' || coalesce(answer, '') || ' ' || coalesce(search_keywords, '')));

-- Row Level Security
alter table public.faq_entries enable row level security;

-- Policy: All users can view published FAQ entries in their org
drop policy if exists faq_entries_select on public.faq_entries;
create policy faq_entries_select on public.faq_entries
  for select
  using (
    org_id = (select org_id from public.users where auth_user_id = auth.uid())
    and is_published = true
  );

-- Policy: FAQ admins (created_by) can view all entries (including unpublished)
drop policy if exists faq_entries_select_admin on public.faq_entries;
create policy faq_entries_select_admin on public.faq_entries
  for select
  using (
    created_by = (select id from public.users where auth_user_id = auth.uid())
  );

-- Policy: Only users who created the entry can update it
drop policy if exists faq_entries_update on public.faq_entries;
create policy faq_entries_update on public.faq_entries
  for update
  using (
    created_by = (select id from public.users where auth_user_id = auth.uid())
  );

-- Policy: Only users who created the entry can delete it
drop policy if exists faq_entries_delete on public.faq_entries;
create policy faq_entries_delete on public.faq_entries
  for delete
  using (
    created_by = (select id from public.users where auth_user_id = auth.uid())
  );

-- Policy: Only org admins can insert (for now, just allow creators)
drop policy if exists faq_entries_insert on public.faq_entries;
create policy faq_entries_insert on public.faq_entries
  for insert
  with check (
    org_id = (select org_id from public.users where auth_user_id = auth.uid())
    and created_by = (select id from public.users where auth_user_id = auth.uid())
  );

-- Helper function: Search FAQ by keyword
drop function if exists public.search_faq(text);
create function public.search_faq(search_query text)
returns table (
  id uuid,
  question text,
  answer text,
  category text,
  created_at timestamp with time zone
) as $$
begin
  return query
  select
    fe.id,
    fe.question,
    fe.answer,
    fe.category,
    fe.created_at
  from public.faq_entries fe
  where fe.org_id = (select org_id from public.users where auth_user_id = auth.uid())
    and fe.is_published = true
    and (
      to_tsvector('english', fe.question || ' ' || coalesce(fe.answer, '') || ' ' || coalesce(fe.search_keywords, ''))
      @@ plainto_tsquery('english', search_query)
    )
  order by fe.order_index, fe.created_at desc;
end;
$$ language plpgsql security definer;
