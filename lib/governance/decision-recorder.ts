import { getSupabaseAdmin } from '../supabase-server';

export type GovernanceDecisionAction = 'evaluate' | 'approve' | 'reject' | 'pause' | 'resume' | 'rollback';
export type GovernanceDecision = 'PASS' | 'REVIEW' | 'BLOCK' | 'UNSUPPORTED';

export interface GovernanceDecisionEvent {
  orgId: string;
  decisionId: string;
  gateId?: string;
  decision?: GovernanceDecision;
  action: GovernanceDecisionAction;
  actorId: string;
  actorRole?: string;
  actionAt?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export async function recordGovernanceDecisionEvent(event: GovernanceDecisionEvent): Promise<boolean> {
  try {
    if (!event.orgId || !event.decisionId || !event.action || !event.actorId) {
      return false;
    }

    const supabase = getSupabaseAdmin() as any;
    const { error } = await supabase.from('dsg_governance_decision_events').insert({
      org_id: event.orgId,
      decision_id: event.decisionId,
      gate_id: event.gateId || null,
      decision: event.decision || null,
      action: event.action,
      actor_id: event.actorId,
      actor_role: event.actorRole || null,
      action_at: event.actionAt || new Date().toISOString(),
      reason: event.reason || null,
      metadata: event.metadata || {},
    });

    if (error) {
      console.error('recordGovernanceDecisionEvent failed:', error.message, {
        orgId: event.orgId,
        decisionId: event.decisionId,
        action: event.action,
      });
      return false;
    }

    return true;
  } catch (err) {
    console.error('recordGovernanceDecisionEvent threw:', err);
    return false;
  }
}

export async function listGovernanceDecisionEvents(orgId: string, limit: number = 100) {
  try {
    const supabase = getSupabaseAdmin() as any;
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

export async function getGovernanceDecisionEvent(orgId: string, decisionId: string) {
  try {
    const supabase = getSupabaseAdmin() as any;
    const { data, error } = await supabase
      .from('dsg_governance_decision_events')
      .select('*')
      .eq('org_id', orgId)
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: false })
      .limit(1)
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
