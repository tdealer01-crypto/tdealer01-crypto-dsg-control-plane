import { NextResponse } from 'next/server';
import { buildContextGraph } from '../../../../../lib/dsg/context-graph/builder';
import type { BuildContextGraphInput } from '../../../../../lib/dsg/context-graph/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Partial<BuildContextGraphInput> | null;

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'missing_body' }, { status: 400 });
  }

  if (typeof body.goal !== 'string' || !body.goal.trim()) {
    return NextResponse.json({ ok: false, error: 'missing_goal' }, { status: 400 });
  }

  try {
    const result = buildContextGraph({
      mode: body.mode,
      goal: body.goal,
      workspaceId: body.workspaceId,
      actorId: body.actorId,
      facts: Array.isArray(body.facts) ? body.facts : undefined,
      edges: Array.isArray(body.edges) ? body.edges : undefined,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'context_graph_build_failed',
        boundary: {
          productionProof: false,
          externalZ3Invoked: false,
          wormStorageClaim: false,
          thirdPartyAuditClaim: false,
        },
      },
      { status: 400 },
    );
  }
}
