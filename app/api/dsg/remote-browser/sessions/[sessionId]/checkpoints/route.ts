import { NextResponse } from 'next/server';
import { addRemoteBrowserCheckpoint, getRemoteBrowserSession } from '@/lib/dsg/remote-browser/session-store';
import type { RemoteBrowserCheckpoint } from '@/lib/dsg/remote-browser/types';

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const session = getRemoteBrowserSession(params.sessionId);
    return NextResponse.json({ ok: true, data: { checkpoints: session.checkpoints } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'REMOTE_BROWSER_SESSION_NOT_FOUND' } }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  const body = await req.json().catch(() => null) as Partial<RemoteBrowserCheckpoint> | null;
  const type = body?.type ?? 'takeover';
  const state = body?.state ?? 'active';
  const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : '';

  if (!instruction) return NextResponse.json({ ok: false, error: { message: 'CHECKPOINT_INSTRUCTION_REQUIRED' } }, { status: 400 });

  try {
    const session = addRemoteBrowserCheckpoint({ sessionId: params.sessionId, type, state, instruction });
    return NextResponse.json({ ok: true, data: { session } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'REMOTE_BROWSER_CHECKPOINT_FAILED' } }, { status: 400 });
  }
}
