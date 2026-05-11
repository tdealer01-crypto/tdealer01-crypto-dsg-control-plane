# Enterprise Smoke Evidence Packet

Date: 2026-05-11
Source: operator-supplied Termux screenshots in ChatGPT session
Production base URL shown: `https://dsg-one-v1.vercel.app`

## Evidence boundary

This file records observed smoke output from the operator terminal. It is evidence for review, not a full enterprise marketplace PASS.

The screenshots show commands and output from a live Termux shell. The connector did not independently rerun these commands in the target production environment, so these entries should remain REVIEW evidence until CI, Vercel logs, or attached terminal artifacts are archived in the release packet.

## Build and static generation evidence

Observed from screenshot:

- `npm run lint` executed with no visible error in the captured output.
- `npm run dsg:typecheck` executed with no visible error in the captured output.
- `npm run build:termux` completed successfully.
- Build output included:
  - `Compiled successfully`
  - `Checking validity of types`
  - `Collecting page data`
  - `Generating static pages (63/63)`
  - `Collecting build traces`
  - `Finalizing page optimization`

## Route evidence

Observed from screenshot:

```bash
BASE="https://dsg-one-v1.vercel.app"
```

Manual route checks returned:

- `200 /enterprise/entitlement`
- `200 /api/dsg/marketplace/entitlement`

## Smoke script evidence

### Accessibility QA

Command shown:

```bash
npm run smoke:accessibility-qa
```

Observed result:

- `PASS: accessibility QA endpoint responded with a valid evidence report`
- endpoint: `https://dsg-one-v1.vercel.app/api/dsg/marketplace/accessibility-qa`
- verdict: `BLOCKED`
- checks: `4`
- pass: `0`
- review: `1`
- blocked: `3`

Interpretation: endpoint/schema smoke passed. The accessibility QA gate itself remains blocked internally until review notes are attached.

### Marketplace readiness

Command shown:

```bash
npm run smoke:marketplace-readiness
```

Observed result:

- `PASS: marketplace readiness endpoint responded with a valid audit report`
- endpoint: `https://dsg-one-v1.vercel.app/api/dsg/marketplace/readiness`
- verdict: `REVIEW`
- gates: `6`
- pass: `0`
- review: `6`
- blocked: `0`
- noMockPolicy.enforced: `true`

Interpretation: the overall marketplace readiness endpoint is valid and has no blocked top-level gates after the scaffold work. It is still REVIEW, not PASS.

### App Builder flow proof

Command shown:

```bash
npm run smoke:app-builder-flow-proof
```

Observed result:

- `PASS: DSG App Builder flow proof completed fail-closed`
- proofKind: `APP_BUILDER_FLOW_FAIL_CLOSED_PROOF`
- stages:
  - prd: `PASS`
  - plan: `PASS`
  - observer: `BLOCK`
  - handoff: `BLOCKED`
  - runtimeGate: `BLOCKED`
- runtimeGateStatus: `BLOCKED`
- claimBoundary:
  - productReadyClaim: `false`
  - manualLevelClaim: `false`
  - productionReadyClaim: `false`

Interpretation: the app-builder proof is behaving safely. It proves the system fails closed instead of making false production-ready claims.

### Entitlement evidence

Command shown after setting `APP_URL`:

```bash
export APP_URL="https://dsg-one-v1.vercel.app"
npm run smoke:entitlement
```

Observed result:

- `PASS: entitlement endpoint responded with a valid evidence report`
- endpoint: `https://dsg-one-v1.vercel.app/api/dsg/marketplace/entitlement`
- verdict: `BLOCKED`
- checks: `4`
- pass: `0`
- review: `1`
- blocked: `3`

Interpretation: entitlement endpoint/schema smoke passed. The entitlement evidence kit remains internally BLOCKED for real plan, seat, quota, upgrade, and denial enforcement proof. This is the correct fail-closed state.

### Security RBAC evidence

Command shown after setting `APP_URL`:

```bash
export APP_URL="https://dsg-one-v1.vercel.app"
npm run smoke:security-rbac
```

Observed result:

- `PASS: security RBAC endpoint responded with a valid evidence report`
- endpoint: `https://dsg-one-v1.vercel.app/api/dsg/marketplace/security-rbac`
- verdict: `BLOCKED`
- checks: `4`
- pass: `0`
- review: `1`
- blocked: `3`

Interpretation: security RBAC endpoint/schema smoke passed. The security evidence kit remains internally BLOCKED for real server-side RBAC, organization isolation, and audit-event enforcement proof. This is the correct fail-closed state.

## Evidence still missing before full PASS

- Production deployment READY proof from Vercel after the latest merged commit.
- RBAC/server-side enforcement tests.
- Entitlement denial and quota enforcement tests.
- Keyboard/accessibility review notes.
- Owner approvals for legal, security, support, accessibility, and commercial gates.

## Recommended next command set

```bash
export APP_URL="https://dsg-one-v1.vercel.app"

npm run smoke:entitlement
npm run smoke:security-rbac
npm run smoke:accessibility-qa
npm run smoke:marketplace-readiness
npm run smoke:app-builder-flow-proof
```
