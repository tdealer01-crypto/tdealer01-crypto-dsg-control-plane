# DSG OS and Spacetime architecture boundary

This document locks the product ownership terms and adapter execution flow. It defines the intended architecture; it is not a claim that every component is deployed, enabled, or live.

## Definitions

| System | Locked definition | Owns |
|---|---|---|
| DSG OS | User-facing browser/workspace, Adapter Builder, and local verification surface | Adapter contract authoring, route-registration request, result display, and local evidence verification |
| DSG Spacetime | Execution and governance control plane | Plan, route, entitlement, policy, approval, payload binding, deterministic gate, and governed provider execution |

The legacy hosted product formerly called DSG Control Plane is no longer used. In this architecture, “control plane” describes Spacetime's execution/governance responsibility only; it does not refer to the retired service. The browser surface can prepare and inspect actions. Spacetime remains the authority for whether an action may execute and for governing that execution.

## DSG OS / Browser

### Adapter Builder

The Adapter Builder UI defines an Adapter Contract with:

- Provider
- Capability
- Input and output schemas
- Risk
- Scope
- Approval requirements
- Payload binding
- Result verifier
- Evidence mapping

The workspace compiles the Adapter Contract and requests route registration with Spacetime. Compilation or registration in a source interface does not itself prove that a live route is available.

### Local verification surface

The browser verifier presents evidence and attestation and can perform the declared local checks:

- SHA-256 digest calculation
- Laplacian recomputation
- Ed25519 signature verification
- Evidence and attestation viewing

A successful local integrity check applies only to the supplied artifacts and verifier inputs. It does not establish user approval, entitlement, provider-side execution, or semantic correctness of a result.

## DSG Spacetime / Execution Fabric

Spacetime governs the execution path:

1. Resolve the plan and route.
2. Check entitlement and policy.
3. Obtain required approval.
4. Bind the permitted payload.
5. Apply the PR #558 deterministic gate.
6. Dispatch through the registered provider adapter.
7. Return the result with evidence and attestation.

Adapter targets may include MCP/HTTP, Desktop/native, CLI/Shell, Browser, Filesystem, Process, REST API, Server, Deploy, Webhook, Database, Cloud, Device/XR, Git/GitHub, Secrets, and A2A. Each target still requires its own registered capability, schema, scope, permission, and verification evidence.

## Result and next-action loop

The provider result returns with evidence and attestation to the DSG OS browser verifier. The verifier checks the declared digest, Laplacian, signature, and evidence mapping. The verified record can then inform a next Spacetime action, which is independently checked against its plan, route, entitlement, policy, approval, and payload binding.

The browser verifier is a local verification surface; it does not become an execution or approval authority.

## Authority and evidence boundary

- DSG OS authors and displays the adapter contract and presents local verification.
- Spacetime owns route execution, entitlement, policy, approval, payload binding, and the deterministic gate.
- Provider adapters perform the configured provider operation only after Spacetime authorizes the action.
- Evidence and attestation describe a result and its verification; they do not substitute for approval.
- Source code, a PR, or source-level CI is not proof of a live provider integration or deployment.

## Related source record

[PR #558: integrated DSG system and browser verifier](https://github.com/tdealer01-crypto/DSG-Private-Production-Runtime/pull/558) is merged. Its exact head, f2c0ee6a443dca11d48e4ea41d095d28b480dd81, passed the [DSG Spacetime Private Runtime CI run 1834](https://github.com/tdealer01-crypto/DSG-Private-Production-Runtime/actions/runs/38127316900). The PR body explicitly says this is source/CI proof and that production release status is not claimed; it also excludes any claim of live Provider Adapter v2 activation. The CI result verifies the source workflow only, not production deployment or live provider execution.
