create or replace function public.raise_immutable_record()
returns trigger
language plpgsql
as $$
begin
  raise exception '%', coalesce(TG_ARGV[0], 'record is append only');
end;
$$;
