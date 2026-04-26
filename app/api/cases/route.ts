import { NextResponse } from 'next/server';
import { getOrg } from '../../../lib/server/getOrg';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { handleApiError } from '../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

async function hasTable(admin: any, table: string) {
  const { error } = await admin.from(table).select('id').limit(1);
  return !error;
}

export async function GET() {
  try {
    const orgId = await getOrg();
    const admin = getSupabaseAdmin() as any;

    if (await hasTable(admin, 'finance_workflow_cases')) {
      const { data, error } = await admin
        .from('finance_workflow_cases')
        .select('id,status,vendor,amount,currency,workflow,updated_at,created_at')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return NextResponse.json({ cases: data ?? [] });
    }

    const { data, error } = await admin
      .from('finance_transactions')
      .select('id,status,vendor,amount,currency,workflow_case_id,updated_at,created_at')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    const cases = (data ?? []).map((item: any) => ({
      id: item.workflow_case_id || item.id,
      status: item.status,
      vendor: item.vendor,
      amount: item.amount,
      currency: item.currency,
      workflow: 'Finance governance control layer',
      updated_at: item.updated_at,
      created_at: item.created_at,
    }));

    return NextResponse.json({ cases });
  } catch (error) {
    return handleApiError('api/cases', error);
  }
}
