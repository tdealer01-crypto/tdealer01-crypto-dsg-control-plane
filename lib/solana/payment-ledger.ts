/**
 * Payment Ledger — Supabase Integration
 * Persists payment records for audit trail and compliance
 *
 * All payment records are immutable (append-only) to maintain audit integrity
 */

import { createClient } from '@supabase/supabase-js';

export interface PaymentLedgerRecord {
  execution_id: string;
  agent_id: string;
  idempotency_key: string;
  recipient_wallet: string;
  amount_sol: number;
  description: string;
  status: 'pending' | 'confirmed' | 'failed';
  transaction_signature?: string;
  confirmation_block_height?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  org_id: string;
}

/**
 * Write payment record to ledger
 * Called after SOLPaymentProcessor.processPayment() completes
 */
export async function writeLedgerRecord(
  ledgerRecord: PaymentLedgerRecord
): Promise<{ id: string; created_at: string } | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const insertPayload: any = {
      execution_id: ledgerRecord.execution_id,
      agent_id: ledgerRecord.agent_id,
      idempotency_key: ledgerRecord.idempotency_key,
      recipient_wallet: ledgerRecord.recipient_wallet,
      amount_sol: ledgerRecord.amount_sol,
      description: ledgerRecord.description,
      status: ledgerRecord.status,
      transaction_signature: ledgerRecord.transaction_signature,
      confirmation_block_height: ledgerRecord.confirmation_block_height,
      error_message: ledgerRecord.error_message,
      metadata: ledgerRecord.metadata,
      org_id: ledgerRecord.org_id,
    };

    const { data, error } = await supabase
      .from('payment_ledger')
      .insert(insertPayload)
      .select('id, created_at')
      .single();

    if (error) {
      console.error('[Payment Ledger] Write error:', error);
      throw error;
    }

    console.log(
      `[Payment Ledger] Record written: ${ledgerRecord.amount_sol} SOL to ${ledgerRecord.recipient_wallet}`
    );
    return data;
  } catch (err) {
    console.error('[Payment Ledger] Failed to write record:', err);
    throw err;
  }
}

/**
 * Retrieve payment records for audit
 */
export async function getPaymentRecords(
  orgId: string,
  filters?: {
    agentId?: string;
    executionId?: string;
    status?: 'pending' | 'confirmed' | 'failed';
    limit?: number;
    offset?: number;
  }
): Promise<any[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    let query: any = supabase
      .from('payment_ledger' as any)
      .select('*')
      .eq('org_id', orgId);

    if (filters?.agentId) {
      query = query.eq('agent_id', filters.agentId as any);
    }

    if (filters?.executionId) {
      query = query.eq('execution_id', filters.executionId as any);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Payment Ledger] Query error:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('[Payment Ledger] Failed to query records:', err);
    throw err;
  }
}

/**
 * Check idempotency: return existing payment if already processed
 */
export async function checkIdempotencyRecord(
  idempotencyKey: string
): Promise<{ id: string; status: string; transaction_signature?: string } | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data, error } = await (supabase as any)
      .from('payment_ledger')
      .select('id, status, transaction_signature')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (error && error.code === 'PGRST116') {
      // No record found (expected for new payments)
      return null;
    }

    if (error) {
      console.error('[Payment Ledger] Idempotency check error:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('[Payment Ledger] Failed to check idempotency:', err);
    throw err;
  }
}

/**
 * Update payment status after Solana confirmation
 */
export async function updatePaymentStatus(
  idempotencyKey: string,
  status: 'pending' | 'confirmed' | 'failed',
  confirmationBlockHeight?: number
): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const updateData: any = {
      status,
    };

    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString();
      if (confirmationBlockHeight) {
        updateData.confirmation_block_height = confirmationBlockHeight;
      }
    }

    const { error } = await (supabase as any)
      .from('payment_ledger')
      .update(updateData)
      .eq('idempotency_key', idempotencyKey);

    if (error) {
      console.error('[Payment Ledger] Update error:', error);
      throw error;
    }

    console.log(`[Payment Ledger] Status updated: ${idempotencyKey} -> ${status}`);
    return true;
  } catch (err) {
    console.error('[Payment Ledger] Failed to update status:', err);
    throw err;
  }
}

/**
 * Get payment summary for an agent
 */
export async function getAgentPaymentSummary(
  orgId: string,
  agentId: string
): Promise<{
  total_payments: number;
  total_sol: number;
  confirmed_count: number;
  pending_count: number;
  failed_count: number;
}> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data, error } = await (supabase as any)
      .from('payment_ledger')
      .select('status, amount_sol')
      .eq('org_id', orgId)
      .eq('agent_id', agentId);

    if (error) {
      console.error('[Payment Ledger] Summary query error:', error);
      throw error;
    }

    const records = data || [];
    const summary = {
      total_payments: records.length,
      total_sol: records.reduce((sum, r) => sum + (r.amount_sol || 0), 0),
      confirmed_count: records.filter((r) => r.status === 'confirmed').length,
      pending_count: records.filter((r) => r.status === 'pending').length,
      failed_count: records.filter((r) => r.status === 'failed').length,
    };

    return summary;
  } catch (err) {
    console.error('[Payment Ledger] Failed to get summary:', err);
    throw err;
  }
}
