import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let approvalId: string | undefined;
  try {
    const body = await request.json() as { approval_id?: string };
    approvalId = body.approval_id;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  if (!approvalId) return NextResponse.json({ message: 'Missing approval_id' }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        update: (values: Record<string, unknown>) => {
          eq: (column: string, value: string) => {
            select: (columns: string) => Promise<{
              data: Array<{ id: string }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    })
      .from('stripe_operation_audits')
      .update({ status: 'declined' })
      .eq('id', approvalId)
      .select('id');

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return NextResponse.json({ message: 'Approval not found' }, { status: 404 });

    return NextResponse.json({ ok: true, approval_id: approvalId, status: 'declined' });
  } catch (error) {
    console.error('[stripe-app/approvals/decline] failed:', error);
    return NextResponse.json({ message: 'Failed to update approval' }, { status: 500 });
  }
}
