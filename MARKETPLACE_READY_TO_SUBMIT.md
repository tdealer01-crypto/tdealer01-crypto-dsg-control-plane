# MARKETPLACE READY TO SUBMIT

## GitHub Marketplace Submission - Ready to Copy/Paste

🔗 Go to: https://github.com/settings/apps → New GitHub App

Fill these fields:
- App name: DSG Control Plane
- Homepage URL: https://tdealer01-crypto-dsg-control-plane.vercel.app
- Webhook URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/github
- Description: [From MARKETPLACE_SUBMISSION_GITHUB.md]

Then go to: https://github.com/marketplace/new
- Select your app
- Upload: marketplace-assets/logo.png
- Upload 5 screenshots (1280x720px each)
- Set pricing from MARKETPLACE_SUBMISSION_GITHUB.md
- Submit for review (2-5 days)

## Stripe App Submission - Ready to Copy/Paste

🔗 Go to: https://dashboard.stripe.com/apps

Fill these fields:
- App name: DSG Control Plane
- Description: [From MARKETPLACE_SUBMISSION_STRIPE.md]
- Category: AI/ML Tools
- Use cases: [From MARKETPLACE_SUBMISSION_STRIPE.md]

Upload:
- marketplace-assets/logo.png
- 5 screenshots (1280x720px each)

Webhook configuration:
- URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe
- Events: checkout.session.completed, customer.subscription.created, invoice.payment_succeeded

Submit for review (1-3 days)
