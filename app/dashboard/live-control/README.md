# Live Control Page

Route: `/dashboard/live-control`

This page is intentionally additive:
- no existing dashboard route is replaced
- it uses existing repo APIs only
- it is safe to merge before a later navigation/layout update

Wired endpoints:
- `/api/health`
- `/api/usage`
- `/api/executions?limit=8`
- `/api/integration`
- `/api/audit?limit=8`
