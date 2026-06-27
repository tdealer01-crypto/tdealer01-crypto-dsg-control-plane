# AI Workflow Inventory Template

Purpose: create a practical inventory of AI workflows, agents, tools, and actions that may require governance controls before execution.

Boundary: this inventory is a readiness artifact. It does not certify workflow safety by itself.

## Inventory table

| ID | Workflow / Agent | Owner | System touched | Tool/API | Action | Data sensitivity | Execution mode | Current approval | Current audit evidence | DSG fit |
|---|---|---|---|---|---|---|---|---|---|---|
| WF-001 |  |  |  |  |  | Public / Internal / Confidential / Regulated | Manual / Automated / Agentic | None / Manual / System | None / Logs / Export | Gateway / Monitor / Deploy Gate |

## Action types to capture

- Read-only data access
- Customer data update
- External communication
- Financial action
- Admin action
- CI/CD deployment
- Internal API call
- Third-party SaaS action
- Document or file mutation

## Minimum fields for DSG readiness

1. Organization scope
2. Actor or agent identity
3. Tool name
4. Action name
5. Risk level
6. Approval requirement
7. Execution owner
8. Evidence requirement
9. Current logs
10. Target DSG mode

## DSG mode selection

| Need | Suggested mode |
|---|---|
| DSG may execute the configured endpoint after checks | Gateway Mode |
| Customer must keep API keys and execute in its own runtime | Monitor Mode |
| Deployment must be gated before production | GitHub Secure Deploy Gate Action |
| Workflow needs only audit export initially | Monitor Mode pilot |

## Output

The completed inventory should identify:

- highest-risk workflows
- missing approvals
- missing audit evidence
- candidate pilot workflow
- likely DSG deployment mode
