import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const CONNECTED_ACCOUNT_COOKIE = 'dsg_stripe_account_id';
const VALID_DECISIONS = new Set(['ALLOW', 'BLOCK', 'REVIEW']);

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

async function getAccountIds(userId: string): Promise<string[]> {
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
    console.warn('[stripe-app/audit/export] account lookup failed:', error);
  }

  return [...accountIds];
}

export async function GET(request: NextRequest) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const requestedDecision = request.nextUrl.searchParams.get('decision')?.toUpperCase() ?? null;
  const decisionFilter = requestedDecision && VALID_DECISIONS.has(requestedDecision) ? requestedDecision : null;
  const accountIds = await getAccountIds(user.id);

  if (accountIds.length === 0) {
    return new NextResponse('created_at,stripe_account_id,stripe_object_id,operation_type,decision,reason,proof,status\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="dsg-stripe-audit-empty.csv"',
      },
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          in: (column: string, values: string[]) => {
            order: (column: string, opts: { ascending: boolean }) => Promise<{
              data: Array<{
                created_at: string;
                stripe_account_id: string;
                stripe_object_id: string;
                operation_type: string;
                dsg_decision: string | null;
                dsg_reason: string | null;
                dsg_proof: string | null;
                status: string | null;
              }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    })
      .from('stripe_operation_audits')
      .select('created_at, stripe_account_id, stripe_object_id, operation_type, dsg_decision, dsg_reason, dsg_proof, status')
      .in('stripe_account_id', accountIds)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const filteredRows = decisionFilter
      ? (data ?? []).filter((row) => row.dsg_decision === decisionFilter)
      : (data ?? []);

    const header = ['created_at', 'stripe_account_id', 'stripe_object_id', 'operation_type', 'decision', 'reason', 'proof', 'status'];
    const rows = filteredRows.map((row) => [
      row.created_at,
      row.stripe_account_id,
      row.stripe_object_id,
      row.operation_type,
      row.dsg_decision,
      row.dsg_reason,
      row.dsg_proof,
      row.status,
    ].map(csvEscape).join(','));
    const csv = [header.join(','), ...rows].join('\n') + '\n';
    const suffix = decisionFilter ? `-${decisionFilter.toLowerCase()}` : '';

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="dsg-stripe-audit${suffix}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('[stripe-app/audit/export] failed:', error);
    return NextResponse.json({ message: 'Failed to export audit records' }, { status: 500 });
  }
}
