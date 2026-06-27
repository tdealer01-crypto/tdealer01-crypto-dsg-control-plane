# Production checkpoint — 2026-05-20

## Verdict

Production deploy and runtime readiness are currently green.

## Deployment evidence

- Production URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app`
- Vercel deployment: `dpl_JDnMy6savmpHyYi8chJohcwicbiK`
- Deployment state: `READY`
- Production merge commit: `29ae61224e26f725d3205bd90912aa961338202f`
- Commit verification: `verified`
- Production alias attached: `tdealer01-crypto-dsg-control-plane.vercel.app`

## Runtime readiness evidence

`GET /api/readiness` returned HTTP `200` with `ok: true`.

Sub-checks observed green:

- `env`
- `nextAuthSecret`
- `supabaseServiceRole`
- `dsgCoreConfig`
- `dsgCoreHealth`
- `financeGovernanceSurface`
- `financeGovernanceBackend`

## Gate fixes included before production announcement

- `fix(e2e): keep staging specs out of default Docker pipeline`
- `fix(readiness): avoid false failures on skipped management checks and health rate limits`
- PR `#561`: `chore: trigger production deployment after gate fixes`

## Boundary

Allowed claim:

```text
DSG ONE ProofGate Control Plane is live on Vercel production with runtime readiness,
Supabase service-role configuration, DSG core health, and finance-governance readiness
verified through /api/readiness on 2026-05-20.
```

Disallowed claim:

```text
Certified, third-party audited, WORM-certified, externally Z3 production verified,
or end-to-end formally verified SaaS.
```
