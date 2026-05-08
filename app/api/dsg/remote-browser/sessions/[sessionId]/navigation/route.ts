import { NextResponse } from 'next/server';
import { appendRemoteBrowserNavigation, getRemoteBrowserSession } from '@/lib/dsg/remote-browser/session-store';
import type { RemoteBrowserNavigationEvent } from '@/lib/dsg/remote-browser/types';

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  try {
    const session = getRemoteBrowserSession(sessionId);
    return NextResponse.json({ ok: true, data: { navigationLog: session.navigationLog } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'REMOTE_BROWSER_SESSION_NOT_FOUND' } }, { status: 404 });
  }
}

export async function POST(req: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const body = await req.json().catch(() => null) as Partial<RemoteBrowserNavigationEvent> | null;
  const action = body?.action ?? 'note';
  const status = body?.status ?? 'completed';
  const detail = typeof body?.detail === 'string' ? body.detail.trim() : '';
  const url = typeof body?.url === 'string' ? body.url.trim() : undefined;

  if (!detail) return NextResponse.json({ ok: false, error: { message: 'NAVIGATION_DETAIL_REQUIRED' } }, { status: 400 });

  try {
    const session = appendRemoteBrowserNavigation({ sessionId, action, status, url, detail });
    return NextResponse.json({ ok: true, data: { session } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'REMOTE_BROWSER_NAVIGATION_FAILED' } }, { status: 400 });
  }
}
