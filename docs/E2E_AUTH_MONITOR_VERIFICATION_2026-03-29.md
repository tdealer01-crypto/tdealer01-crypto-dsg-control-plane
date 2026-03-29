# E2E Verification — auth/login, auth/signup, api/core/monitor (2026-03-29)

## Scope
- POST `/auth/login`
- POST `/auth/signup`
- GET `/api/core/monitor` (after login)

## Method
1. Inspect route handlers and dependency chain.
2. Confirm required runtime dependencies for true end-to-end behavior.
3. Check repository notes for implementation state.

## Verified facts from code

### 1) POST `/auth/login`
- Route exists and accepts `formData` (`email`, `next`).
- Route queries `users` table for an active profile with non-null `org_id` before sending OTP.
- Route calls `supabase.auth.signInWithOtp` with `shouldCreateUser: false`.
- On success returns HTTP 302 redirect with `message=check-email`; on failure returns error redirect.

### 2) POST `/auth/signup`
- Route exists and accepts `formData` (`email`, `workspace_name`, `full_name`, `next`).
- Route writes organization/user records via service-role Supabase client.
- Route then calls `supabase.auth.signInWithOtp` with `shouldCreateUser: true`.
- On success returns HTTP 302 redirect with `message=check-email`; on failure returns `error=signup-failed` redirect.

### 3) GET `/api/core/monitor` (after login)
- Route exists and requires authenticated Supabase user + active profile (`users.auth_user_id`, `org_id`, `is_active`).
- On authorized access, route aggregates:
  - DSG core health/metrics/ledger/audit/determinism calls.
  - Supabase rows from `executions`, `agents`, `usage_counters`, `billing_subscriptions`.
- Returns JSON payload with readiness/core/control_plane/billing/alerts.

## End-to-end status judgment

### Environment gate for real E2E
- Both auth routes and monitor route hard-require Supabase env vars.
- Missing env vars throw runtime errors (`Missing Supabase public environment variables` / `Missing Supabase server environment variables`).
- `.env.example` leaves these values empty, so this repo alone does not provide runnable E2E by itself.

### Repository declared state
- README states this repo is currently a blueprint and the next milestone is wiring persistence/billing.

## Verdict (strictly from visible repo evidence)
- POST `/auth/login` **implemented at route level but E2E cannot be confirmed from visible local setup alone**.
- POST `/auth/signup` **implemented at route level but E2E cannot be confirmed from visible local setup alone**.
- `/api/core/monitor` **implemented and returns real aggregated data only when valid auth session + Supabase data/core dependencies are available; full E2E cannot be confirmed from visible local setup alone**.

## Mandatory uncertainty statements
- จุดนี้ยังยืนยันไม่ได้จากไฟล์และข้อมูลที่มองเห็นอยู่
- มองไม่เห็น repo/file/config ที่จำเป็นต่อการสรุปจุดนี้
- ไม่มีหลักฐานพอจะสรุปเป็น fact
