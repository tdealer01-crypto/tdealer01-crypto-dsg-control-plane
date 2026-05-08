import { NextResponse } from 'next/server';
import { addRemoteBrowserArtifact, getRemoteBrowserSession } from '@/lib/dsg/remote-browser/session-store';
import type { RemoteBrowserArtifact } from '@/lib/dsg/remote-browser/types';

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  try {
    const session = getRemoteBrowserSession(sessionId);
    return NextResponse.json({ ok: true, data: { artifacts: session.artifacts } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'REMOTE_BROWSER_SESSION_NOT_FOUND' } }, { status: 404 });
  }
}

export async function POST(req: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const body = await req.json().catch(() => null) as Partial<RemoteBrowserArtifact> | null;
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const detail = typeof body?.detail === 'string' ? body.detail.trim() : '';
  const type = body?.type ?? 'manual_note';
  const status = body?.status ?? 'available';
  const url = typeof body?.url === 'string' ? body.url.trim() : undefined;

  if (!title) return NextResponse.json({ ok: false, error: { message: 'ARTIFACT_TITLE_REQUIRED' } }, { status: 400 });
  if (!detail) return NextResponse.json({ ok: false, error: { message: 'ARTIFACT_DETAIL_REQUIRED' } }, { status: 400 });

  try {
    const session = addRemoteBrowserArtifact({ sessionId, type, status, title, detail, url });
    return NextResponse.json({ ok: true, data: { session } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'REMOTE_BROWSER_ARTIFACT_FAILED' } }, { status: 400 });
  }
}
