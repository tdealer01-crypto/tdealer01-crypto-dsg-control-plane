alter table public.policies
  add column if not exists status text not null default 'active';

update public.policies
set status = 'active'
where status is null;

notify pgrst, 'reload schema';;
