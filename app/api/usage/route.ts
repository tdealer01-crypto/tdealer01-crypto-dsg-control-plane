import { NextResponse } from 'next/server';

import { getApiAuthContext } from '../../../lib/auth/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getApiAuthContext();
    if (!auth.ok) {
      return auth.response;
    }

    const supabase = getSupabaseAdmin();
    const billingPeriod = new Date().toISOString().slice(0, 7);

    const { data: usageCounters, error: usageError } = await supabase
      .from('usage_counters')
      .select('executions')
      .eq('org_id', auth.profile.org_id)
      .eq('billing_period', billingPeriod);

    if (usageError) {
      return NextResponse.json({ error: usageError.message }, { status: 500 });
    }

    const executions = (usageCounters || []).reduce(
      (sum, row) => sum + Number(row.executions || 0),
      0
    );

    const includedExecutions = 10000;
    const overageExecutions = Math.max(0, executions - includedExecutions);
    const projectedAmountUsd = Number((overageExecutions * 0.001).toFixed(3));

    return NextResponse.json({
      plan: 'Pro',
      billing_period: billingPeriod,
      executions,
      included_executions: includedExecutions,
      overage_executions: overageExecutions,
      projected_amount_usd: projectedAmountUsd,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
