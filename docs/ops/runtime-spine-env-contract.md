# Runtime Spine Environment Contract

Required env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Operational expectations:
- Service role key must have permissions for `runtime_*` tables and `runtime_commit_execution` function.
- Authenticated user context is required for RBAC-protected routes.
- Gateway/service calling `/api/intent` and `/api/execute` must provide `Authorization: Bearer <agent_api_key>`.
