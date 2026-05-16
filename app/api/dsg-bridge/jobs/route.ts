import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDsgJob, listDsgJobs } from '@/lib/dsg-gateway';

async function getSessionAndWorkspace(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: dbUser } = await supabase
    .from('users')
    .select('org_id')
    .eq('auth_user_id', session.user.id)
    .single();
  if (!dbUser) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('dsg_workspace_id')
    .eq('id', dbUser.org_id)
    .single();

  const workspaceId = (org as { dsg_workspace_id?: string } | null)?.dsg_workspace_id;
  if (!workspaceId) return null;

  return { token: session.access_token, workspaceId };
}

export async function GET(req: NextRequest) {
  void req;
  const supabase = await createClient();
  const ctx = await getSessionAndWorkspace(supabase);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized or workspace not configured' }, { status: 401 });

  const jobs = await listDsgJobs(ctx.token, ctx.workspaceId);
  return NextResponse.json({ ok: true, data: { jobs } });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const ctx = await getSessionAndWorkspace(supabase);
  if (!ctx) {
    return NextResponse.json(
      { error: 'Unauthorized or DSG workspace not configured on this org' },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    goal?: string;
    successCriteria?: unknown[];
  } | null;
  if (!body?.goal?.trim()) {
    return NextResponse.json({ error: 'goal is required' }, { status: 400 });
  }

  const job = await createDsgJob(ctx.token, ctx.workspaceId, body.goal, body.successCriteria);
  return NextResponse.json({ ok: true, data: job }, { status: 201 });
}
