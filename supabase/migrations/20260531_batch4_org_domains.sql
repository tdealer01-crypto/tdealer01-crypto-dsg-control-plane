-- Batch 4 — Domain governance (re-port of PR #114)
-- Creates ONLY the org_domains table required by the domain governance feature.
-- Source DDL: 20260401_batch4_enterprise_hardening.sql (commit 626ac41).
-- Idempotent: safe to re-run.

create extension if not exists pgcrypto;

create table if not exists org_domains (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  domain text not null,
  status text not null default 'approved' check (status in ('approved','verified','disabled')),
  verification_method text null,
  verification_token text null,
  verified_at timestamptz null,
  claim_mode text not null default 'manual' check (claim_mode in ('manual','automatic')),
  auto_join_mode text not null default 'disabled' check (auto_join_mode in ('disabled','auto_join','require_approval')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, domain)
);

create index if not exists idx_org_domains_domain_status on org_domains(domain, status);
create index if not exists idx_org_domains_org_id on org_domains(org_id);

-- RLS: API routes use the Supabase service-role admin client and enforce
-- org scoping in application code (requireOrgRole). Enable RLS so that the
-- table is locked down by default; the service role bypasses RLS, and no
-- anon/authenticated policy is granted (deny-by-default).
alter table org_domains enable row level security;
