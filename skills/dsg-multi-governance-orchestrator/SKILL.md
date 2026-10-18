---
name: dsg-multi-governance-orchestrator
version: 1.0.1
author: DSG Team
license: MIT
description: >
  Plan cross-system governance work and review evidence using explicit
  requirements. This guidance skill does not call APIs, deploy services, or
  assert production readiness.
---

# Multi-governance orchestrator: planning and evidence review

Use this skill to organize governance requirements across systems and milestones. It produces a plan, checklist, and evidence-based status report. It does not query a control plane, database, billing service, provider, or deployment platform unless a separately configured connector is available and authorized in the current session.

## Method

1. Define the goal, target systems, scope, risk, and acceptance criteria.
2. Map each requirement to an owner, source of evidence, and verifier.
3. Discover data only through explicitly configured connectors.
4. Record the actual output and provenance for every check.
5. Mark each requirement PASS, FAIL, or UNVERIFIED; include the evidence reference.
6. Produce GO only when every required criterion has current, adequate evidence and all approvals are recorded.
7. Keep proposals, source code, test results, deployments, and live provider execution as separate evidence classes.

## DSG OS / Spacetime boundary

- DSG OS is the user-facing browser/workspace, Adapter Builder, and local verification surface.
- DSG Spacetime is the execution and governance control plane.
- Spacetime owns plan/route, entitlement, policy, approval, payload binding, and the deterministic execution gate.
- The browser verifier reports integrity checks; it does not grant permission or establish provider-side execution.

See docs/architecture/dsg-os-spacetime-boundary.md for the architecture contract.

## Truth rules

- Do not invent endpoints, credentials, pricing, quotas, database records, approval results, or execution evidence.
- Do not label a source tree, checklist, or passing unit test as a deployed service.
- If current evidence is unavailable, say what is missing and use UNVERIFIED.
- Separate owner-reported status from independently observed runtime evidence.

Use references/architecture-template.md to record system boundaries and references/m1-m2-checklist.md to assess milestones.
