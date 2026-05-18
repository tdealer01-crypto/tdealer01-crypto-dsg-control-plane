# Message to Ankit — Partner Maintainer Access Model

Hi Ankit,

I want Wartin Labs to be able to move quickly on the storefront, Bubble operator layer, partner-facing product surface, onboarding, checkout, and customer demo workflow.

My preferred model is broad Partner Maintainer access with protected DSG core checkpoints.

You would be able to manage and improve:
- Bubble storefront and operator UI
- customer-facing pages
- onboarding and request-access flows
- checkout/commercialization shell
- partner dashboard
- API mapping and integration work
- partner API facade improvements
- frontend/backend non-core fixes
- staging and preview testing
- customer demo workflow
- production deployment when automated gates pass and protected core paths are not changed

The protected boundaries would remain:
- DSG core governance engine
- policy/gate/execution logic
- audit ledger and replay proof authority
- production secrets
- Supabase service role
- Vercel production environment variables
- GitHub Actions secrets
- production database direct access
- destructive migrations
- cross-customer data access

The goal is not to slow your team down. The goal is to give Wartin Labs broad operational autonomy while keeping only the high-risk control points behind automated checkpoints and owner review.

Best,
Thanawat
