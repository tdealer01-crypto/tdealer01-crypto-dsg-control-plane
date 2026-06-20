# DSG ONE Documentation Index

This directory contains repo-grounded documentation for the DSG ONE control plane.

## Current evidence and review docs

- [`PRODUCTION_EVIDENCE_2026-06-20.md`](PRODUCTION_EVIDENCE_2026-06-20.md) — single evidence index for the June 20 production recovery, PR #754 merge, PR #750 self-hosted runner boundary, Vercel READY deployments, Supabase billing schema snapshot, Stripe product snapshot, Oracle MCP browser automation boundary, and explicit revenue/claim boundaries.
- [`ORACLE_MCP_BROWSER_AUTOMATION_RUNBOOK_2026-06-20.md`](ORACLE_MCP_BROWSER_AUTOMATION_RUNBOOK_2026-06-20.md) — Oracle Cloud VM-hosted MCP browser automation worker runbook, env contract, health/action checks, security requirements, and evidence format.
- [`CODEBASE_REVIEW_2026-06-17.md`](CODEBASE_REVIEW_2026-06-17.md) — codebase review with inspected files, implemented behavior, and explicit claim boundaries.
- [`IMPLEMENTED_SURFACES_2026-06-17.md`](IMPLEMENTED_SURFACES_2026-06-17.md) — route/schema surface map for reviewers.

## Reading order

1. Start with the root [`README.md`](../README.md).
2. Read [`PRODUCTION_EVIDENCE_2026-06-20.md`](PRODUCTION_EVIDENCE_2026-06-20.md) before requesting new proof or repeating deployment/revenue checks.
3. Read [`ORACLE_MCP_BROWSER_AUTOMATION_RUNBOOK_2026-06-20.md`](ORACLE_MCP_BROWSER_AUTOMATION_RUNBOOK_2026-06-20.md) before setting up or claiming Oracle-hosted MCP browser automation.
4. Read the codebase review for claim boundaries.
5. Read implemented surfaces for route and schema inspection paths.
6. Add new proof to the production evidence snapshot instead of scattering it across chat, screenshots, or ad-hoc notes.

## Review principle

Documentation in this repo should prefer exact implemented routes, files, schema objects, deployment IDs, commit SHAs, and database observations over broad marketing claims. If evidence is partial, the docs should say so directly.
