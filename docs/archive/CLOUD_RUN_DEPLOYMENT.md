# Cloud Run Deployment Guide

## Goal

Deploy DSG ONE / CospinDSG as a containerized Cloud Run service without committing secrets to GitHub.

## Repo files

- `Dockerfile` builds the Next.js app for Cloud Run.
- `.dockerignore` keeps local build artifacts and secrets out of the image context.
- `cloudbuild.yaml` builds, pushes, and deploys the image.
- `scripts/cloud-run-smoke.sh` verifies public app, product page, runtime config, and public chat.

## Required Google Cloud resources

Create these once in the target Google Cloud project:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

gcloud artifacts repositories create cospindsg \
  --repository-format=docker \
  --location=asia-southeast1 \
  --description="CospinDSG Cloud Run images"
```

## Required runtime environment

Set secrets through Cloud Run or Secret Manager. Do not commit values to GitHub.

Required for database/runtime:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DSG_CORE_MODE=internal
```

Required for public chat provider. Choose one provider.

OpenRouter:

```text
PUBLIC_CHAT_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4.1-mini
```

OpenAI:

```text
PUBLIC_CHAT_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

Optional billing:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

## Deploy with Cloud Build

```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _REGION=asia-southeast1,_SERVICE=cospindsg-control-plane,_REPOSITORY=cospindsg
```

## Attach secrets after first deploy

Example using Secret Manager references:

```bash
gcloud run services update cospindsg-control-plane \
  --region asia-southeast1 \
  --set-env-vars DSG_CORE_MODE=internal,PUBLIC_CHAT_PROVIDER=openrouter \
  --set-secrets NEXT_PUBLIC_SUPABASE_URL=NEXT_PUBLIC_SUPABASE_URL:latest,NEXT_PUBLIC_SUPABASE_ANON_KEY=NEXT_PUBLIC_SUPABASE_ANON_KEY:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,OPENROUTER_API_KEY=OPENROUTER_API_KEY:latest,OPENROUTER_MODEL=OPENROUTER_MODEL:latest
```

If using direct environment variables, set them in Cloud Run UI or via `gcloud run services update --set-env-vars`. Secrets should use Secret Manager for production.

## Smoke test

After deploy, run:

```bash
scripts/cloud-run-smoke.sh https://YOUR-CLOUD-RUN-URL
```

Expected checks:

- `/` returns 200.
- `/product` returns 200.
- `/api/public-chat/runtime` returns provider/runtime state.
- `/api/public-chat` returns `mode` as one of:
  - `openrouter_chat_completions_api`
  - `openai_responses_api`
  - `fallback_public_chat`

For Marketplace readiness, fallback mode is not enough. A real provider mode must pass.

## Claim boundary

This guide only prepares deployment. It does not prove production readiness by itself. Production readiness requires Cloud Build logs, Cloud Run revision health, runtime env verification, Supabase migration status, and smoke evidence.
