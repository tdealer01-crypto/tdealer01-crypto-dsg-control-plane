# Enterprise Security RBAC Evidence Kit

Date: 2026-05-11
Branch: `enterprise-security-rbac-evidence-kit`

## Purpose

This kit adds a review surface for enterprise security, RBAC, organization isolation, and audit-event readiness.

It does not claim that server-side RBAC, tenant isolation, or audit logging are fully implemented.

## Added routes

- `GET /api/dsg/marketplace/security-rbac`
- `GET /enterprise/security-rbac`

## Added script

```bash
APP_URL=https://your-preview-or-production-url.example npm run smoke:security-rbac
```

The script validates that the security RBAC endpoint returns a valid evidence report with status gates and no-mock policy.

## Current status

The marketplace `security-rbac-org-isolation` gate is moved from `BLOCKED` to `REVIEW` because this PR adds:

- security RBAC evidence model
- security RBAC API endpoint
- security RBAC customer/operator page
- smoke script

It is not `PASS` yet.

## Required before PASS

1. Server-side RBAC source of truth
2. Allowed-role test
3. Denied-role test
4. Cross-org denial test
5. Audit event schema
6. Privileged action audit event test
7. Runtime enforcement proof
8. Owner approval

## No false claim rule

Do not mark this gate `PASS` until real server-side enforcement, negative tests, and audit evidence are attached.
