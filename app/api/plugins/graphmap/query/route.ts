import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getBearerToken } from '@/lib/dsg/server/supabase-rpc';
import { loadLatestGraph } from '@/lib/plugins/graphmap/storage';
import { queryGraph } from '@/lib/plugins/graphmap/querier';

export async function POST(req: NextRequest) {
  const actor = await requireVerifiedDsgActor(req.headers, 'skill:read');
  const userAccessToken = getBearerToken(req.headers) ?? '';

  let question = '';
  let maxDepth = 2;
  try {
    const body = await req.json();
    question = typeof body.question === 'string' ? body.question : '';
    if (typeof body.max_depth === 'number') maxDepth = Math.min(body.max_depth, 4);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!question.trim()) {
    return NextResponse.json({ ok: false, error: 'question is required' }, { status: 400 });
  }

  try {
    const latest = await loadLatestGraph(userAccessToken, actor.workspaceId);
    if (!latest) {
      return NextResponse.json({
        ok: true,
        decision: 'BLOCK',
        answer: 'No graph found for this workspace. Run POST /api/plugins/graphmap/build first.',
        evidence: [],
        blockedClaims: ['No graph available'],
      });
    }

    const result = queryGraph(latest.row.graph_data, question, maxDepth, latest.graphAgeMs);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
