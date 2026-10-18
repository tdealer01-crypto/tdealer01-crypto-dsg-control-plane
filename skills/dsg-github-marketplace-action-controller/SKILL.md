---
name: dsg-github-marketplace-action-controller
version: 1.0.1
author: DSG Team
license: MIT
description: >
  Plan and review GitHub Marketplace Action packaging for governance workflows.
  Guidance and templates only; this skill does not provide a hosted gate or
  execute an action.
---

# GitHub Marketplace Action controller: packaging guidance

Use this skill to draft or review a GitHub Action package. It does not connect to a DSG service, gate a deployment, issue approval, or prove that a workflow ran.

## Before drafting

- Confirm the user wants an Action package or workflow change.
- Identify the exact repository, event, job, target environment, permissions, and expected outputs.
- Separate local/static checks from provider-side execution.
- Require a real, user-authorized gate integration before describing a workflow as governed.
- Mark unavailable services or evidence UNVERIFIED.

## Packaging review

1. Check action.yml syntax, supported inputs and outputs, runtime, entrypoint, and distribution files.
2. Use least-privilege workflow permissions.
3. Keep secrets out of source, logs, outputs, generated examples, and pull-request artifacts.
4. Pin third-party actions according to the repository's policy.
5. Test the package locally or in CI and report the exact commit and completed checks.
6. Describe a policy gate as active only when a real configured service returns a verifiable decision.

Never add a guessed service URL or credential field, invented quota behavior, or unsupported deployment requirement. A placeholder is not a live integration.

## Decision states

| State | Meaning |
|---|---|
| GO | The package checks ran and the specified release criteria passed. |
| NO-GO | A verified packaging, permission, or policy issue blocks release. |
| UNVERIFIED | Required CI, service, approval, or runtime evidence is missing. |

See references/action-yml-spec.md and references/go-no-go-logic.md for review checklists.
