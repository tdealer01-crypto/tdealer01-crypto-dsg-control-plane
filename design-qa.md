# Design QA — DSG ONE Command Center

final result: passed

## Visual comparison

- Reference: `/workspace/scratch/980e2e78a7a8/upload/01-file_00000000b6dc820ba080b1155dba372d.png`
- Implementation viewport: `artifacts/design-qa/command-center-viewport.png`
- Side-by-side comparison: `artifacts/design-qa/command-center-comparison.png`
- Full-page implementation: `artifacts/design-qa/command-center-final.png`
- Viewport and device scale: `1536 × 1093`, DPR `1`

The reference and implementation were compared together at the same viewport and loaded state. The implementation retains the reference's black cockpit, thin cool-gray borders, gold conversion accents, red blocker states, compact journey, evidence brief, and right-hand paid offer. The typed browser-agent strip is an intentional product addition requested for this build; it shifts the lower evidence section without changing the source hierarchy.

### Severity review

- P0: none
- P1: none
- P2: none after reducing the hero title to one line, compacting Current Truth, aligning the frame width, and reducing the agent input height

## Interaction verification

Playwright production-browser QA: 8/8 passed.

1. Command Center route returned HTTP 200.
2. Buyer cockpit and Current Truth rendered.
3. Empty command remained disabled.
4. A typed goal enabled `Run governed plan`.
5. An unsigned operator received the explicit sign-in boundary.
6. Technical evidence linked to `/evidence-pack`.
7. Current Truth refreshed without a page exception.
8. Stripe checkout failed closed locally because production distributed rate limiting is not configured.

## Runtime and console review

- Uncaught page exceptions: 0
- Vercel telemetry CSP failures: 0
- Handled API status messages: expected `401` for unsigned workspace resources, `503` for unconfigured readiness dependencies, `502` when the GitHub upstream was unavailable in the sandbox, and `429` for the production fail-closed rate-limit boundary.
- Browser request aborts: two canceled Next.js RSC navigation requests; neither produced a page exception or changed the tested state.
- Machine-readable report: `artifacts/design-qa/command-center-qa.json`

## Truth boundary

- No revenue, ROI, replay, time-saved, latency, or cost metric is inferred.
- GitHub state is shown only when the public workflow source responds; otherwise the UI says it is unavailable.
- The browser agent can plan and use the existing open/read boundary. Live click, type, and submit execution remains explicitly disabled until a verified mutation executor exists.
- Payment, destructive, high-risk, unsupported, and out-of-scope changes remain approval- or capability-gated.

## Build verification

- TypeScript: passed
- ESLint: passed
- Targeted command-center and GitHub status tests: passed
- Next.js production build: passed; 195 static pages generated
- Existing Turbopack NFT tracing warning remains in the unrelated Hermes execution import path.
