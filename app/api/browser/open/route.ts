import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { evaluateAction } from '@/lib/dsg/evaluate-action';
import { handleApiError } from '@/lib/security/api-error';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';

export const dynamic = 'force-dynamic';

interface BrowserOpenRequest {
  url: string;
  agentId: string;
  sessionId: string;
  /** Optional task description for audit */
  task?: string;
  /** keepAlive — Browserbase session TTL, default false */
  keepAlive?: boolean;
}

export async function OPTIONS(request: Request) {
  return buildPreflightResponse(request);
}

/**
 * POST /api/browser/open
 *
 * Creates a Browserbase browser session gated through DSG safety inspection.
 * DSG evaluates the open-URL action before the session is created.
 * Safe URLs: PASS -> session created.
 * Risky URLs (data-exfil patterns, blocked domains): BLOCK -> 409.
 *
 * Hermes is the caller. DSG is the inspector. Hermes capability is not reduced
 * except for genuinely dangerous actions.
 */
export async function POST(request: NextRequest) {
  const auth = await requireOrgPermission('org.execute');
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: (auth as { error: string }).error }, { status: 401 });
  }

  try {
    const body = (await request.json()) as BrowserOpenRequest;

    if (!body.url || !body.agentId || !body.sessionId) {
      return NextResponse.json(
        { ok: false, error: 'url, agentId, and sessionId are required' },
        { status: 400 },
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.url);
    } catch {
      return NextResponse.json({ ok: false, error: 'invalid_url' }, { status: 400 });
    }

    const gateResult = evaluateAction({
      workspaceId: auth.orgId,
      agentId: body.agentId,
      sessionId: body.sessionId,
      action: 'browser.open',
      actionType: 'read',
      targetSystemId: parsedUrl.hostname,
      riskLevel: classifyUrlRisk(parsedUrl),
      actorId: auth.userId,
      actorRole: (auth.role as 'operator') ?? 'operator',
      payload: { url: body.url, task: body.task },
    });

    if (!gateResult.canExecute) {
      return NextResponse.json(
        {
          ok: false,
          gated: true,
          decision: gateResult.decision,
          reasons: gateResult.reasons,
          decisionHash: gateResult.decisionHash,
          boundary: 'DSG blocked this browser session before creation.',
        },
        { status: 409 },
      );
    }

    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;

    if (!apiKey || !projectId) {
      return NextResponse.json(
        {
          ok: true,
          gated: false,
          decision: gateResult.decision,
          decisionHash: gateResult.decisionHash,
          session: null,
          note: 'Browserbase not configured — gate passed, no session created. Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID.',
        },
        { headers: buildCorsHeaders(request) },
      );
    }

    const bbResponse = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'x-bb-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        keepAlive: body.keepAlive ?? false,
        metadata: {
          org_id: auth.orgId,
          agent_id: body.agentId,
          session_id: body.sessionId,
          dsg_decision_hash: gateResult.decisionHash,
          url: body.url,
          task: body.task ?? null,
        },
      }),
    });

    const bbBody = await bbResponse.json().catch(() => ({}));

    if (!bbResponse.ok) {
      return NextResponse.json(
        { ok: false, error: 'browserbase_session_failed', detail: bbBody },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        gated: false,
        decision: gateResult.decision,
        decisionHash: gateResult.decisionHash,
        actionEnvelope: gateResult.actionEnvelope,
        session: {
          id: bbBody.id,
          connectUrl: bbBody.connectUrl ?? null,
          liveViewUrl: bbBody.liveViewUrl ?? null,
        },
        boundary: gateResult.truthBoundary,
      },
      { headers: buildCorsHeaders(request) },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

function classifyUrlRisk(url: URL): 'low' | 'medium' | 'high' | 'critical' {
  const host = url.hostname.toLowerCase();

  const internalPatterns = [/localhost/, /127\.0\.0\.1/, /10\.\d+\.\d+\.\d+/, /192\.168\.\d+\.\d+/, /\.internal$/, /\.local$/];
  if (internalPatterns.some((p) => p.test(host))) return 'high';

  const sensitivePatterns = [/supabase\.co/, /vercel\.com/, /\.anthropic\.com/, /stripe\.com/, /github\.com.*settings/];
  if (sensitivePatterns.some((p) => p.test(host + url.pathname))) return 'medium';

  return 'low';
}
