import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../../../lib/finance-governance/api-error';
import { requireFinanceGovernanceAccess } from '../../../../../../lib/finance-governance/access-gate';
import { FinanceGovernanceRepository } from '../../../../../../lib/finance-governance/repository';
import { resolveOrgId } from '../../../../../../lib/finance-governance/org-scope';
import { fireFinanceWebhook } from '../../../../../../lib/finance-governance/webhook-delivery';
import { captureEvent } from '../../../../../../lib/telemetry/capture-event';
import { createClient } from '../../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const orgId = resolveOrgId(request);
    requireFinanceGovernanceAccess(request, orgId, 'approve');
    const { id } = await context.params;

    // Get current user for telemetry
    let userId = 'unknown';
    const startTime = Date.now();
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || 'unknown';
    } catch {
      // Continue without user ID
    }

    const result = await repository.applyAction(orgId, id, 'approve');
    void fireFinanceWebhook(orgId, 'finance.approval.approved', {
      approval_id: id,
      next_status: typeof result === 'object' && result !== null && 'nextStatus' in result ? String((result as Record<string, unknown>).nextStatus) : 'approved',
    });

    // Capture approval_completed event
    const approvalTurnaroundMs = Date.now() - startTime;
    void captureEvent('approval_completed', {
      userId,
      organizationId: orgId,
    }, {
      organization_id: orgId,
      execution_id: id,
      approval_decision: 'approved',
      approver_user_id: userId,
      approval_turnaround_ms: approvalTurnaroundMs,
    }).catch((error) => {
      console.error('[approval-approve] Failed to capture event:', error);
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
