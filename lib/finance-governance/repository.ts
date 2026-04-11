import { buildApprovalActionResult, buildSubmitResult, type FinanceGovernanceActionName, type FinanceGovernanceActionResult } from './actions';
import type { FinanceGovernanceApprovalItem, FinanceGovernanceCaseDetail, FinanceGovernanceWorkspaceSummary } from './mock-data';
import { getSupabaseAdmin } from '../supabase-server';

const DEFAULT_APPROVALS: FinanceGovernanceApprovalItem[] = [
  { id: 'APR-1001', vendor: 'Northwind Supply', amount: 'US$14,250', status: 'Needs approver', risk: 'Threshold exceeded' },
  { id: 'APR-1002', vendor: 'Contoso Services', amount: 'US$2,480', status: 'Exception open', risk: 'Missing document' },
  { id: 'APR-1003', vendor: 'Blue Ocean Partners', amount: 'US$31,900', status: 'Compliance review', risk: 'High-risk vendor' },
];

async function ensureSeedData(orgId: string) {
  const supabase = getSupabaseAdmin() as any;
  const { data: existing } = await supabase
    .from('finance_workflow_approvals')
    .select('id')
    .eq('org_id', orgId)
    .limit(1);

  if (Array.isArray(existing) && existing.length > 0) {
    return;
  }

  await supabase.from('finance_workflow_cases').upsert({
    id: 'sample-case',
    org_id: orgId,
    status: 'compliance_review',
    export_status: 'Ready',
    vendor: 'Northwind Supply',
    amount: 14250,
    currency: 'USD',
    workflow: 'Invoice approval governance',
  });

  await supabase.from('finance_workflow_approvals').upsert(
    DEFAULT_APPROVALS.map((item) => ({
      id: item.id,
      org_id: orgId,
      case_id: 'sample-case',
      vendor: item.vendor,
      amount: item.amount,
      status: item.status,
      risk: item.risk,
    }))
  );
}

export class FinanceGovernanceRepository {
  async getWorkspaceSummary(orgId: string): Promise<FinanceGovernanceWorkspaceSummary> {
    await ensureSeedData(orgId);
    const approvals = await this.getApprovals(orgId);
    const pendingApprovals = approvals.filter((item) => !['approved', 'rejected'].includes(item.status.toLowerCase())).length;
    const openExceptions = approvals.filter((item) => item.status.toLowerCase().includes('exception')).length;

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
        { href: '/finance-governance/app/cases/sample-case', label: 'Sample case detail' },
      ],
    };
  }

  async getApprovals(orgId: string): Promise<FinanceGovernanceApprovalItem[]> {
    await ensureSeedData(orgId);
    const supabase = getSupabaseAdmin() as any;
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
    await ensureSeedData(orgId);
    const supabase = getSupabaseAdmin() as any;
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

  async submit(orgId: string, caseId: string): Promise<FinanceGovernanceActionResult> {
    const result = buildSubmitResult(caseId);
    await this.writeAction(orgId, result, caseId, null);
    return result;
  }

  async applyAction(orgId: string, approvalId: string, action: Extract<FinanceGovernanceActionName, 'approve' | 'reject' | 'escalate'>) {
    const result = buildApprovalActionResult(action, approvalId);
    const supabase = getSupabaseAdmin() as any;

    const { data: approval } = await supabase
      .from('finance_workflow_approvals')
      .select('case_id')
      .eq('org_id', orgId)
      .eq('id', approvalId)
      .maybeSingle();

    const { error } = await supabase
      .from('finance_workflow_approvals')
      .update({ status: result.nextStatus, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
      .eq('id', approvalId);

    if (error) {
      throw new Error(`failed_to_update_approval:${error.message}`);
    }

    await this.writeAction(orgId, result, approval?.case_id ?? null, approvalId);
    return result;
  }

  private async writeAction(orgId: string, result: FinanceGovernanceActionResult, caseId: string | null, approvalId: string | null) {
    const supabase = getSupabaseAdmin() as any;

    if (caseId) {
      await supabase.from('finance_workflow_cases').upsert({
        id: caseId,
        org_id: orgId,
        status: result.nextStatus,
        export_status: result.action === 'submit' ? 'Ready' : 'In review',
        vendor: 'Northwind Supply',
        amount: 14250,
        currency: 'USD',
        workflow: 'Invoice approval governance',
        updated_at: new Date().toISOString(),
      });
    }

    const { error } = await supabase.from('finance_workflow_action_events').insert({
      org_id: orgId,
      case_id: caseId,
      approval_id: approvalId,
      action: result.action,
      message: result.message,
      next_status: result.nextStatus,
      payload: result,
    });

    if (error) {
      throw new Error(`failed_to_write_action:${error.message}`);
    }
  }
}
