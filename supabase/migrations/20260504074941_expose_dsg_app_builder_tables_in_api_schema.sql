create schema if not exists api;

create or replace view api.dsg_app_builder_jobs as
select * from public.dsg_app_builder_jobs;

create or replace view api.dsg_app_builder_approvals as
select * from public.dsg_app_builder_approvals;

create or replace view api.dsg_app_builder_tool_audits as
select * from public.dsg_app_builder_tool_audits;

grant usage on schema api to anon, authenticated, service_role;
grant select, insert, update, delete on api.dsg_app_builder_jobs to service_role;
grant select, insert, update, delete on api.dsg_app_builder_approvals to service_role;
grant select, insert, update, delete on api.dsg_app_builder_tool_audits to service_role;

grant select, insert, update, delete on public.dsg_app_builder_jobs to service_role;
grant select, insert, update, delete on public.dsg_app_builder_approvals to service_role;
grant select, insert, update, delete on public.dsg_app_builder_tool_audits to service_role;

select pg_notify('pgrst', 'reload schema');;
