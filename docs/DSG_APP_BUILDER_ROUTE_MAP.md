# DSG App Builder Route Map

## Purpose

Step 15 creates the governed planning layer only.

## Routes

| Route | Method | Purpose | Boundary |
|---|---:|---|---|
| `/api/dsg/app-builder/jobs` | GET | List jobs | No execution |
| `/api/dsg/app-builder/jobs` | POST | Create job and lock goal | No execution |
| `/api/dsg/app-builder/jobs/[jobId]/plan` | POST | Create PRD, plan, and gate result | No execution |
| `/api/dsg/app-builder/jobs/[jobId]/approval` | POST | Record approval decision | No execution |
| `/api/dsg/app-builder/jobs/[jobId]/runtime-handoff` | POST | Return handoff object | No execution |

## Tables

| Table | Purpose |
|---|---|
| `dsg_app_builder_jobs` | Stores goal, PRD, plan, gate, approved plan, hashes |
| `dsg_app_builder_approvals` | Stores approval ledger |

## Security Boundary

Header context is allowed only for dev and smoke flows.
Production must use server-side Auth/RBAC before any production claim.
