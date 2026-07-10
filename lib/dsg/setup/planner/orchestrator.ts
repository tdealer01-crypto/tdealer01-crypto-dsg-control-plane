/**
 * Provision Orchestrator
 * Coordinates discovery → planning → approval workflow
 */

import { DiscoveryAnalyzer } from '../discovery/analyzer';
import { dependencyResolver } from '../resolver';
import { planGenerator } from './plan-generator';
import { approvalHandler } from './approval-handler';
import type { ProvisionPlan, ProvisionApprovalRequest, SuggestedProvider } from '../types';

interface ProjectFiles {
  packageJson?: string;
  dockerCompose?: string;
  dockerfile?: string;
  envExample?: string;
  workflows?: string[];
}

interface OrchestrateOptions {
  projectName: string;
  githubUrl?: string;
  files: ProjectFiles;
  discoveryMode?: 'heuristic' | 'ai' | 'both';
  selectedProviders?: SuggestedProvider[];
}

/**
 * Full orchestration: discovery → plan → approval ready
 */
export class ProvisionOrchestrator {
  private discoveryAnalyzer = new DiscoveryAnalyzer();

  /**
   * Analyze project and build provision plan (no approval yet)
   */
  async orchestrate(
    orgId: string,
    userId: string,
    options: OrchestrateOptions,
  ): Promise<{
    plan: ProvisionPlan;
    approval: ProvisionApprovalRequest;
  }> {
    // 1. Discover services and providers
    const analysis = await this.discoveryAnalyzer.analyzeProject(
      options.projectName,
      options.githubUrl,
      options.files,
      options.discoveryMode || 'heuristic',
    );

    // Override with selected providers if provided
    const suggestedProviders = options.selectedProviders || analysis.suggested_providers;

    // 2. Build provision plan
    const plan = planGenerator.generatePlan(orgId, analysis.id, suggestedProviders);

    // 3. Validate plan is executable
    const validation = planGenerator.validatePlan(plan);
    if (!validation.valid) {
      throw new Error(`Plan validation failed: ${validation.errors.join(', ')}`);
    }

    // 4. Create approval request (5 min TTL, not yet approved)
    const approval = approvalHandler.createApprovalRequest(plan);

    return { plan, approval };
  }

  /**
   * Verify user approval (hash match + expiry check)
   */
  verifyApproval(
    approval: ProvisionApprovalRequest,
    userProvidedHash: string,
    approvedBy: string,
  ): {
    valid: boolean;
    approval: ProvisionApprovalRequest | null;
    error?: string;
  } {
    const result = approvalHandler.approvePlan(approval, userProvidedHash, approvedBy);

    if (!result.valid) {
      return {
        valid: false,
        approval: null,
        error: 'Approval hash mismatch or expired',
      };
    }

    // Update approval status to 'approved'
    const updatedApproval: ProvisionApprovalRequest = {
      ...approval,
      status: 'approved',
      approved_by: result.approved_by,
      approved_at: result.approved_at,
    };

    return {
      valid: true,
      approval: updatedApproval,
    };
  }

  /**
   * Verify approval can be used for execution
   */
  canExecuteApproval(approval: ProvisionApprovalRequest): {
    can_execute: boolean;
    error?: string;
  } {
    const result = approvalHandler.verifyApprovalForExecution(approval);
    return {
      can_execute: result.valid,
      error: result.error,
    };
  }
}

export const provisionOrchestrator = new ProvisionOrchestrator();
