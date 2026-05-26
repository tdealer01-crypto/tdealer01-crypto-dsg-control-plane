import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { scanRepo, DEFAULT_INCLUDE, DEFAULT_EXCLUDE } from '@/lib/plugins/graphmap/scanner';
import { buildGraph } from '@/lib/plugins/graphmap/builder';
import { saveGraph } from '@/lib/plugins/graphmap/storage';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const actor = await requireVerifiedDsgActor(req.headers, 'skill:execute');

  let include: string[] = DEFAULT_INCLUDE;
  let exclude: string[] = DEFAULT_EXCLUDE;
  try {
    const body = await req.json();
    if (Array.isArray(body.include_patterns) && body.include_patterns.every((p: unknown) => typeof p === 'string')) {
      include = body.include_patterns as string[];
    }
    if (Array.isArray(body.exclude_patterns) && body.exclude_patterns.every((p: unknown) => typeof p === 'string')) {
      exclude = body.exclude_patterns as string[];
    }
  } catch {
    // body is optional — use defaults
  }

  try {
    const rootPath = process.cwd();
    const files = await scanRepo(rootPath, include, exclude);
    const snapshot = await buildGraph(rootPath, files);
    const graphId = await saveGraph(actor.actorId, actor.workspaceId, snapshot, include, exclude);

    return NextResponse.json({
      ok: true,
      graphId,
      nodeCount: snapshot.nodeCount,
      edgeCount: snapshot.edgeCount,
      warnings: snapshot.warnings,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
