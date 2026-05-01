# AI Action Governance Checklist

Purpose: this checklist helps reviewers evaluate whether an AI agent, workflow, deployment, or automation action is controlled before it can affect a production system.

Boundary: this checklist is an operational readiness aid. It is not a certification report.

## Control checklist

| Control area | Question | DSG evidence | Status |
|---|---|---|---|
| Action identity | Is the requested tool/action explicitly named? | toolName and action fields | Implemented |
| Organization identity | Is the action scoped to an organization? | x-org-id and orgId | Implemented |
| Actor identity | Is the actor identified? | x-actor-id and actorId | Implemented |
| Actor authority | Is the actor role checked before execution? | x-actor-role and allowed-role checks | Implemented |
| Plan entitlement | Is the organization plan checked? | x-org-plan and entitlement checks | Implemented |
| Tool registration | Is the tool registered before use? | gateway_connectors and gateway_tools | Implemented |
| Action match | Does the requested action match the registered tool action? | runtime invariant check | Implemented |
| Risk handling | Are high-risk actions routed to approval or review? | risk and requiresApproval fields | Implemented |
| Pre-execution decision | Is there an allow/block/review decision before execution? | plan-check and execute decision | Implemented |
| Evidence writability | Does the system fail closed if evidence cannot be written? | audit persistence checks | Implemented |
| Request proof | Is the request hash recorded? | requestHash | Implemented |
| Result proof | Is the result hash recorded? | recordHash | Implemented |
| Customer key custody | Can the customer execute in its own runtime? | Monitor Mode | Implemented |
| Audit export | Can evidence be exported for review? | audit export endpoint | Implemented |
| CI/CD gate | Can deployment be gated before production? | GitHub Secure Deploy Gate Action | Implemented |
| Signed evidence | Can evidence be exported as a signed bundle? | signed evidence bundle | Planned |
| PDF evidence report | Can evidence be exported as human-readable PDF? | evidence report | Planned |
| Policy templates | Are reusable controls available? | control library | Planned |

## Minimum pass criteria for a governed AI action

1. Organization identity is present.
2. Actor identity is present.
3. Actor role is present and allowed.
4. Organization plan is entitled.
5. Tool is registered.
6. Requested action matches the registered action.
7. Required approval exists for high-risk or approval-required actions.
8. Evidence can be written before an allow decision is returned.
9. requestHash is generated.
10. recordHash is generated after execution or audit commit.

## Safe wording

DSG helps organizations evaluate and enforce pre-execution governance controls for AI-proposed actions, workflow actions, and deployment actions.
