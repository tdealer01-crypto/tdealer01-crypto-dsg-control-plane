# DSG ONE Partner API Scopes

## Goal

Expose enough API access for storefront, Bubble operator UI, onboarding, sales, demo, and partner-managed product operations without exposing production secrets, raw customer data, or core execution authority.

## Pre-sign Scopes

- partner.status.read
- partner.catalog.read
- partner.docs.read
- partner.demo.read
- partner.readiness.read
- partner.evidence.summary.read
- partner.audit.summary.read
- partner.leads.write
- partner.checkout.write

## Post-NDA Scopes

- partner.workspace.read
- partner.runtime.summary.read
- partner.approvals.read
- partner.cases.read
- partner.usage.read
- partner.capacity.read
- partner.onboarding.write
- partner.integration.read
- partner.facade.read

## Partner Maintainer Scopes

- partner.facade.write
- partner.storefront.write
- partner.onboarding.write
- partner.checkout.write
- partner.demo.manage
- partner.workspace.preview
- partner.logs.redacted.read
- partner.preview.deploy

## Not Allowed Without Owner Checkpoint

- partner.execute.write
- partner.policy.write
- partner.secret.read
- partner.secret.write
- partner.deploy.production
- partner.database.admin
- partner.cross_workspace.read
- partner.audit.raw_export
- partner.evidence.raw_export
- partner.billing.admin
- partner.auth.admin
- partner.rbac.write

## Partner API Facade Endpoints

- GET /api/partner/v1/status
- GET /api/partner/v1/catalog
- GET /api/partner/v1/docs
- GET /api/partner/v1/demo
- GET /api/partner/v1/readiness
- GET /api/partner/v1/workspace-summary
- GET /api/partner/v1/runtime-summary
- GET /api/partner/v1/evidence-summary
- GET /api/partner/v1/audit-summary
- GET /api/partner/v1/finance-governance
- GET /api/partner/v1/usage
- GET /api/partner/v1/capacity
- POST /api/partner/v1/leads
- POST /api/partner/v1/onboarding
- POST /api/partner/v1/checkout

## Internal APIs Not For Direct Partner Use

- POST /api/execute
- POST /api/spine/execute
- POST /api/mcp/call
- POST /api/gateway/tools/execute
- POST /api/executors/dispatch
- POST /api/model-provider/openrouter
- POST /api/setup/auto
- POST /api/agents/*/rotate-key

## Data Boundary

Partner-visible data should be workspace scoped, partner-org scoped, redacted, paginated, rate limited, audited, and metadata-first.

Partner-visible data should not include raw customer payload, secrets, full production DB rows, cross-customer data, unredacted audit ledger, bank details, card data, full invoice documents, or production env values.
