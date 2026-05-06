# DSG ONE Enterprise Ready Autopilot

This runbook defines the user-first enterprise setup flow added in `feature/enterprise-ready-ux`.

## Goal

Make DSG ONE easier for a customer to try with the systems they already use.

The first customer outcome is not a full migration. The first outcome is:

```text
one existing system -> one governed action -> one evidence trail -> one expansion decision
```

## Product layer imported from zip

```text
/proofgate
```

The uploaded `dsg-proofgate-product-ready-fullstack.zip` was reviewed and converted into a native Next.js product page for this repo. The page communicates the ProofGate offer without copying the FastAPI/Vite stack into this Next app:

- policy-gated AI and automation execution
- approval routing for high-risk actions
- tamper-evident audit and proof hashes
- evidence export
- deployment go/no-go gate
- truth boundary against false certification or compliance claims

## Brand direction

The branch applies a unified red / gold / blue-sapphire visual system across the app shell:

- red = blocked risk, urgent control, exception pressure
- gold = proof, evidence, buyer trust, primary CTA
- blue sapphire = enterprise infrastructure, runtime gateway, technical confidence
- black = command center background

The shared layer lives in:

```text
app/dsg-brand.css
app/layout.tsx
components/GlobalNav.tsx
```

## New product surface

```text
/enterprise-ready
```

This page explains the enterprise setup flow for API, webhook, no-code automation, workflow engines, release gates, and legacy batch paths.

## Updated integration surface

```text
/dashboard/integrations
```

This page now gives the operator a self-service quickstart:

1. Register integration
2. Attach callback/webhook
3. Execute one governed action
4. Review proof and evidence requirements

## User-first design rules

- Do not force migration before first proof.
- Start with the customer system already in use.
- Show copy-paste commands before asking for broad rollout.
- Make missing proof visible as next action.
- Keep false production, certification, or compliance claims blocked by the truth boundary.
- Save Vercel quota: test locally and deploy once after review.

## Connector positioning

DSG should meet customers through:

- REST API
- Webhook
- Zapier / Make
- n8n / Workato
- GitHub / Vercel
- CSV / SFTP

## Enterprise-readiness boundary

`Enterprise Ready` in this branch means setup-ready, governance-ready, and evidence-ready for a controlled pilot.

It does not mean independent certification, third-party audit, or completed production go-live.

## Verification before merge

Run locally before merging to avoid unnecessary Vercel deployments:

```bash
npm install --ignore-scripts
npm run typecheck
npm run ux:routes
npm run verify:deterministic
npm run build
```

If the branch passes locally, open one PR and let Vercel run once for the final preview.
