import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getDsgUrl(): string {
  const url = process.env.DSG_ONE_V1_URL;
  if (!url) throw new Error('DSG_ONE_V1_URL not configured');
  return url.replace(/\/$/, '');
}

function getWorkspaceId(): string | null {
  return process.env.DSG_ONE_V1_WORKSPACE_ID ?? null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ ok: false, error: 'DSG workspace not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const res = await fetch(`${getDsgUrl()}/api/dsg/bubble`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'x-dsg-workspace-id': workspaceId,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: 'DSG_BUBBLE_BRIDGE_FAILED' }, { status: 502 });
  }
}
