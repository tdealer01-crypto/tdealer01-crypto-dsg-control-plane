import { NextResponse } from 'next/server';
import { requireActiveProfile } from '../../../../lib/auth/require-active-profile';
import { ensureStarterAgent, StarterAgentError } from '../../../../lib/quickstart/starter-agent';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';

const QUICKSTART_INTEGRATION_PACK_RATE_LIMIT = 10;
const QUICKSTART_INTEGRATION_PACK_WINDOW_MS = 60 * 1000;

function buildExecuteCurl(baseUrl: string, agentId: string, apiKey: string) {
  return `curl -sS -X POST "${baseUrl}/api/execute" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "agent_id": "${agentId}",
    "action": "approve-invoice",
    "input": { "invoice_id": "INV-001", "amount": 50000 },
    "context": { "risk_score": 0.30, "source": "erp" }
  }'`;
}

function buildNodeSnippet(baseUrl: string, agentId: string, apiKey: string) {
  return `export async function executeWithDSG(input, context = {}) {
  const response = await fetch("${baseUrl}/api/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer ${apiKey}",
    },
    body: JSON.stringify({
      agent_id: "${agentId}",
      action: "approve-invoice",
      input,
      context,
    }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result?.error || "DSG execution failed");

  if (result.decision === "BLOCK") {
    throw new Error(\`Blocked by DSG policy: \${result.reason}\`);
  }

  return result;
}`;
}

export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'quickstart-integration-pack'),
    limit: QUICKSTART_INTEGRATION_PACK_RATE_LIMIT,
    windowMs: QUICKSTART_INTEGRATION_PACK_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, QUICKSTART_INTEGRATION_PACK_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers });
    }

    const starterAgent = await ensureStarterAgent(access.orgId);
    const baseUrl = new URL(request.url).origin;

    return NextResponse.json({
      mode: 'server-to-server',
      auto_provisioned: true,
      org_id: access.orgId,
      agent: starterAgent,
      env: {
        DSG_BASE_URL: baseUrl,
        DSG_AGENT_ID: starterAgent.agent_id,
        DSG_API_KEY: starterAgent.api_key,
      },
      smoke_test: {
        health_check: `curl -sS "${baseUrl}/api/health"`,
        execute: buildExecuteCurl(baseUrl, starterAgent.agent_id, starterAgent.api_key),
      },
      sdk: {
        language: 'typescript',
        function_name: 'executeWithDSG',
        snippet: buildNodeSnippet(baseUrl, starterAgent.agent_id, starterAgent.api_key),
      },
      next_step: 'Store DSG_API_KEY in backend secrets, call /api/execute before side effects, and trigger /api/effect-callback after completion.',
    }, { headers });
  } catch (error) {
    if (error instanceof StarterAgentError) {
      if (error.code === 'starter-agent-disabled' || error.code === 'policy-missing') {
        return NextResponse.json({ error: error.message }, { status: 400, headers });
      }
    }

    logApiError('api/quickstart/integration-pack', error, { stage: 'unhandled' });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500, headers });
  }
}
