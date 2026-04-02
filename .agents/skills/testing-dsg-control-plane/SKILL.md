# Testing DSG Control Plane

## Production URL
- **Production:** https://tdealer01-crypto-dsg-control-plane.vercel.app
- **Preview URLs:** Generated per PR by Vercel, format: `tdealer01-crypto-dsg-cont-git-{hash}-tdealer01-cryptos-projects.vercel.app`
- Preview URLs may have Vercel authentication protection — use production URL for testing when possible.

## Deployment Timing
- After merging a PR to main, the Vercel production deployment may take several minutes to update.
- Check the build ID in the page source to verify if the deployment has been updated.
- If the production deployment hasn't updated, check the Vercel dashboard or wait and retry.
- The `/api/health` endpoint returns 200 and can be used to verify the deployment is live.

## Auth Flow Testing
- The app uses Supabase magic link authentication via `/auth/continue` route.
- **Login page:** `/login` — unified form with Login and Start Free Trial tabs.
- **Form action:** `/auth/continue` (POST) — handles both operator login and trial signup.
- Test missing-workspace error: submit email without workspace name → redirects to `/login?error=missing-workspace`.
- Test missing-email: submit empty form → HTML5 validation prevents submission.
- Test check-email success: navigate to `/login?message=check-email` to see success banner.
- Full magic link flow requires Supabase credentials (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).

## Dashboard Testing
- Dashboard pages are protected by middleware — redirects to `/login?next=%2Fdashboard` without auth.
- To test dashboard features (onboarding banner, error boundaries), you need a valid Supabase session cookie.
- Error boundaries exist at `app/dashboard/error.tsx` (root) and `app/dashboard/[section]/error.tsx` (14 sub-pages).
- Onboarding banner appears when agents.length === 0 && executions.length === 0 (emerald-colored).

## API Endpoint Testing
- **POST /api/onboarding/seed** — requires authentication via `requireActiveProfile()`. Returns 401 without valid session.
- **GET /api/health** — returns 200 with service status (no auth required).
- API routes under `/api/` are NOT protected by middleware — they handle their own auth.

## Pricing Page Testing
- URL: `/pricing` — no auth required.
- Shows 4 plans: Trial (Free), Pro ($99/mo), Business ($299/mo), Enterprise ($999/mo).
- Monthly/Yearly toggle available.
- "Start Trial" CTA should link to `/login`.
- Plan prices are defined in `lib/stripe-products.ts` (PLAN_CATALOGUE).

## Key Files for Code Verification
- `lib/resend.ts` — Email service wrapper (check RESEND_API_KEY env var).
- `lib/stripe-products.ts` — Stripe plan catalogue.
- `scripts/stripe-setup.ts` — Creates Stripe products/prices.
- `app/api/onboarding/seed/route.ts` — Demo data seeding endpoint.
- `supabase/schema.sql` — Full database schema.
- `supabase/migrations/` — Migration files.

## Devin Secrets Needed
- `SUPABASE_URL` — For full auth flow testing
- `SUPABASE_ANON_KEY` — For client-side Supabase operations
- `SUPABASE_SERVICE_ROLE_KEY` — For admin operations (seed endpoint)
- `RESEND_API_KEY` — For email delivery testing (optional, falls back to Supabase email)
- `STRIPE_SECRET_KEY` — For Stripe product setup script

## Lint & Typecheck
```bash
npm run lint
npm run typecheck
```

## Running Tests
```bash
npm test
```
Tests use vitest with vi.doMock() pattern for mocking Supabase clients.
