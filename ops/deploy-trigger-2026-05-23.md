# Production redeploy trigger — 2026-05-23

Purpose: force Vercel to rebuild `main` after the login/signup/checkout entrypoint hotfix and after confirming `tsconfig.json` already contains `compilerOptions.ignoreDeprecations = "6.0"`.

Do not use this file as product evidence. Verify the active production deployment by Vercel commit SHA and smoke tests after the deployment finishes.
