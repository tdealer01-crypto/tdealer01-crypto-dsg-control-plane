import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const CONNECTED_ACCOUNT_COOKIE = 'dsg_stripe_account_id';

type PolicyAction = 'allow' | 'block' | 'review';

function isAction(value: unknown): value is PolicyAction {
  return value === 'allow' || value === 'block' || value === 'review';
}

async function getPrimaryAccountId(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieAccountId = cookieStore.get(CONNECTED_ACCOUNT_COOKIE)?.value ?? null;
  if (cookieAccountId) return cookieAccountId;

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
          in: (column: string, values: string[]) => {
            limit: (count: number) => Promise<{
              data: Array<{ stripe_account_id: string }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    })
      .from('stripe_app_accounts')
      .select('stripe_account_id')
      .in('dsg_org_id', [...orgIds])
      .limit(1);

    return accounts?.[0]?.stripe_account_id ?? null;
  } catch (error) {
    console.warn('[stripe-app/policies/create] account lookup failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let body: {
    operation_type?: string;
    rule_type?: string;
    conditions?: Record<string, unknown>;
    action?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.operation_type) return NextResponse.json({ message: 'Missing operation_type' }, { status: 400 });
  if (!isAction(body.action)) return NextResponse.json({ message: 'Invalid action' }, { status: 400 });

  const stripeAccountId = await getPrimaryAccountId(user.id);
  if (!stripeAccountId) {
    return NextResponse.json({ message: 'No connected Stripe account' }, { status: 404 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        insert: (values: Record<string, unknown>) => {
          select: (columns: string) => {
            single: () => Promise<{
              data: Record<string, unknown> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    })
      .from('stripe_operation_policies')
      .insert({
        stripe_account_id: stripeAccountId,
        operation_type: body.operation_type,
        rule_type: body.rule_type ?? 'amount_threshold',
        conditions: body.conditions ?? {},
        action: body.action,
        enabled: true,
      })
      .select('id, operation_type, rule_type, conditions, action, created_at')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[stripe-app/policies/create] failed:', error);
    return NextResponse.json({ message: 'Failed to create policy' }, { status: 500 });
  }
}
