/**
 * GET /llms.txt
 *
 * Machine-readable curated index of every doc page and API surface.
 * Safe to load into an LLM context window (~17 KB).
 * Also resolves at /docs/llms.txt via next.config.js redirect.
 *
 * Format follows llmstxt.org convention.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

const CONTENT = `# DSG ONE — AI Runtime Control Plane / ProofGate

> AI-native runtime governance platform. Every agent action is gated, evidence-collected, and auditable before execution. Built for enterprise AI compliance, deterministic proof scaffolds, and multi-agent governance.

## Overview

- [Home](${BASE}/): Landing page — platform value proposition and onboarding entry.
- [Dashboard](${BASE}/dashboard): Operator command centre — overview, agents, executions, approvals, finance, audit, billing.
- [Hermes Agent](${BASE}/dashboard/hermes): AI chat interface with 25+ governed tools for operating the control plane in natural language.
- [Hermes Skills Hub](${BASE}/dashboard/hermes/skills): Discover, search, and install skills from 89,000+ registry entries across 12 registries.
- [Developer Docs](${BASE}/docs): Deterministic gate API flow, endpoint purpose, evidence boundary, and integration guide.
- [Evidence Pack](${BASE}/evidence-pack): Compliance evidence pack for audit preparation.
- [Delivery Proof](${BASE}/delivery-proof): Production scan and delivery proof report generator.
- [Enterprise Proof](${BASE}/enterprise-proof/demo): Live gate evidence and enterprise attestation viewer.
- [Compliance](${BASE}/compliance): AI compliance posture and CCVS status.
- [EU AI Act](${BASE}/eu-ai-act): EU AI Act mapping and readiness status.
- [NIST AI RMF](${BASE}/controls): NIST AI RMF control mapping.

## Core API — Governed Execution

- [POST /api/execute](${BASE}/docs#execute): Stable governed execution entry point. Accepts agent_id + action payload. Routes through spine pipeline with full audit.
- [POST /api/spine/execute](${BASE}/docs#spine): Runtime-native execution path for deeper integrations.
- [POST /api/intent](${BASE}/docs#intent): Issue or reuse a pending runtime intent before execution.
- [GET /api/health](${BASE}/api/health): Public availability probe. Returns \`{"ok":true}\` on healthy deployment.
- [GET /api/readiness](${BASE}/api/readiness): Deployment readiness check — DB connectivity, env config, runtime status.
- [GET /api/agent/status](${BASE}/api/agent/status): Lightweight unauthenticated identity check. Returns repo commit, environment, and DB check.

## DSG Deterministic Gate API

- [GET /api/dsg/v1/policies/manifest](${BASE}/docs#policies): Fetch deterministic policy manifest and constraint set metadata.
- [POST /api/dsg/v1/gates/evaluate](${BASE}/docs#gate): Run gate evaluation for an action request. Returns structured constraint outcomes (ALLOW/BLOCK/REVIEW/UNSUPPORTED). External Z3 solver is NOT invoked by this route.
- [POST /api/dsg/v1/proofs/prove](${BASE}/docs#prove): Generate deterministic proof scaffold output. Returns proof hash, input hash, policy version.

## Hermes Full Option Runtime API (SSE)

- [POST /api/dsg/hermes/execute](${BASE}/docs#hermes-execute): Main Hermes execution endpoint. Accepts \`{message}\`. Returns SSE stream with plan steps, tool results, and synthesised reply.
- [GET /api/dsg/hermes/status](${BASE}/docs#hermes-status): Hermes runtime status — workers, memory layers, adaptive execution config, DSG gate decision model.
- [POST /api/dsg/hermes/plan](${BASE}/docs#hermes-plan): Generate a Hermes plan from a goal description.
- [POST /api/dsg/hermes/action](${BASE}/docs#hermes-action): Evaluate a single action against the plan alignment gate.
- [POST /api/dsg/hermes/evidence](${BASE}/docs#hermes-evidence): Collect and report evidence for a plan execution.
- [GET /api/dsg/hermes/skills](${BASE}/docs#hermes-skills): Skills registry index — built-in and community skills catalog.

## DSG Brain Controlled Execution API

- [POST /api/dsg/brain/execute](${BASE}/docs#brain-execute): DSG Brain controlled executor. Accepts plan + credential context. Validates conformance gate before executing.

## Operator API (Authenticated)

- [GET /api/usage](${BASE}/docs#usage): Quota usage for the authenticated org — current period, remaining, overage.
- [GET /api/executions](${BASE}/docs#executions): Execution history for the authenticated org with pagination.
- [GET /api/audit](${BASE}/docs#audit): Audit event log for the authenticated org.
- [GET /api/policies](${BASE}/docs#policies-list): Policy list for the authenticated org.
- [POST /api/policies](${BASE}/docs#policies-create): Create or update a policy.
- [GET /api/capacity](${BASE}/docs#capacity): Remaining quota and capacity for the authenticated org.
- [POST /api/agent-chat](${BASE}/docs#agent-chat): Operator agent chat endpoint — routes to Hermes or other configured LLM.

## Delivery Proof

- [POST /api/delivery-proof/scan](${BASE}/docs#delivery-proof-scan): Accepts a production URL, optional repo URL, and readiness path. Checks homepage, readiness, health, protected-route auth rejection. Returns shareable report ID.

## Authentication

- [GET/POST /auth/*](${BASE}/auth): Supabase SSR authentication — sign-in, sign-up, callback, sign-out. Session cookie managed by middleware.ts.

## MCP Integration

- [POST /api/mcp/call](${BASE}/docs#mcp): MCP tool call endpoint. Routes to agent-chat or governed execution based on tool_name.

## Key Documentation

- [Runbook: Deploy](${BASE}/docs): Production deployment runbook — env vars, migration steps, smoke checks, go/no-go gate.
- [Runbook: Rollback](${BASE}/docs): Rollback procedure and incident response.
- [REPO_TRUTH](${BASE}/docs): Repository truth file — canonical source order and deployment state.
- [NIST AI RMF Mapping](${BASE}/controls): Control mapping to NIST AI Risk Management Framework.
- [CCVS Evidence Chain](${BASE}/compliance): Compliance and Coverage Verification System — L1–L5 evidence levels.
- [DSG Deterministic Gate](${BASE}/docs): Deterministic TypeScript proof scaffold — constraint sets, proof hash, UNSUPPORTED → REVIEW/BLOCK mapping.
- [DSG Brain / Hermes](${BASE}/dashboard/hermes): Hermes controlled executor — plan snapshots, credential leases, conformance gate, evidence receipts.
- [Android DSG Agent](${BASE}/docs): Android agent APK — local memory, skills, scheduler, Telegram gateway, local API on port 8642.

## Product Surfaces

- [Dashboard: Overview](${BASE}/dashboard): System health, execution count, agent count, evidence status.
- [Dashboard: Agents](${BASE}/dashboard/agents): Agent list — create, configure, rotate keys, enable/disable.
- [Dashboard: Executions](${BASE}/dashboard/executions): Execution history with proof links.
- [Dashboard: Approvals](${BASE}/dashboard/approvals): Human-in-the-loop approval queue.
- [Dashboard: Audit](${BASE}/dashboard/audit): Audit event log with filters.
- [Dashboard: Billing](${BASE}/dashboard/billing): Billing and quota management.
- [Dashboard: Finance Governance](${BASE}/finance-governance/live/workspace): Finance-specific governed approval gate.
- [Dashboard: Integration](${BASE}/dashboard/integration): Integration status and external connector management.
- [Dashboard: Ledger](${BASE}/dashboard/ledger): Immutable execution ledger.
- [Dashboard: Capacity](${BASE}/dashboard/capacity): Quota and capacity planner.

## Security and Compliance Features

- Evidence-first: every claim requires verified evidence (file, command output, live endpoint response, DB query).
- DSG gate decisions: ALLOW (execute + audit), BLOCK (stop), REVIEW (human required), UNSUPPORTED (never PASS → REVIEW or BLOCK).
- Runtime spine: intent → quota → pipeline → commit RPC → audit trail.
- Hermes Brain: plan lock → credential broker → controlled execution → conformance gate → evidence receipt.
- CCVS: L1 unit → L2 integration → L3 adversarial → L4 mutation/proof → L5 provenance/build.
- Claim boundary: production-connected, evidence-ready, audit-ready, governance-enabling, deterministic gate scaffold.

## Integration Quickstart

1. Create an agent via POST /api/execute or the dashboard Agents page.
2. Obtain the API key from the create response.
3. POST to /api/execute with Bearer token, agent_id, action, and payload.
4. Read the decision (ALLOW/BLOCK/REVIEW), proof hash, and trace from the response.
5. For LLM-style natural language operation, POST to /api/dsg/hermes/execute with \`{message}\`.
6. For deterministic gate checks without execution, use POST /api/dsg/v1/gates/evaluate.

## Environment Variables (names only — never values)

- \`NEXT_PUBLIC_SUPABASE_URL\` — Supabase project URL (public)
- \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` — Supabase anonymous key (public)
- \`SUPABASE_SERVICE_ROLE_KEY\` — Supabase service-role key (server only, secret)
- \`ANTHROPIC_API_KEY\` — Anthropic Claude API key (server only, secret)
- \`STRIPE_SECRET_KEY\` — Stripe secret key (server only, secret)
- \`STRIPE_WEBHOOK_SECRET\` — Stripe webhook signing secret (server only, secret)
- \`CRON_SECRET\` — Cron route authentication secret (server only, secret)
- \`DSG_CONTROL_PLANE_BASE_URL\` — This deployment base URL
- \`APP_URL\` — Canonical application URL for CORS and response origin

## Machine-Readable Entry Points

- [/llms.txt](${BASE}/llms.txt): This file — curated index (~17 KB, safe for LLM context).
- [/llms-full.txt](${BASE}/llms-full.txt): Full documentation concatenated (~1.8 MB, one-shot ingestion).
- [/docs/llms.txt](${BASE}/docs/llms.txt): Alias for /llms.txt.
- [/docs/llms-full.txt](${BASE}/docs/llms-full.txt): Alias for /llms-full.txt.

Generated fresh on every deploy.
`;

export async function GET() {
  return new NextResponse(CONTENT, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
