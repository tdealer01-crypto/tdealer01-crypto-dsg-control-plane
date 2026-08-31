# DSG Control Plane

Deterministic governance control plane for AI-agent execution. The repository is the source of truth for implementation, policy gates, tests, deployment configuration, runtime evidence, and audit artifacts.

## Production

**Authoritative production platform: Azure App Service**

- Production URL: `https://dsg-control-plane.azurewebsites.net`
- Deployment target: [`config/production-deployment-target.json`](config/production-deployment-target.json)
- Azure deployment evidence: [`qa-logs/azure-production/`](qa-logs/azure-production/)
- Runtime environment guidance: [`docs/ops/azure-runtime-env-sync.md`](docs/ops/azure-runtime-env-sync.md)

A deployment is not treated as production-ready from configuration alone. The Azure target, post-deploy health/readiness checks, and committed evidence must agree.

## What DSG does

DSG evaluates agent actions against an approved plan and policy before execution. The intended runtime contract is:

`approved plan -> preflight -> alignment/constraints -> execution -> evidence -> verification -> audit/replay`

The governance layer must not block an action merely because governance exists. It must verify that the requested action is inside the approved plan, preserve evidence, and deny unsupported claims or actions outside the approved scope.

## Operator path

1. Confirm the user-approved goal and plan.
2. Run the applicable preflight/gate before external mutation.
3. Execute only actions covered by the approved plan and available permissions.
4. Record runtime evidence and test/deployment results.
5. Verify the resulting state rather than inferring success from a command exit alone.
6. Expose the result to the user as `PASS`, `REVIEW`, `BLOCK`, `FAILED`, or another repository-defined state with the next corrective action.

## Local development

Requirements:

- Node.js `>=24`
- npm
- Required runtime secrets/services for the feature being exercised

```bash
git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane
npm ci
npm run typecheck
npm test
npm run build
```

Do not treat a local build as production evidence. Production status is established by Azure deployment and post-deploy verification evidence.

## Verification and evidence

Useful repository surfaces include:

- `tests/` — automated verification
- `qa-logs/` — captured QA/deployment evidence
- `.github/workflows/` — CI/CD automation
- `lib/` and `app/` — implementation
- `docs/` — operating and architecture documentation
- `config/production-deployment-target.json` — production deployment authority

For any capability claim, prefer current code plus executable evidence over historical planning documents or screenshots.

## Decision discipline

Every material decision should preserve enough context to answer:

- What did the user approve?
- What action was attempted?
- Which policy/constraint was evaluated?
- What evidence was produced?
- What actually passed or failed?
- What should the operator do next?

Unverified data is not a successful result. Missing evidence must remain `UNVERIFIED`, `REVIEW`, or `BLOCK` according to the applicable risk policy.

## Secrets

Do not commit live secrets. Runtime secrets should use the production secret-management path documented for Azure. Example environment files are documentation only and are not evidence that a secret exists in production.

## Production truth boundary

The repository must not claim production success, compliance, solver proof, deployment completion, or runtime health without current supporting evidence. If code, configuration, runtime state, and documentation disagree, verify the running Azure service and update the repository so they converge.
