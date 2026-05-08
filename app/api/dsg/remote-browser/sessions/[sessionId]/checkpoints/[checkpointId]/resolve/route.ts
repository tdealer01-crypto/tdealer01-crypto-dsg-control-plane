import { NextResponse } from 'next/server';
import { resolveRemoteBrowserCheckpoint } from '@/lib/dsg/remote-browser/session-store';

export async function POST(req: Request, { params }: { params: { sessionId: string; checkpointId: string } }) {
  const body = await req.json().catch(() => null) as { detail?: string } | null;

  try {
    const session = resolveRemoteBrowserCheckpoint({
      sessionId: params.sessionId,
      checkpointId: params.checkpointId,
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
