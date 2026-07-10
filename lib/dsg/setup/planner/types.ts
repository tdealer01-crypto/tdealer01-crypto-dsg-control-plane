import type { Phase } from '../resolver';

export interface PlanItem {
  id: string;
  provider: string;
  action: string;
  params?: Record<string, unknown>;
  estimated_seconds?: number;
  provides?: Record<string, unknown>;
  requires?: Record<string, unknown>;
}

export interface ProvisionPlanDefinition {
  phases: Phase[];
  total_estimated_seconds: number;
  canonical_plan_hash: string;
}

export interface ApprovalContext {
  plan_id: string;
  org_id: string;
  user_id: string;
  canonical_plan_hash: string;
  timestamp: Date;
}

export interface ApprovalResult {
  approval_id: string;
  plan_id: string;
  org_id: string;
  approved_at: Date;
  approved_by: string;
  canonical_plan_hash: string;
  valid: boolean;
}
