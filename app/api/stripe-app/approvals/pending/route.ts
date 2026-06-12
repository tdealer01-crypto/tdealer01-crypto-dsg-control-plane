import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const CONNECTED_ACCOUNT_COOKIE = 'dsg_stripe_account_id';

type AuditPayload = {
  amount_cents?: number;
  amount?: number;
  currency?: string;
};

async function getOrgIdsForUser(userId: string): Promise<string[]> {
  const ids = new Set<string>([userId]);

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await (supabase as unknown as {
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

    for (const row of data ?? []) {
      if (row.org_id) ids.add(row.org_id);
      if (row.organization_id) ids.add(row.organization_id);
    }
  } catch (error) {
    console.warn('[stripe-app/approvals/pending] org lookup failed:', error);
  }

  return [...ids];
}

async function getStripeAccountIds(userId: string, cookieAccountId: string | null): Promise<string[]> {
  const accountIds = new Set<string>();
  if (cookieAccountId) accountIds.add(cookieAccountId);

  try {
    const supabase = getSupabaseAdmin();
    const orgIds = await getOrgIdsForUser(userId);
    const { data } = await (supabase as unknown as {
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
      .in('dsg_org_id', orgIds);

    for (const row of data ?? []) {
      if (row.stripe_account_id) accountIds.add(row.stripe_account_id);
    }
  } catch (error) {
    console.warn('[stripe-app/approvals/pending] account lookup failed:', error);
  }

  return [...accountIds];
}

export async function GET() {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const cookieAccountId = cookieStore.get(CONNECTED_ACCOUNT_COOKIE)?.value ?? null;
  const accountIds = await getStripeAccountIds(user.id, cookieAccountId);

  if (accountIds.length === 0) return NextResponse.json([]);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          in: (column: string, values: string[]) => {
            eq: (column: string, value: string) => {
              order: (column: string, opts: { ascending: boolean }) => {
                limit: (count: number) => Promise<{
                  data: Array<{
                    id: string;
                    stripe_object_id: string;
                    operation_type: string;
                    dsg_reason: string | null;
                    payload: AuditPayload | null;
                    created_at: string;
                  }> | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      };
    })
      .from('stripe_operation_audits')
      .select('id, stripe_object_id, operation_type, dsg_reason, payload, created_at')
      .in('stripe_account_id', accountIds)
      .eq('dsg_decision', 'REVIEW')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    const approvals = (data ?? [])
      .filter((row) => row.stripe_object_id && row.operation_type)
      .map((row) => ({
        id: row.id,
        stripe_object_id: row.stripe_object_id,
        operation_type: row.operation_type,
        amount_cents: row.payload?.amount_cents ?? row.payload?.amount ?? 0,
        currency: row.payload?.currency ?? 'usd',
        policy_reason: row.dsg_reason ?? 'Manual review required',
        created_at: row.created_at,
      }));

    return NextResponse.json(approvals);
  } catch (error) {
    console.error('[stripe-app/approvals/pending] failed:', error);
    return NextResponse.json({ message: 'Failed to load pending approvals' }, { status: 500 });
  }
}
