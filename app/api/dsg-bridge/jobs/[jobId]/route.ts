import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDsgJob } from '@/lib/dsg-gateway';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase
    .from('users')
    .select('org_id')
    .eq('auth_user_id', session.user.id)
    .single();
  if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: org } = await supabase
    .from('organizations')
    .select('dsg_workspace_id')
    .eq('id', dbUser.org_id)
    .single();

  const workspaceId = (org as { dsg_workspace_id?: string } | null)?.dsg_workspace_id;
  if (!workspaceId) {
    return NextResponse.json({ error: 'DSG workspace not configured for this org' }, { status: 422 });
  }

  const job = await getDsgJob(session.access_token, workspaceId, jobId);
  return NextResponse.json({ ok: true, data: job });
}
