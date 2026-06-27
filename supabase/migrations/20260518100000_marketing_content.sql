create table if not exists marketing_content (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('seo_article', 'linkedin_post')),
  title text,
  slug text unique,
  keyword text,
  meta_description text,
  body text not null,
  angle text,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketing_content_type_status
  on marketing_content(type, status, created_at desc);

alter table marketing_content enable row level security;
create policy "public can read published content"
  on marketing_content for select
  using (status = 'published');
