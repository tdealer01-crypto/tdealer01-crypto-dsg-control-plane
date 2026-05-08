import { getSupabaseAdmin } from '../supabase-server';

export type GovernanceDecisionAction = 'evaluate' | 'approve' | 'reject' | 'pause' | 'resume' | 'rollback';
export type GovernanceDecision = 'PASS' | 'REVIEW' | 'BLOCK' | 'UNSUPPORTED';

export interface GovernanceDecisionEvent {
  orgId: string;
  decisionId: string;
  gateId?: string;
  decision?: GovernanceDecision;
  action: GovernanceDecisionAction;
  approvedBy?: string; // User ID (from session, NOT from body)
  approvedAt?: string; // ISO timestamp
  reason?: string;
}

/**
 * Record a governance decision event to append-only ledger.
 * 
 * @param event - Governance decision event with org_id, decision_id, action, etc.
 * @returns true if recorded successfully, false otherwise
 * 
 * IMPORTANT:
 * - approvedBy must be derived from session/auth, never from request body
 * - orgId must be from session context, never trusted from parameters
 * - This is a server-only function; verify auth before calling
 */
export async function recordGovernanceDecisionEvent(event: GovernanceDecisionEvent): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from('dsg_governance_decision_events')
      .insert({
        org_id: event.orgId,
        decision_id: event.decisionId,
        gate_id: event.gateId || null,
        decision: event.decision || null,
        action: event.action,
        approved_by: event.approvedBy || null,
        approved_at: event.approvedAt || null,
        reason: event.reason || null,
      });

    if (error) {
      console.error(
        'recordGovernanceDecisionEvent failed:',
        error.message,
        { orgId: event.orgId, decisionId: event.decisionId, action: event.action }
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error('recordGovernanceDecisionEvent threw:', err);
    return false;
  }
}

/**
 * List governance decision events for an organization.
 * 
 * @param orgId - Organization ID (must be from auth context)
 * @param limit - Max results (default 100)
 * @returns Array of decision events, newest first
 */
export async function listGovernanceDecisionEvents(
  orgId: string,
  limit: number = 100
) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('dsg_governance_decision_events')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('listGovernanceDecisionEvents failed:', error.message, { orgId });
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('listGovernanceDecisionEvents threw:', err);
    return [];
  }
}

/**
 * Get a specific decision event by decisionId (org-scoped).
 * 
 * @param orgId - Organization ID (from auth context)
 * @param decisionId - Decision ID to lookup
 * @returns Decision event or null
 */
export async function getGovernanceDecisionEvent(
  orgId: string,
  decisionId: string
) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('dsg_governance_decision_events')
      .select('*')
      .eq('org_id', orgId)
      .eq('decision_id', decisionId)
      .maybeSingle();

    if (error) {
      console.error('getGovernanceDecisionEvent failed:', error.message, { orgId, decisionId });
      return null;
    }

    return data || null;
  } catch (err) {
    console.error('getGovernanceDecisionEvent threw:', err);
    return null;
  }
}
