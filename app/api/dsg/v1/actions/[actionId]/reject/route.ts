import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireOrgRole } from '@/lib/authz';
import { getConfirmationStatus, rejectConfirmation } from '@/lib/user-confirmation-gate';

export const dynamic = 'force-dynamic';

interface ActionRow {
  action_id: string;
  org_id: string;
  confirmation_request_id: string | null;
  status: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { actionId } = await params;
  const supabase: any = getSupabaseAdmin();

  const { data, error: fetchError } = await supabase
    .from('dsg_actions')
    .select('*')
    .eq('action_id', actionId)
    .single() as { data: ActionRow | null; error: any };

  if (fetchError || !data) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  }

  if (data.org_id !== access.orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!data.confirmation_request_id) {
    return NextResponse.json(
      { error: 'Action does not require confirmation' },
      { status: 400 },
    );
  }

  const confirmStatus = await getConfirmationStatus(data.confirmation_request_id, supabase);
  if (!confirmStatus) {
    return NextResponse.json({ error: 'Confirmation request not found' }, { status: 404 });
  }

  if (confirmStatus.status === 'APPROVED') {
    return NextResponse.json({ status: 'APPROVED', message: 'Already approved' });
  }
  if (confirmStatus.status === 'REJECTED') {
    return NextResponse.json({ status: 'REJECTED', message: 'Already rejected' });
  }

  const rejected = await rejectConfirmation(data.confirmation_request_id, access.userId, supabase);

  if (!rejected) {
    return NextResponse.json({ error: 'Failed to reject action' }, { status: 500 });
  }

  await (supabase.from('dsg_actions' as any).update({
    status: 'REJECTED',
    updated_at: new Date().toISOString(),
  }).eq('action_id', actionId));

  return NextResponse.json({ actionId, status: 'REJECTED', message: 'Action rejected by pilot' });
}
