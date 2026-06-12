import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const CONNECTED_ACCOUNT_COOKIE = 'dsg_stripe_account_id';

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
    console.warn('[stripe-app/policies] account scope lookup failed:', error);
  }

  return [...accountIds];
}

export async function GET() {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const accountIds = await getAccountIds(user.id);
  if (accountIds.length === 0) return NextResponse.json([]);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          in: (column: string, values: string[]) => {
            eq: (column: string, value: boolean) => {
              order: (column: string, opts: { ascending: boolean }) => Promise<{
                data: Array<{
                  id: string;
                  operation_type: string;
                  rule_type: string | null;
                  conditions: Record<string, unknown>;
                  action: 'allow' | 'block' | 'review';
                  created_at: string;
                }> | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    })
      .from('stripe_operation_policies')
      .select('id, operation_type, rule_type, conditions, action, created_at')
      .in('stripe_account_id', accountIds)
      .eq('enabled', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('[stripe-app/policies] failed:', error);
    return NextResponse.json({ message: 'Failed to load policies' }, { status: 500 });
  }
}
