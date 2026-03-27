# Patch 001 — Fix `app/api/executions/route.ts` and standardize authenticated org scoping

## Why this patch exists

The latest Vercel build fails because `createClient()` from `lib/supabase/server.ts` is async but `app/api/executions/route.ts` uses it without `await`.

This causes a type error similar to:

```text
Property 'auth' does not exist on type 'Promise<SupabaseClient<...>>'
```

## Required production pattern

For all route handlers that use `lib/supabase/server.ts`, the pattern must be:

```ts
const supabase = await createClient();

const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const { data: profile, error: profileError } = await supabase
  .from("users")
  .select("org_id, is_active")
  .eq("auth_user_id", user.id)
  .maybeSingle();

if (profileError || !profile?.org_id || !profile.is_active) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

## Exact fix for `app/api/executions/route.ts`

### Before

```ts
const supabase = createClient();

const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();
```

### After

```ts
const supabase = await createClient();

const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();
```

## Additional enforcement for production

After resolving the build error, ensure the route remains scoped to the authenticated organization:

- only query rows where `org_id = profile.org_id`
- never return execution rows across organizations
- treat inactive profiles as `403`
- avoid using the service-role client for dashboard user requests unless absolutely necessary

## Follow-up files to review

Search and verify these routes follow the same auth model:

- `app/api/audit/route.ts`
- `app/api/audit/matrix/route.ts`
- `app/api/executions/route.ts`
- any future route that imports `lib/supabase/server.ts`

## Production acceptance check

This patch is complete only when:

1. `npm run build` passes locally
2. Vercel deployment is green
3. `/api/executions` returns `401` without auth
4. `/api/executions` returns only organization-scoped rows
5. dashboard executions load successfully after login
