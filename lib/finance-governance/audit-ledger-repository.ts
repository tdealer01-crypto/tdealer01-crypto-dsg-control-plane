import { getSupabaseAdmin } from '../supabase-server';
import {
  verifyFinanceGovernanceAuditLedgerRow,
  type FinanceGovernanceAuditLedgerRow,
} from './audit-ledger';

export class FinanceGovernanceAuditLedgerRepository {
  async list(orgId: string, limit = 50) {
    const supabase = getSupabaseAdmin() as any;
    const safeLimit = Math.min(Math.max(limit, 1), 200);

    const { data, error } = await supabase
      .from('finance_governance_audit_ledger')
      .select('id,org_id,case_id,approval_id,action,actor,result,target,message,next_status,request_hash,record_hash,payload,created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw new Error(`failed_to_read_audit_ledger:${error.message}`);
    }

    return data ?? [];
  }

  async verify(orgId: string, recordHash: string) {
    const supabase = getSupabaseAdmin() as any;

    const { data, error } = await supabase
      .from('finance_governance_audit_ledger')
      .select('id,org_id,case_id,approval_id,action,actor,result,target,message,next_status,request_hash,record_hash,payload,created_at')
      .eq('org_id', orgId)
      .eq('record_hash', recordHash)
      .maybeSingle();

    if (error) {
      throw new Error(`failed_to_read_audit_ledger:${error.message}`);
    }

    if (!data) {
      throw new Error('audit_record_not_found');
    }

    const row = data as FinanceGovernanceAuditLedgerRow;

    return {
      record: row,
      verification: verifyFinanceGovernanceAuditLedgerRow(row),
    };
  }
}
