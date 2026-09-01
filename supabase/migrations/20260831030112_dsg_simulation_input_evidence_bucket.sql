insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dsg-simulation-input-evidence','dsg-simulation-input-evidence',false,10485760,array['application/pdf','application/json','application/x-ndjson'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.dsg_simulation_input_history is
  'Append-only provenance for research and live inputs prepared before deterministic DSG simulation. PDF evidence is stored in private bucket dsg-simulation-input-evidence.';
