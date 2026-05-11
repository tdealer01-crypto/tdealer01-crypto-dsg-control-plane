# First Value Flow Checklist

Use this checklist with `APP_URL="https://dsg-one-v1.vercel.app" npm run smoke:first-value-flow`.

## Routes that must return 2xx

- [ ] /dsg/app-builder
- [ ] /enterprise/readiness
- [ ] /enterprise/terms
- [ ] /enterprise/privacy
- [ ] /enterprise/security
- [ ] /enterprise/support
- [ ] /enterprise/entitlement
- [ ] /enterprise/security-rbac
- [ ] /enterprise/accessibility
- [ ] /enterprise/market
- [ ] /api/dsg/market/agent-app-builder
- [ ] /api/dsg/marketplace/audit-packet
- [ ] /api/dsg/marketplace/readiness-score

## Evidence boundary

Passing this smoke proves route accessibility only. It does not prove marketplace PASS, RBAC enforcement, billing enforcement, WCAG approval, or production readiness.
