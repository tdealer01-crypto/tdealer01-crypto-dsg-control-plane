import { NextResponse } from 'next/server';
import { resolveRemoteBrowserCheckpoint } from '@/lib/dsg/remote-browser/session-store';

type RouteContext = { params: Promise<{ sessionId: string; checkpointId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { sessionId, checkpointId } = await context.params;
  const body = await req.json().catch(() => null) as { detail?: string } | null;

  try {
    const session = resolveRemoteBrowserCheckpoint({
      sessionId,
      checkpointId,
      detail: typeof body?.detail === 'string' ? body.detail : undefined,
    });
    return NextResponse.json({ ok: true, data: { session } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: { message: error instanceof Error ? error.message : 'REMOTE_BROWSER_CHECKPOINT_RESOLVE_FAILED' },
    }, { status: 400 });
  }
}
