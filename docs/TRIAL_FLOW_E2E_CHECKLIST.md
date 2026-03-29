# Trial Flow E2E Checklist (Signup → Confirm → Provision → Workspace)

This checklist is for proving the operator trial path end-to-end using the live stack.

## Preconditions

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are valid.
- Supabase Auth email provider is configured and can send emails.
- The trial email already exists in `public.users` with:
  - `email = <trial_email>`
  - `is_active = true`
  - `org_id` is not null

## 1) Submit login and verify send path

Use the login form at `/login` or submit via HTTP:

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'email=<trial_email>&next=/workspace'
```

Pass criteria:
- Response is `302`.
- `Location` contains `/login?next=%2Fworkspace&message=check-email`.
- Server logs include `[magic-link] OTP RESULT` with `ok: true`.

## 2) Confirm magic link and verify auto-provision linking

Open the magic-link from email. It should call `/auth/confirm`.

Pass criteria:
- Callback redirects to `/workspace`.
- In DB, `public.users.auth_user_id` is set for that email.
- User row still has `is_active = true` and non-null `org_id`.

## 3) Verify workspace and quickstart access

After confirmation, open:
- `/workspace`
- `/quickstart`

Pass criteria:
- No redirect back to `/login`.
- Both pages render for authenticated session.
- `/dashboard/executions` is still accessible from links on both pages.

## Failure signals

- `/login?error=send-failed` → email send path or allowlist/provisioning mismatch.
- `/login?error=not-provisioned` → callback verified auth but `users` row is not active or missing `org_id`.
- Redirect to `/login` from `/workspace` or `/quickstart` → session cookie missing/expired or middleware protection mismatch.
