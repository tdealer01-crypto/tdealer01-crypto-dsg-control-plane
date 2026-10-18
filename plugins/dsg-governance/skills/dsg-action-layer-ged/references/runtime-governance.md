# Runtime governance: conceptual lifecycle

This is an architecture checklist, not a deployed endpoint specification.

1. Plan the user goal and identify target, capability, risk, and scope.
2. Discover the adapter route and its input/output schema from the configured control plane.
3. Check entitlement, policy, and required approval.
4. Bind only the permitted payload.
5. Execute through the authorized provider adapter.
6. Return the result with evidence and attestation.
7. Verify the supplied result locally and record limitations.
8. Use verified evidence as an input to a later Spacetime decision.

The control-plane authority for execution and approval belongs to DSG Spacetime. The DSG OS browser can show the plan and verify evidence locally; it does not grant permission. The plugin itself performs none of these runtime steps.
