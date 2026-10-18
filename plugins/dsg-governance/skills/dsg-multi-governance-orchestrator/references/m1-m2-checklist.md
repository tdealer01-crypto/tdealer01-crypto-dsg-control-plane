# M1 / M2 governance readiness checklist

This is a blank assessment template. It does not assert that any service is deployed or any check has passed.

For every item, record status as PASS, FAIL, or UNVERIFIED, the source, observation time, exact commit or resource, and reviewer.

## M1: source and contract

- [ ] Product and control-plane ownership boundaries are documented.
- [ ] Adapter contract specifies provider, capability, schemas, risk, scope, approval, payload binding, verifier, and evidence mapping.
- [ ] Policy and approval requirements are stated.
- [ ] Deterministic verification algorithm and test inputs are versioned.
- [ ] Relevant source and CI checks ran on the exact commit.
- [ ] Unsupported claims and missing evidence are explicitly identified.

## M2: live integration and operations

- [ ] A user-authorized connector discovers the intended route.
- [ ] Authentication scope and principal are verified without exposing credentials.
- [ ] Approval and entitlement are confirmed by the responsible control plane.
- [ ] An approved, bounded test action returns a provider result.
- [ ] Result evidence and attestation validate against the documented schema.
- [ ] Monitoring, rollback, and incident ownership are documented and tested.
- [ ] Deployment and live readback evidence identify the exact environment and image.

A source pull request or passing source-level CI is not a deployment or live execution result. If any required live evidence is absent, M2 remains UNVERIFIED.
