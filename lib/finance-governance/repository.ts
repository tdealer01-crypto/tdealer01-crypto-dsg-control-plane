import {
  buildApprovalActionResult,
  buildSubmitResult,
  type FinanceGovernanceActionName,
  type FinanceGovernanceActionResult,
} from './actions';
import type {
  FinanceGovernanceApprovalItem,
  FinanceGovernanceCaseDetail,
  FinanceGovernanceWorkspaceSummary,
} from './mock-data';
import { getSupabaseAdmin } from '../supabase-server';

export class FinanceGovernanceRepository {
  private async hasControlLayerTables(supabase: any) {
    const { error } = await supabase.from('finance_transactions').select('id').limit(1);
    return !error;
  }

  private async hasLegacyWorkflowTables(supabase: any) {
    const { error } = await supabase.from('finance_workflow_approvals').select('id').limit(1);
    return !error;
  }

  async getWorkspaceSummary(orgId: string): Promise<FinanceGovernanceWorkspaceSummary> {
    const approvals = await this.getApprovals(orgId);
    const pendingApprovals = approvals.filter(
      (item) => !['approved', 'rejected'].includes(item.status.toLowerCase())
    ).length;
    const openExceptions = approvals.filter((item) =>
      item.status.toLowerCase().includes('exception')
    ).length;

    const supabase = getSupabaseAdmin() as any;
    const { data: events } = await supabase
      .from('finance_workflow_action_events')
      .select('id')
      .eq('org_id', orgId)
      .eq('action', 'submit');

    return {
      workspace: 'Finance Governance Workspace',
      counts: {
        pendingApprovals,
        openExceptions,
        readyExports: Array.isArray(events) ? events.length : 0,
      },
      quickLinks: [
        { href: '/finance-governance/app/onboarding', label: 'Onboarding template' },
        { href: '/finance-governance/app/approvals', label: 'Approval queue' },
      ],
    };
  }

