import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDsgJob, listDsgJobs } from '@/lib/dsg-gateway';

function getWorkspaceId(): string | null {
  return process.env.DSG_ONE_V1_WORKSPACE_ID ?? null;
}

async function getSessionToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function GET(_req: NextRequest) {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) return NextResponse.json({ error: 'DSG_ONE_V1_WORKSPACE_ID not configured' }, { status: 500 });

  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const jobs = await listDsgJobs(token, workspaceId);
  return NextResponse.json({ ok: true, data: { jobs } });
}

export async function POST(req: NextRequest) {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) return NextResponse.json({ error: 'DSG_ONE_V1_WORKSPACE_ID not configured' }, { status: 500 });

  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    goal?: string;
    successCriteria?: unknown[];
  } | null;
  if (!body?.goal?.trim()) return NextResponse.json({ error: 'goal is required' }, { status: 400 });

  const job = await createDsgJob(token, workspaceId, body.goal, body.successCriteria);
  return NextResponse.json({ ok: true, data: job }, { status: 201 });
}
