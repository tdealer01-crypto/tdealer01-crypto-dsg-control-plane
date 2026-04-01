# Testing DSG Control Plane

## Overview
The DSG Control Plane is a Next.js app deployed on Vercel. Testing involves verifying UI rendering, form behavior, error/success states, CTA links, and auth route handling.

## Deployment URLs
- **Production**: `https://tdealer01-crypto-dsg-control-plane.vercel.app`
- **Preview** (SSO-protected): Preview URLs from Vercel PRs may return 401 due to Vercel SSO protection. Use the production URL for post-merge testing.

## Browser Setup
The VM's `google-chrome` wrapper script uses a CDP proxy on `localhost:29229`. If the proxy isn't running:
1. Launch Chrome directly with `--remote-debugging-port=29229`:
   ```bash
   DISPLAY=:0 /opt/.devin/chrome/chrome/linux-137.0.7118.2/chrome-linux64/chrome \
     --no-first-run --disable-gpu --no-sandbox \
     --remote-debugging-port=29229 "<URL>" &>/dev/null &
   ```
2. After this, the `google-chrome` wrapper will work for opening new tabs.
3. Maximize with: `DISPLAY=:0 wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz`

**Note**: The Chrome binary path may change over time. Check `/opt/.devin/chrome/` for available versions.

## Key Pages to Test
- `/login` — Unified login/signup form
- `/` — Homepage with CTAs
- `/pricing` — Pricing page with trial CTA
- `/signup` — Old signup page (kept for backward compatibility)

## Auth Flow Testing
The unified auth flow uses `/auth/continue` (POST endpoint). Key test scenarios:

### What can be tested without Supabase credentials:
- Form structure: `action="/auth/continue"`, `method="post"`, required email field
- Error banners via URL params: `?error=missing-email`, `?error=missing-workspace`, `?error=send-failed`, `?error=signup-failed`, `?error=not-allowed`, `?error=unexpected`
- Success banners: `?message=check-email`, `?message=signed-out`
- CTA links on homepage and pricing page
- HTML5 form validation (required email field)
- Form submission with non-provisioned email (will return `error=missing-workspace` if no workspace provided, or `error=unexpected` if Supabase isn't configured)

### What requires Supabase credentials:
- Full magic link delivery
- Operator login flow (signInWithOtp)
- Trial signup flow (trial_signups upsert + OTP)
- Auth callback at `/auth/confirm`

## Verification via curl
For quick verification without browser interaction:
```bash
# Check form structure
curl -s "<URL>/login" | rg -o 'action="[^"]*"'
curl -s "<URL>/login" | rg -o 'name="[^"]*"'

# Check CTA links on homepage
curl -s "<URL>/" | rg 'href="/login"'
curl -s "<URL>/" | rg 'Start free trial'  # should find nothing

# Check pricing trial CTA
curl -s "<URL>/pricing" | rg 'href="/login"'

# Check backward compatibility
curl -s -o /dev/null -w "%{http_code}" "<URL>/signup"
```

## Integration Tests
Unit/integration tests are in `tests/integration/api/auth-continue.test.ts` using vitest.
- Run with: `npx vitest run tests/integration/api/auth-continue.test.ts`
- Tests use Proxy-based `chainMock` helper for Supabase query builder mocking
- `APP_URL` env var must be set (e.g., `http://localhost`) for `getTrustedAppOrigin` to work with plain Request objects

## Devin Secrets Needed
- No secrets required for UI-level testing on production deployment
- For full auth flow testing: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` would be needed
