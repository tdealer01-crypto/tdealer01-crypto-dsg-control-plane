import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getBearerToken } from '@/lib/dsg/server/supabase-rpc';
import { loadLatestGraph } from '@/lib/plugins/graphmap/storage';

const STALE_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const actor = await requireVerifiedDsgActor(req.headers, 'skill:read');
  const userAccessToken = getBearerToken(req.headers) ?? '';

  try {
    const latest = await loadLatestGraph(userAccessToken, actor.workspaceId);
    if (!latest) {
      return NextResponse.json({ ok: true, status: 'NONE', builtAt: null, nodeCount: 0, edgeCount: 0, isStale: true });
    }

    const { row, graphAgeMs } = latest;
    return NextResponse.json({
      ok: true,
      status: 'READY',
      builtAt: row.built_at,
      nodeCount: row.node_count,
      edgeCount: row.edge_count,
      isStale: graphAgeMs > STALE_MS,
      warnings: row.warnings,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
