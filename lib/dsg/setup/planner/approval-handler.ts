/**
 * Approval Handler
 * Manages plan approval workflow using canonical hashing
 */

import { canonicalHash } from '@/lib/runtime/canonical';
import type { ProvisionPlan, ProvisionApprovalRequest } from '../types';
import type { ApprovalContext, ApprovalResult } from './types';

export interface ProvisionApprovalRequest {
  approval_id: string;
  plan_id: string;
  org_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  canonical_plan_hash: string;
  approved_by?: string;
  approved_at?: Date;
  expires_at: Date;
  created_at: Date;
}

export class ApprovalHandler {
  /**
   * Create an approval request for a plan (5 min TTL)
   */
  createApprovalRequest(plan: ProvisionPlan): ProvisionApprovalRequest {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    return {
      approval_id: crypto.randomUUID(),
      plan_id: plan.id,
      org_id: plan.org_id,
      status: 'pending',
      canonical_plan_hash: plan.canonical_plan_hash,
      expires_at: expiresAt,
      created_at: now,
    };
  }

  /**
   * Approve a plan with hash verification (tamper detection)
   */
  approvePlan(
    approval: ProvisionApprovalRequest,
    userProvidedHash: string,
    approvedBy: string,
  ): ApprovalResult {
    // Verify approval not expired
    if (new Date() > approval.expires_at) {
      return {
        approval_id: approval.approval_id,
        plan_id: approval.plan_id,
        org_id: approval.org_id,
        approved_at: new Date(),
        approved_by: approvedBy,
        canonical_plan_hash: approval.canonical_plan_hash,
        valid: false,
      };
    }

    // Verify hash matches (tamper detection)
    if (userProvidedHash !== approval.canonical_plan_hash) {
      console.warn(`[approval] Hash mismatch for plan ${approval.plan_id}`);
      return {
        approval_id: approval.approval_id,
        plan_id: approval.plan_id,
        org_id: approval.org_id,
        approved_at: new Date(),
        approved_by: approvedBy,
        canonical_plan_hash: approval.canonical_plan_hash,
        valid: false,
      };
    }

    // Approval valid
    return {
      approval_id: approval.approval_id,
      plan_id: approval.plan_id,
      org_id: approval.org_id,
      approved_at: new Date(),
      approved_by: approvedBy,
      canonical_plan_hash: approval.canonical_plan_hash,
      valid: true,
    };
  }

  /**
   * Verify approval before execution
   */
  verifyApprovalForExecution(approval: ProvisionApprovalRequest): {
    valid: boolean;
    error?: string;
  } {
    if (new Date() > approval.expires_at) {
      return { valid: false, error: 'Approval expired' };
    }

    if (approval.status !== 'approved') {
      return { valid: false, error: `Approval status is ${approval.status}` };
    }

    if (!approval.approved_by || !approval.approved_at) {
      return { valid: false, error: 'Approval incomplete' };
    }

    return { valid: true };
  }

  /**
   * Mark approval as rejected (immutable)
   */
  rejectApproval(approval: ProvisionApprovalRequest, reason: string): ProvisionApprovalRequest {
    console.info(`[approval] Rejecting approval ${approval.approval_id}: ${reason}`);
    return {
      ...approval,
      status: 'rejected',
    };
  }
}

export const approvalHandler = new ApprovalHandler();
