import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);

  // 1. Require auth: Bearer token or Stripe-Account header
  const authHeader = request.headers.get('authorization') ?? '';
  const stripeAccount = request.headers.get('stripe-account') ?? '';
  const caller = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : stripeAccount.trim();

  if (!caller) {
    return NextResponse.json(
      { message: 'Unauthorized: Bearer token or Stripe-Account header required' },
      { status: 401, headers: corsHeaders },
    );
  }

  try {
    const body = await request.json() as { approval_id?: string; action?: string; org_id?: string };
    const { approval_id, action, org_id } = body;

    if (!approval_id || !action) {
      return NextResponse.json({ message: 'Missing approval_id or action' }, { status: 400, headers: corsHeaders });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400, headers: corsHeaders });
    }

    const decision = action === 'approve' ? 'approved' : 'rejected';

    // 2. Write audit record to finance_governance_audit_ledger
    let recorded = false;
    try {
      const supabase = getSupabaseAdmin();
      const effectiveOrgId = org_id ?? 'stripe-app';
      const message = `Stripe App approval gate: ${action} decision for approval_id=${approval_id}`;
      const payloadObj = { approval_id, action, decision, caller_hint: caller.slice(0, 8) + '…' };
      const requestHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ approval_id, action, ts: new Date().toISOString() }))
        .digest('hex');
      const recordHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ approval_id, action, org_id: effectiveOrgId, requestHash }))
        .digest('hex');

      const { error } = await (supabase as any)
        .from('finance_governance_audit_ledger')
        .insert({
          org_id: effectiveOrgId,
          approval_id,
          action: action === 'approve' ? 'approve' : 'reject',
          actor: 'stripe-app-gate',
          result: 'ok',
          target: approval_id,
          message,
          next_status: decision,
          request_hash: requestHash,
          record_hash: recordHash,
          payload: payloadObj,
        });

      if (error) {
        console.error('[approval-gate] DB write failed:', error.message);
      } else {
        recorded = true;
      }
    } catch (dbErr) {
      console.error('[approval-gate] DB write exception:', dbErr);
    }

    // 3. Return decision with recorded flag
    return NextResponse.json({
      ok: true,
      approval_id,
      action,
      status: decision,
      recorded,
    }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
