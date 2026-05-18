# DSG UI/UX Working Rules

Purpose: every DSG page, API demo, compliance artifact, and marketplace-facing surface must produce a real user outcome.

## Non-negotiable rule

Do not ship UI that only looks complete. Every user-facing surface must make the next useful action obvious and executable.

## Required checks before merge

1. Every page has a clear primary action.
2. Every button/link points to an existing route, external URL, or working API endpoint.
3. Any read-only page explicitly says it is read-only and gives the next action.
4. No placeholder links are allowed.
5. No dead `/docs` or unfinished route links are allowed.
6. Every compliance/evidence/control page must answer:
   - what this is for
   - what the user should click
   - what result the user gets
   - how the result helps audit, consult, buyer review, deployment, or governance
7. Every PR must include a user outcome statement, not only a code/files statement.
8. If a workflow needs API use, provide a working copy-paste curl example.
9. If a workflow has a UI route, include a visible button to that route.
10. If a feature is planned but not implemented, label it as Planned and do not present it as usable.

## Flow completion rule

A flow is not complete until the team can answer all 4 questions below:

```text
1. What benefit does the user get?
2. Where does the user click, or what command/API does the user run?
3. What evidence proves the flow worked?
4. Where is the tangible output: page, JSON, bundle, report, queue item, hash, status, or run result?
```

If any answer is missing, the flow must be tested from the user's point of view and fixed before it is treated as done.

## User-outcome test

Before merging any UI, answer these questions:

```text
Can the user click something useful?
Does the click work?
Does the user understand what happened?
Does the user get evidence, JSON, report, queue, status, or a next step?
Could this be used in a sales, audit, consult, or deployment conversation today?
```

If the answer is no, the page is not done.

## Safe claim rule

Use:

- supports
- aligned workflow
- evidence-ready
- compliance-enabling
- governance control layer

Do not use unless independently verified:

- certified
- guaranteed compliance
- third-party audited
- NIST certified
- ISO certified

## DSG-specific UX routes

Preferred working routes:

```text
/ai-compliance
/iso-42001
/nist-ai-rmf
/evidence-pack
/controls
/approvals?orgId=org-smoke
/gateway/monitor?orgId=org-smoke
/marketplace
/marketplace/production-evidence
/api/gateway/controls/templates
/api/gateway/evidence/bundle?orgId=org-smoke
/api/gateway/approvals?orgId=org-smoke
```

## Definition of done

A DSG UI change is done only when it has:

1. working route
2. working links/buttons
3. clear copy
4. evidence or result output
5. boundary statement
6. no dead links
7. user can use it without asking what to do next
8. a completed flow outcome statement covering benefit, action, evidence, and tangible output
