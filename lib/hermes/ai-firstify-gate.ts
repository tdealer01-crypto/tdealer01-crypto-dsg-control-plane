/**
 * AI-Firstify Governance Gate for Hermes
 *
 * Integrates AI-Firstify policy evaluation into Hermes execution flow.
 * Evaluates all Hermes actions against governance policies before execution.
 */

import { getSupabaseClient } from '@/packages/ai-firstify-plugin/src/lib/supabase-client';

export type GovernanceDecision = 'ALLOW' | 'REVIEW' | 'BLOCK';

export interface GovernanceResult {
  decision: GovernanceDecision;
  reason: string;
  policyIds: string[];
  proofReference?: string;
  requiresApproval: boolean;
}

/**
 * Evaluate a Hermes action against AI-Firstify policies
 */
export async function evaluateHermesGovernance(
  orgId: string,
  action: 'deploy' | 'edit_code' | 'run_test' | 'answer',
  context: {
    modelId?: string;
    message: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    environment?: string;
  }
): Promise<GovernanceResult> {
  try {
    const supabase = getSupabaseClient();

    // Get applicable policies for this action
    const { data: policies, error } = await supabase
      .from('ai_policies')
      .select('id, rules, risk_level, enabled')
      .eq('org_id', orgId)
      .eq('enabled', true);

    if (error) {
      console.error('Failed to fetch policies:', error);
      return {
        decision: 'REVIEW',
        reason: 'Policy evaluation unavailable - manual review required',
        policyIds: [],
        requiresApproval: true,
      };
    }

    if (!policies || policies.length === 0) {
      return {
        decision: 'ALLOW',
        reason: 'No governance policies configured',
        policyIds: [],
        requiresApproval: false,
      };
    }

    // Evaluate against each policy
    const matchedPolicies: Array<{
      id: string;
      decision: GovernanceDecision;
      rules: any[];
      riskLevel: string;
    }> = [];

    for (const policy of policies) {
      const rules = Array.isArray(policy.rules) ? (policy.rules as any[]) : [];

      for (const rule of rules as any[]) {
        // Simple rule evaluation: check action type and risk level
        const actionMatch = !rule.applies_to_actions ||
                           rule.applies_to_actions.length === 0 ||
                           rule.applies_to_actions.includes(action);

        const riskMatch = !rule.risk_level ||
                         isRiskLevelExceeded(context.riskLevel || 'medium', rule.risk_level as string);

        if (actionMatch && riskMatch) {
          matchedPolicies.push({
            id: policy.id as string,
            decision: (rule.action || 'REVIEW') as GovernanceDecision,
            rules: rules,
            riskLevel: policy.risk_level as string,
          });

          // Log governance evaluation
          await logGovernanceEvaluation(supabase, {
            orgId,
            policyId: policy.id as string,
            action,
            context,
            decision: (rule.action || 'REVIEW') as string,
          });
        }
      }
    }

    // Determine final decision: BLOCK takes precedence, then REVIEW, then ALLOW
    let finalDecision: GovernanceDecision = 'ALLOW';
    let requiresApproval = false;

    for (const matched of matchedPolicies) {
      if (matched.decision === 'BLOCK') {
        finalDecision = 'BLOCK';
        requiresApproval = true;
        break;
      }
      if (matched.decision === 'REVIEW') {
        finalDecision = 'REVIEW';
        requiresApproval = true;
      }
    }

    const policyIds = matchedPolicies.map((p) => p.id);

    const reasonMap: Record<GovernanceDecision, string> = {
      ALLOW: 'Action approved by governance policies',
      REVIEW: 'Action requires manual review',
      BLOCK: 'Action blocked by governance policy',
    };

    return {
      decision: finalDecision,
      reason: reasonMap[finalDecision],
      policyIds,
      requiresApproval,
    };
  } catch (error) {
    console.error('Governance evaluation error:', error);
    return {
      decision: 'REVIEW',
      reason: 'Governance evaluation error - manual review required',
      policyIds: [],
      requiresApproval: true,
    };
  }
}

/**
 * Check if action risk exceeds policy threshold
 */
function isRiskLevelExceeded(
  contextRisk: string,
  policyRisk: string
): boolean {
  const riskOrder = { low: 1, medium: 2, high: 3, critical: 4 };
  const contextScore = riskOrder[contextRisk as keyof typeof riskOrder] || 0;
  const policyScore = riskOrder[policyRisk as keyof typeof riskOrder] || 0;
  return contextScore >= policyScore;
}

/**
 * Log governance evaluation to audit trail
 */
async function logGovernanceEvaluation(
  supabase: ReturnType<typeof getSupabaseClient>,
  data: {
    orgId: string;
    policyId: string;
    action: string;
    context: any;
    decision: string;
  }
) {
  try {
    await supabase.from('ai_audit_logs').insert({
      org_id: data.orgId,
      event_type: 'governance_evaluation',
      resource_type: 'hermes_action',
      resource_id: data.action,
      action: 'evaluate',
      decision: data.decision,
      decision_reason: `Hermes ${data.action} action evaluated`,
      policy_id: data.policyId,
      actor_type: 'system',
      execution_details: data.context,
    });
  } catch (error) {
    console.error('Failed to log governance evaluation:', error);
  }
}

/**
 * Format governance decision for UI display (Thai)
 */
export function formatGovernanceDecision(result: GovernanceResult): string {
  const decisionMap: Record<GovernanceDecision, string> = {
    ALLOW: '✅ อนุมัติ - สามารถดำเนินการได้',
    REVIEW: '⚠️ รอการตรวจสอบ - ต้องการการอนุมัติด้วยตนเอง',
    BLOCK: '🚫 ถูกบล็อก - ไม่อนุญาตตามนโยบาย',
  };

  return decisionMap[result.decision];
}
