# User Flow Audit Gate

Date: 2026-04-26

This gate applies the Production Deterministic Release Architect skill to every launch-critical user workflow.

## Required order

1. Lock input: commit SHA, package lock, environment contract, and fixed fixtures.
2. Run user workflows from the user point of view.
3. Verify that every state-changing workflow has audit evidence.
4. Run CI in a stable order.
5. Block release when any required evidence is missing.

## Required workflows

- Auth and active organization setup
- Invite member and assign role
- Create or receive a work item
- Submit work item
- Approve work item
- Reject work item
- Escalate work item
- Dashboard reads the latest persisted state
- Entitlement boundary returns expected allow or deny behavior
- Cross-organization access stays isolated

## Audit evidence requirement

Every critical action must produce evidence with:

- actor
- organization
- action
- target
- result
- timestamp

## CI order

```bash
npm ci
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:failure
npm run test:migrations
npm run build
npm run verify:production-manifest
npm run test:e2e
```

## Release rule

Green evidence means GO. Failed, missing, or unknown evidence means NO-GO.
