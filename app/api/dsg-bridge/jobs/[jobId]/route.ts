import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDsgJob } from '@/lib/dsg-gateway';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const workspaceId = process.env.DSG_ONE_V1_WORKSPACE_ID;
  if (!workspaceId) return NextResponse.json({ error: 'DSG_ONE_V1_WORKSPACE_ID not configured' }, { status: 500 });

  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const job = await getDsgJob(session.access_token, workspaceId, jobId);
  return NextResponse.json({ ok: true, data: job });
}