  async getApprovals(orgId: string): Promise<FinanceGovernanceApprovalItem[]> {
    const supabase = getSupabaseAdmin() as any;

    if (await this.hasControlLayerTables(supabase)) {
      const { data, error } = await supabase
        .from('finance_approval_requests')
        .select('id,status,risk,finance_transactions(vendor,amount)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        return data.map((row: any) => ({
          id: row.id,
          vendor: row.finance_transactions?.vendor ?? 'Unknown vendor',
          amount: `US$${row.finance_transactions?.amount ?? '0'}`,
          status: row.status,
          risk: row.risk ?? 'N/A',
        }));
      }
    }

    const { data, error } = await supabase
      .from('finance_workflow_approvals')
      .select('id,vendor,amount,status,risk')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`failed_to_read_approvals:${error.message}`);
    }

    return (data ?? []) as FinanceGovernanceApprovalItem[];
  }

  async getCaseDetail(orgId: string, id: string): Promise<FinanceGovernanceCaseDetail> {
    const supabase = getSupabaseAdmin() as any;

    if (await this.hasControlLayerTables(supabase)) {
      const mapping = await this.resolveApprovalMapping(orgId, id, supabase);
      const transactionId = mapping?.transactionId ?? id;
      const { data: row, error } = await supabase
        .from('finance_transactions')
        .select('id,status,vendor,amount,currency')
        .eq('org_id', orgId)
        .eq('id', transactionId)
        .maybeSingle();

      if (!error && row) {
        const approvalRequestId = mapping?.approvalId ?? await this.resolveApprovalRequestId(orgId, row.id, supabase);
        const { data: decisions } = await supabase
          .from('finance_approval_decisions')
          .select('decision,reason')
          .eq('org_id', orgId)
          .eq('approval_request_id', approvalRequestId ?? id)
          .order('created_at', { ascending: true });

        return {
          id: row.id,
          status: row.status,
          exportStatus: 'Ready',
          transaction: {
            vendor: row.vendor,
            amount: String(row.amount),
            currency: row.currency,
            workflow: 'Finance governance control layer',
          },
          timeline: (decisions ?? []).map((item: { decision: string; reason: string }) => `${item.decision}: ${item.reason ?? ''}`),
        };
      }
    }

    const { data: row, error } = await supabase
      .from('finance_workflow_cases')
      .select('id,status,export_status,vendor,amount,currency,workflow')
      .eq('org_id', orgId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`failed_to_read_case:${error.message}`);
    }

    if (!row) {
      throw new Error('case_not_found');
    }

    const { data: events } = await supabase
      .from('finance_workflow_action_events')
      .select('action,message')
      .eq('org_id', orgId)
      .eq('case_id', id)
      .order('created_at', { ascending: true });

    return {
      id: row.id,
      status: row.status,
      exportStatus: row.export_status,
      transaction: {
        vendor: row.vendor,
        amount: String(row.amount),
        currency: row.currency,
        workflow: row.workflow,
      },
      timeline: (events ?? []).map((item: { action: string; message: string }) => `${item.action}: ${item.message}`),
    };
  }

  async getDecisions(orgId: string, caseOrApprovalId: string) {
    const supabase = getSupabaseAdmin() as any;

    if (await this.hasControlLayerTables(supabase)) {
      const approvalId = await this.resolveApprovalReference(orgId, caseOrApprovalId, supabase);
      const { data, error } = await supabase
        .from('finance_approval_decisions')
        .select('id,decision,reason,actor,created_at')
        .eq('org_id', orgId)
        .eq('approval_request_id', approvalId)
        .order('created_at', { ascending: true });
      if (!error) return data ?? [];
    }

    const { data } = await supabase
      .from('finance_workflow_action_events')
      .select('id,action,message,actor,created_at')
      .eq('org_id', orgId)
      .eq('approval_id', caseOrApprovalId)
      .order('created_at', { ascending: true });

    return (data ?? []).map((item: any) => ({
      id: item.id,
      decision: item.action,
      reason: item.message,
      actor: item.actor ?? 'api',
      created_at: item.created_at,
    }));
  }

  async getExceptions(orgId: string, caseOrApprovalId: string) {
    const supabase = getSupabaseAdmin() as any;

    if (await this.hasControlLayerTables(supabase)) {
      const approvalId = await this.resolveApprovalReference(orgId, caseOrApprovalId, supabase);
      const { data, error } = await supabase
        .from('finance_exceptions')
        .select('id,status,reason,created_at,resolved_at')
        .eq('org_id', orgId)
        .eq('approval_request_id', approvalId)
        .order('created_at', { ascending: false });
      if (!error) return data ?? [];
    }

    return [];
  }

  async getEvidenceBundles(orgId: string, caseOrApprovalId: string) {
    const supabase = getSupabaseAdmin() as any;

    if (await this.hasControlLayerTables(supabase)) {
      const approvalId = await this.resolveApprovalReference(orgId, caseOrApprovalId, supabase);
      const { data, error } = await supabase
        .from('finance_evidence_bundles')
        .select('id,status,uri,created_at')
        .eq('org_id', orgId)
        .eq('approval_request_id', approvalId)
        .order('created_at', { ascending: false });
      if (!error) return data ?? [];
    }

    return [];
  }

  async submit(orgId: string, caseId: string): Promise<FinanceGovernanceActionResult> {
    const result = buildSubmitResult(caseId);
    await this.writeAction(orgId, result, caseId, null);
    return result;
  }

  async applyAction(
    orgId: string,
    approvalId: string,
    action: Extract<FinanceGovernanceActionName, 'approve' | 'reject' | 'escalate'>
  ) {
    const result = buildApprovalActionResult(action, approvalId);
    const supabase = getSupabaseAdmin() as any;
    const useControlLayer = await this.hasControlLayerTables(supabase);

    if (useControlLayer) {
      const mapping = await this.resolveApprovalMapping(orgId, approvalId, supabase);
      if (!mapping) {
        throw new Error('approval_not_found');
      }

      const now = new Date().toISOString();
      await supabase.from('finance_approval_decisions').insert({
        org_id: orgId,
        approval_request_id: mapping.approvalId,
        decision: action,
        reason: result.message,
        actor: 'api',
        metadata: result,
        created_at: now,
      });

      await supabase
        .from('finance_approval_requests')
        .update({ status: result.nextStatus, updated_at: now })
        .eq('org_id', orgId)
        .eq('id', mapping.approvalId);

      await supabase
        .from('finance_transactions')
        .update({ status: result.nextStatus, updated_at: now })
        .eq('org_id', orgId)
        .eq('id', mapping.transactionId);

      if (action === 'escalate') {
        await supabase.from('finance_exceptions').insert({
          org_id: orgId,
          approval_request_id: mapping.approvalId,
          status: 'open',
          reason: result.message,
        });
      }

      if (action === 'approve' && await this.canCreateFinalEvidenceBundle(orgId, mapping.approvalId, supabase)) {
        await supabase.from('finance_evidence_bundles').insert({
          org_id: orgId,
          approval_request_id: mapping.approvalId,
          status: 'ready',
          uri: `evidence://${mapping.approvalId}`,
        });
      }
    }

    let legacyApprovalCaseId: string | null = null;
    if (await this.hasLegacyWorkflowTables(supabase)) {
      const { data: approval } = await supabase
        .from('finance_workflow_approvals')
        .select('case_id')
        .eq('org_id', orgId)
        .eq('id', approvalId)
        .maybeSingle();
      legacyApprovalCaseId = approval?.case_id ?? null;

      const { error } = await supabase
        .from('finance_workflow_approvals')
        .update({ status: result.nextStatus, updated_at: new Date().toISOString() })
        .eq('org_id', orgId)
        .eq('id', approvalId);

      if (error) {
        throw new Error(`failed_to_update_approval:${error.message}`);
      }
    }

    await this.writeAction(orgId, result, legacyApprovalCaseId, approvalId);
    return result;
  }

  private async writeAction(
    orgId: string,
    result: FinanceGovernanceActionResult,
    caseId: string | null,
    approvalId: string | null
  ) {
    const supabase = getSupabaseAdmin() as any;

    if (caseId) {
      const { data: existingCase, error: caseReadError } = await supabase
        .from('finance_workflow_cases')
        .select('id')
        .eq('org_id', orgId)
        .eq('id', caseId)
        .maybeSingle();

      if (caseReadError) {
        throw new Error(`failed_to_read_case:${caseReadError.message}`);
      }

      if (!existingCase) {
        throw new Error('case_not_found');
      }

      const { error: caseUpdateError } = await supabase
        .from('finance_workflow_cases')
        .update({
          status: result.nextStatus,
          export_status: result.action === 'submit' ? 'Ready' : 'In review',
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)
        .eq('id', caseId);

      if (caseUpdateError) {
        throw new Error(`failed_to_update_case:${caseUpdateError.message}`);
      }
    }

    const { error } = await supabase.from('finance_workflow_action_events').insert({
      org_id: orgId,
      case_id: caseId,
      approval_id: approvalId,
      action: result.action,
      actor: 'api',
      result: result.ok ? 'ok' : 'error',
      target: approvalId ?? caseId,
      message: result.message,
      next_status: result.nextStatus,
      payload: result,
    });

    if (error) {
      throw new Error(`failed_to_write_action:${error.message}`);
    }
  }

  private async resolveApprovalReference(orgId: string, id: string, supabase: any): Promise<string> {
    const mapping = await this.resolveApprovalMapping(orgId, id, supabase);
    if (!mapping) {
      throw new Error('approval_not_found');
    }
    return mapping.approvalId;
  }

  private async resolveApprovalRequestId(orgId: string, transactionId: string, supabase: any): Promise<string | null> {
    const { data } = await supabase
      .from('finance_approval_requests')
      .select('id')
      .eq('org_id', orgId)
      .eq('transaction_id', transactionId)
      .maybeSingle();
    return data?.id ?? null;
  }

  private async resolveApprovalMapping(orgId: string, id: string, supabase: any): Promise<{ approvalId: string; transactionId: string } | null> {
    const { data: direct } = await supabase
      .from('finance_approval_requests')
      .select('id,transaction_id')
      .eq('org_id', orgId)
      .eq('id', id)
      .maybeSingle();

    if (direct?.id && direct?.transaction_id) {
      return { approvalId: direct.id, transactionId: direct.transaction_id };
    }

    const { data: byTransaction } = await supabase
      .from('finance_approval_requests')
      .select('id,transaction_id')
      .eq('org_id', orgId)
      .eq('transaction_id', id)
      .maybeSingle();

    if (byTransaction?.id && byTransaction?.transaction_id) {
      return { approvalId: byTransaction.id, transactionId: byTransaction.transaction_id };
    }

    const { data: byWorkflowCase } = await supabase
      .from('finance_transactions')
      .select('id')
      .eq('org_id', orgId)
      .eq('workflow_case_id', id)
      .maybeSingle();

    if (!byWorkflowCase?.id) {
      return null;
    }

    const { data: byCaseTransaction } = await supabase
      .from('finance_approval_requests')
      .select('id,transaction_id')
      .eq('org_id', orgId)
      .eq('transaction_id', byWorkflowCase.id)
      .maybeSingle();

    if (byCaseTransaction?.id && byCaseTransaction?.transaction_id) {
      return { approvalId: byCaseTransaction.id, transactionId: byCaseTransaction.transaction_id };
    }

    return null;
  }

  private async canCreateFinalEvidenceBundle(orgId: string, approvalId: string, supabase: any): Promise<boolean> {
    const { data: steps, error } = await supabase
      .from('finance_approval_steps')
      .select('status')
      .eq('org_id', orgId)
      .eq('approval_request_id', approvalId);

    if (error || !Array.isArray(steps) || steps.length === 0) {
      return false;
    }

    return steps.every((step: { status: string }) => step.status === 'approved');
  }
}
