-- First-touch acquisition channel attribution per organization
-- Populated once at checkout time from UTM params / referral code captured client-side;
-- never overwritten afterwards (first-touch, not last-touch).
alter table public.organizations add column if not exists acquisition_channel text;

create index if not exists organizations_acquisition_channel_idx
  on public.organizations (acquisition_channel)
  where acquisition_channel is not null;
