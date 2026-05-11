# AGENTS.md

## DSG repo rules

- Read real files before editing.
- Do not add mock production evidence.
- Do not mark PASS without real file, route, test, deployment, or owner approval evidence.
- Use PASS / REVIEW / BLOCKED for readiness states.
- REVIEW and BLOCKED must include nextAction.
- Preserve existing package scripts.
- Do not add dependencies unless necessary.
- Run:
  - npm run lint
  - npm run dsg:typecheck
  - npm run build:termux
  - npm run smoke:marketplace-readiness
  - npm run smoke:app-builder-flow-proof
  - npm run smoke:audit-packet
  - npm run smoke:first-value-flow
- If APP_URL is required, use:
  export APP_URL="https://dsg-one-v1.vercel.app"
