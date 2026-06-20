# DSG ONE Documentation Index

This directory contains repo-grounded documentation for the DSG ONE control plane.

## Current evidence and review docs

- [`PRODUCTION_EVIDENCE_2026-06-20.md`](PRODUCTION_EVIDENCE_2026-06-20.md) — single evidence index for the June 20 production recovery, PR #754 merge, Vercel READY deployments, Supabase billing schema snapshot, Stripe product snapshot, and explicit revenue/claim boundaries.
- [`CODEBASE_REVIEW_2026-06-17.md`](CODEBASE_REVIEW_2026-06-17.md) — codebase review with inspected files, implemented behavior, and explicit claim boundaries.
- [`IMPLEMENTED_SURFACES_2026-06-17.md`](IMPLEMENTED_SURFACES_2026-06-17.md) — route/schema surface map for reviewers.

## Reading order

1. Start with the root [`README.md`](../README.md).
2. Read [`PRODUCTION_EVIDENCE_2026-06-20.md`](PRODUCTION_EVIDENCE_2026-06-20.md) before requesting new proof or repeating deployment/revenue checks.
3. Read the codebase review for claim boundaries.
4. Read implemented surfaces for route and schema inspection paths.
5. Add new proof to the production evidence snapshot instead of scattering it across chat, screenshots, or ad-hoc notes.

## Review principle

Documentation in this repo should prefer exact implemented routes, files, schema objects, deployment IDs, commit SHAs, and database observations over broad marketing claims. If evidence is partial, the docs should say so directly.
