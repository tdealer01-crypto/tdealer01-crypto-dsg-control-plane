# DSG Multi Governance Orchestrator Skill

Reusable DSG skill for the SaaS control-plane repo. It merges the 5 uploaded sources plus the deterministic/marketplace patch into one operating standard for architecture pages, launch readiness, M1/M2 production cutover, action-layer permission gates, audit evidence, and deterministic execution.

## Use cases

- Add `/dsg-architecture` without replacing the existing finance/promo landing page.
- Convert architecture concepts into copy/paste Next.js route code.
- Run GO/NO-GO launch checks before public or marketplace release.
- Plan deterministic multi-agent execution and merge work safely.
- Keep production work focused on M1 Production Cutover and M2 Hardening + Launch.

## Quick helper

```bash
bash .agents/skills/dsg-multi-governance-orchestrator/scripts/apply-architecture-page.sh .
```

The helper supports:

- portable SaaS layout: `app/dsg-architecture/page.tsx`
- DSG ONE dashboard layout: `frontend/app/dashboard/architecture/page.tsx`
