# Runbook: Deployment & Smoke Checks (commands)

## 1) Ensure env on Vercel
./set-vercel-runtime-env.sh   # optional, runs vercel env add for common keys

## 2) Deploy production
npx vercel --prod

## 3) Apply Supabase migrations (example)
supabase link --project-ref <PROJECT_REF>
supabase db push

## 4) Validate core readiness
curl -sS https://<APP_URL>/api/core/monitor | jq .

## 5) Smoke checks
curl -sS https://<APP_URL>/api/health
curl -sS https://<APP_URL>/api/usage
# Sample execution path (adjust payload as required)
curl -sS -X POST https://<APP_URL>/api/intent -d '{"intent":"sample"}' -H 'Content-Type: application/json'

## 6) Run E2E (docker local or CI)
docker run --rm -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.58.2-focal \
  bash -lc "npm ci && npm run build && ENABLE_DEMO_BOOTSTRAP=true DEMO_BOOTSTRAP_TOKEN=e2e npm run dev & npx playwright test"

## 7) Final check
- Confirm all CI jobs (unit/integration/e2e/security) passed.
- Confirm Supabase migrations applied.
- Confirm monitor readiness returns readiness_status: "ready".
