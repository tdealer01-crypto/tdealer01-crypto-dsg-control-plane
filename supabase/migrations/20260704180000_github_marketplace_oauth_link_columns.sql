-- Carries GitHub identity through the magic-link signup flow so
-- /auth/confirm can create the marketplace_account_links row once the org
-- exists, and so support/debugging can see which installation an org
-- came from.

alter table public.trial_signups
  add column if not exists github_account_id bigint,
  add column if not exists github_login text,
  add column if not exists installation_id bigint;

alter table public.marketplace_account_links
  add column if not exists installation_id bigint;
