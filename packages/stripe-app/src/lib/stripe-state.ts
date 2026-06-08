import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface StripeAppAccount {
  id: string;
  stripe_account_id: string;
  dsg_org_id: string;
  stripe_api_key_encrypted?: string;
  fail_safe_mode: 'fail_open' | 'fail_closed';
  status: 'active' | 'inactive' | 'revoked';
  installed_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface StripeOperationPolicy {
  id: string;
  stripe_account_id: string;
  operation_type: string;
  rule_type?: string;
  conditions: Record<string, unknown>;
  action: 'allow' | 'block' | 'review';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface StripeOperationAudit {
  id: string;
  stripe_account_id: string;
  stripe_event_id: string;
  stripe_object_id: string;
  operation_type: string;
  dsg_decision_id?: string;
  dsg_decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  dsg_reason?: string;
  dsg_proof?: string;
  payload?: Record<string, unknown>;
  status: 'recorded' | 'reviewed' | 'executed';
  created_at: string;
}

export class StripeStateManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============ Accounts ============

  async linkStripeAccount(
    stripeAccountId: string,
    dsgOrgId: string,
    failSafeMode: 'fail_open' | 'fail_closed' = 'fail_open'
  ): Promise<StripeAppAccount> {
    const { data, error } = await this.supabase
      .from('stripe_app_accounts')
      .insert({
        stripe_account_id: stripeAccountId,
        dsg_org_id: dsgOrgId,
        fail_safe_mode: failSafeMode,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to link account: ${error.message}`);
    }

    return data;
  }

  async getStripeAccount(
    stripeAccountId: string
  ): Promise<StripeAppAccount | null> {
    const { data, error } = await this.supabase
      .from('stripe_app_accounts')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows
      throw new Error(`Failed to fetch account: ${error.message}`);
    }

    return data || null;
  }

  async getAccountsByOrg(dsgOrgId: string): Promise<StripeAppAccount[]> {
    const { data, error } = await this.supabase
      .from('stripe_app_accounts')
      .select('*')
      .eq('dsg_org_id', dsgOrgId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    return data || [];
  }

  async updateFailSafeMode(
    stripeAccountId: string,
    mode: 'fail_open' | 'fail_closed'
  ): Promise<void> {
    const { error } = await this.supabase
      .from('stripe_app_accounts')
      .update({ fail_safe_mode: mode })
      .eq('stripe_account_id', stripeAccountId);

    if (error) {
      throw new Error(`Failed to update fail-safe mode: ${error.message}`);
    }
  }

  // ============ Policies ============

  async createPolicy(
    stripeAccountId: string,
    operationType: string,
    ruleType: string,
    conditions: Record<string, unknown>,
    action: 'allow' | 'block' | 'review'
  ): Promise<StripeOperationPolicy> {
    const { data, error } = await this.supabase
      .from('stripe_operation_policies')
      .insert({
        stripe_account_id: stripeAccountId,
        operation_type: operationType,
        rule_type: ruleType,
        conditions,
        action,
        enabled: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create policy: ${error.message}`);
    }

    return data;
  }

  async getPolicies(stripeAccountId: string): Promise<StripeOperationPolicy[]> {
    const { data, error } = await this.supabase
      .from('stripe_operation_policies')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .eq('enabled', true);

    if (error) {
      throw new Error(`Failed to fetch policies: ${error.message}`);
    }

    return data || [];
  }

  async getPolicy(
    stripeAccountId: string,
    operationType: string
  ): Promise<StripeOperationPolicy | null> {
    const { data, error } = await this.supabase
      .from('stripe_operation_policies')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .eq('operation_type', operationType)
      .eq('enabled', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch policy: ${error.message}`);
    }

    return data || null;
  }

  // ============ Audits ============

  async recordAudit(
    stripeAccountId: string,
    stripeEventId: string,
    stripeObjectId: string,
    operationType: string,
    dsgDecision: 'ALLOW' | 'BLOCK' | 'REVIEW',
    dsgReason?: string,
    dsgProof?: string,
    payload?: Record<string, unknown>
  ): Promise<StripeOperationAudit> {
    const { data, error } = await this.supabase
      .from('stripe_operation_audits')
      .insert({
        stripe_account_id: stripeAccountId,
        stripe_event_id: stripeEventId,
        stripe_object_id: stripeObjectId,
        operation_type: operationType,
        dsg_decision: dsgDecision,
        dsg_reason: dsgReason,
        dsg_proof: dsgProof,
        payload,
        status: 'recorded',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record audit: ${error.message}`);
    }

    return data;
  }

  async getAudits(
    stripeAccountId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<StripeOperationAudit[]> {
    const { data, error } = await this.supabase
      .from('stripe_operation_audits')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch audits: ${error.message}`);
    }

    return data || [];
  }

  async getAuditsByDecision(
    stripeAccountId: string,
    decision: 'ALLOW' | 'BLOCK' | 'REVIEW'
  ): Promise<StripeOperationAudit[]> {
    const { data, error } = await this.supabase
      .from('stripe_operation_audits')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .eq('dsg_decision', decision)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch audits: ${error.message}`);
    }

    return data || [];
  }

  // Count operations this month for quota
  async countOperationsThisMonth(
    stripeAccountId: string
  ): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await this.supabase
      .from('stripe_operation_audits')
      .select('*', { count: 'exact', head: true })
      .eq('stripe_account_id', stripeAccountId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      throw new Error(`Failed to count operations: ${error.message}`);
    }

    return count || 0;
  }
}
