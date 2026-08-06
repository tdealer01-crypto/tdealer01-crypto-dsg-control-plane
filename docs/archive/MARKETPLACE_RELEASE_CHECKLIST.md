# Marketplace Release Checklist — CospinDSG Agent Shield

## Product package

Recommended product name:

```text
CospinDSG Agent Shield
```

Recommended short description:

```text
Runtime governance gateway for AI agents: audit-only or enforce-gate mode before actions execute.
```

Recommended category:

```text
AI governance / Security / DevOps / Risk Management
```

## Listing claim boundary

Do not claim any of the following until evidence exists:

- production-ready runtime
- third-party certification
- ISO/NIST certification
- complete enterprise proof system
- guaranteed prevention of all unsafe AI actions

Safe claim:

```text
CospinDSG places a governance gate in front of existing AI agents so teams can audit or enforce high-risk actions before execution.
```

## Required proof before Marketplace submission

- Cloud Run service reaches Ready state.
- `/product` loads from Cloud Run URL.
- `/dashboard/policies` loads the redesigned policy workflow.
- `/api/policies` returns at least one runtime or legacy policy.
- `/api/public-chat/runtime` returns configured AI provider.
- `/api/public-chat` returns real provider mode, not fallback.
- Auto-Setup completes without runtime spine warnings.
- Supabase migrations are applied and schema cache reloaded.
- Smoke evidence is stored in docs or qa-logs.

## PR release trigger evidence

This checklist is intentionally touched by the policy workflow release PR so Vercel can build a fresh PR/merge deployment containing the runtime policy API, redesigned `/dashboard/policies`, and Cloud Run readiness files.

## Required Marketplace assets

- Product overview
- Pricing/package plan
- Screenshots
- Support contact
- Documentation URL
- Privacy policy URL
- Terms URL
- Signup/request-access path
- Operational support process

## Suggested packages

### Pilot

One agent, one protected action, Audit Only mode.

### Team

Multiple protected actions, Audit Only plus optional Enforce Gate.

### Enterprise

Dedicated onboarding, evidence export, runtime governance review, and marketplace procurement path.

## Buyer workflow

1. Buyer opens Marketplace listing.
2. Buyer requests access or purchases plan.
3. Buyer gets onboarding URL.
4. Buyer connects existing agent.
5. Buyer selects Audit Only or Enforce Gate.
6. Buyer reviews evidence and monitor output.
7. Buyer expands rollout after smoke evidence passes.

## No-go conditions

Do not submit if any of these are true:

- Cloud Run deploy fails.
- AI provider env is missing or model env contains an API key.
- Public chat only returns fallback mode.
- Runtime setup requires manual DB repair during buyer flow.
- Policy workflow shows no policies after Auto-Setup/runtime seed.
- Secrets are committed to GitHub.
- Pricing/support/legal pages are missing.
