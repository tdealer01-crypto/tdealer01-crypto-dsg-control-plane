import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const CONNECTED_ACCOUNT_COOKIE = 'dsg_stripe_account_id';

async function getAccountIds(userId: string) {
  const cookieStore = await cookies();
  const cookieAccountId = cookieStore.get(CONNECTED_ACCOUNT_COOKIE)?.value ?? null;
  const accountIds = new Set<string>();
  if (cookieAccountId) accountIds.add(cookieAccountId);

  try {
    const supabase = getSupabaseAdmin();
    const { data: memberships } = await (supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => Promise<{
            data: Array<{ org_id?: string; organization_id?: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    })
      .from('org_members')
      .select('org_id, organization_id')
      .eq('user_id', userId);

    const orgIds = new Set<string>([userId]);
    for (const row of memberships ?? []) {
      if (row.org_id) orgIds.add(row.org_id);
      if (row.organization_id) orgIds.add(row.organization_id);
    }

    const { data: accounts } = await (supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          in: (column: string, values: string[]) => Promise<{
            data: Array<{ stripe_account_id: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    })
      .from('stripe_app_accounts')
      .select('stripe_account_id')
      .in('dsg_org_id', [...orgIds]);

    for (const row of accounts ?? []) {
      if (row.stripe_account_id) accountIds.add(row.stripe_account_id);
    }
  } catch (error) {
    console.warn('[stripe-app/approvals/approve] account scope lookup failed:', error);
  }

  return [...accountIds];
}

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

  const accountIds = await getAccountIds(user.id);
  if (accountIds.length === 0) return NextResponse.json({ message: 'No connected Stripe account' }, { status: 404 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        update: (values: Record<string, unknown>) => {
          eq: (column: string, value: string) => {
            in: (column: string, values: string[]) => {
              select: (columns: string) => Promise<{
                data: Array<{ id: string }> | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    })
      .from('stripe_operation_audits')
      .update({ status: 'approved' })
      .eq('id', approvalId)
      .in('stripe_account_id', accountIds)
      .select('id');

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return NextResponse.json({ message: 'Approval not found' }, { status: 404 });

    return NextResponse.json({ ok: true, approval_id: approvalId, status: 'approved' });
  } catch (error) {
    console.error('[stripe-app/approvals/approve] failed:', error);
    return NextResponse.json({ message: 'Failed to approve' }, { status: 500 });
  }
}
