# proofgate-review — evidence-bound code review

Claude Code plugin for reviewing **repository changes** against DSG ONE / ProofGate conventions. It offers a `governance-review` skill and a `security-reviewer` subagent. Reviews are advisory: they do not replace test results, approvals, compliance audits, or production verification.

## Install

```bash
claude plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
claude plugin install proofgate-review@dsg-plugins
claude plugin list
```

Use it inside a checkout of the DSG governance repository so the reviewer can inspect the real changed files and local rules.

## Start here

In Claude Code:

```text
/proofgate-review:governance-review
```

Provide a concrete diff, changed paths, or PR number to review. For example:

```text
Review the changes in app/api/ for request-body safety, route authentication,
deterministic UNSUPPORTED handling, and evidence-backed readiness claims.
Report findings with file:line references; do not infer uninspected code.
```

For a focused security review, request the included `security-reviewer` subagent. Its instructions are in [agents/security-reviewer.md](./agents/security-reviewer.md); skill rules are in [skills/governance-review/SKILL.md](./skills/governance-review/SKILL.md).

## What the review checks

- Claims of readiness or compliance have attributable evidence; mock or historical evidence cannot be promoted to a live PASS.
- Route authentication, request size checks, CORS, and credential handling follow repository rules.
- Deterministic gate outcomes preserve `UNSUPPORTED != PASS`.
- Supabase/RLS changes distinguish source migrations from an applied live schema.
- Each finding includes the affected file and line, a severity, and an actionable fix.

## Verification and limitations

Run `claude plugin validate ./plugins/proofgate-review` from the repository root. After installing, use a **real diff** and verify that the reviewer cites exact lines. The validator and smoke-test commands here are instructions; this README is **not evidence** of a successful install or a completed review.

A code review cannot establish that `npm run typecheck`, `npm run test`, `npm run build`, a live provider action, or a third-party certification passed. State **NOT RUN** or **NOT VERIFIED** where appropriate.

## Output expectations

Report `BLOCKER`, `WARNING`, or `NOTE` with concrete file/line evidence and recommended next actions. Finish with the checks actually executed, their results, and any remaining work.
