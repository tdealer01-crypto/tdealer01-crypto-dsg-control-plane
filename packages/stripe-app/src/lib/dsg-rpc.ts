/**
 * DSG RPC Client for Stripe App
 * Calls Supabase RPC functions for atomic operations
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * Call the record_stripe_approval_decision RPC
 * Atomic transaction: verify approval + update status + insert audit with hash chain
 */
export async function recordApprovalDecision(params: {
  approvalId: string;
  decision: 'approved' | 'rejected';
  reason: string;
  reviewerId: string;
  reviewerRole: string;
  orgId: string;
}): Promise<{
  ok: boolean;
  decision?: string;
  decision_id?: string;
  proof_hash?: string;
  policy_version?: string;
  audit_recorded?: boolean;
  chain_index?: number;
  error?: string;
}> {
  if (!supabaseAdmin) {
    return { ok: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('record_stripe_approval_decision', {
      p_approval_id: params.approvalId,
      p_decision: params.decision,
      p_reason: params.reason,
      p_reviewer_id: params.reviewerId,
      p_reviewer_role: params.reviewerRole,
      p_org_id: params.orgId,
    });

    if (error) {
      console.error('[RPC] record_stripe_approval_decision error:', error.message);
      return { ok: false, error: 'RPC execution failed' };
    }

    if (!data || !data.ok) {
      return { ok: false, error: data?.error || 'Approval decision failed' };
    }

    return data as any;
  } catch (err) {
    console.error('[RPC] record_stripe_approval_decision exception:', err);
    return { ok: false, error: 'RPC call failed' };
  }
}

/**
 * Verify audit chain integrity for an account
 */
export async function verifyAuditChain(stripeAccountId: string): Promise<{
  ok: boolean;
  valid: boolean;
  broken_at?: number;
  error?: string;
}> {
  if (!supabaseAdmin) {
    return { ok: false, valid: false, error: 'Database not configured' };
  }

  try {
    const { data: audits, error } = await supabaseAdmin
      .from('stripe_operation_audits')
      .select('stripe_event_id, prev_hash, record_hash, chain_index, created_at')
      .eq('stripe_account_id', stripeAccountId)
      .order('chain_index', { ascending: true });

    if (error) {
      return { ok: false, valid: false, error: error.message };
    }

    if (!audits || audits.length === 0) {
      return { ok: true, valid: true };
    }

    let prevHash: string | null = null;
    for (let i = 0; i < audits.length; i++) {
      const audit = audits[i];

      if (audit.chain_index !== i) {
        return {
          ok: true,
          valid: false,
          broken_at: i,
        };
      }

      if (audit.prev_hash !== prevHash) {
        return {
          ok: true,
          valid: false,
          broken_at: i,
        };
      }

      // Note: Full recomputation would require the original payload
      // This is a structural check - prev_hash linkage

      prevHash = audit.record_hash;
    }

    return { ok: true, valid: true };
  } catch (err) {
    console.error('[RPC] verifyAuditChain exception:', err);
    return { ok: false, valid: false, error: 'Verification failed' };
  }
}