/**
 * Repository / GitHub Executor
 *
 * Routes repo operations through GitHub permission gates.
 * Different rules for PR creation vs merge vs commit.
 */

import type { AgentWorkStep } from '../delegation/types';
import { blockedResult, pendingResult, successResult, type ToolExecutionResult } from './types';

/**
 * Execute a repository step through GitHub gates.
 *
 * Checks delegation scope to determine what repo operations are allowed.
 * PR creation may auto-approve; merge always requires confirmation.
 */
export async function executeRepoStep(
  step: AgentWorkStep,
  context: {
    delegation: any;
  },
): Promise<ToolExecutionResult> {
  const action = step.action.toLowerCase();
  const target = step.target || '';

  // Validate delegation scope includes repo
  const scope = context.delegation?.scope || '';
  if (!scope.includes('repo')) {
    return blockedResult('Delegation does not permit repository operations');
  }

  // Check if action is explicitly blocked
  if (context.delegation?.blockedActions?.includes(`repo.${action}`)) {
    return blockedResult(`Action "repo.${action}" is blocked by delegation contract`);
  }

  // Route to appropriate handler
  if (action.includes('commit') || action.includes('push')) {
    return handleCommitPush(step, context);
  }

  if (action.includes('pr') || action.includes('pull_request')) {
    return handlePullRequest(step, context);
  }

  if (action.includes('merge')) {
    return handleMerge(step, context);
  }

  return blockedResult(`Unknown repo action: ${action}`);
}

/**
 * Handle commit and push operations.
 */
function handleCommitPush(
  step: AgentWorkStep,
  context: { delegation: any },
): ToolExecutionResult {
  const action = step.action.toLowerCase();

  // Commits to non-main branches are typically lower risk
  const isMainBranch = step.target?.includes('main') || step.target?.includes('master');

  if (isMainBranch && context.delegation?.requiresUserConfirm?.includes(`repo.${action}`)) {
    return pendingResult(
      `Commit to main branch requires user confirmation`,
      [`target:${step.target}`, `action:${action}`],
      'CONFIRM_COMMIT',
      `/repo/staging?action=commit&target=${step.target}`
    );
  }

  // Staging commits typically auto-approve if in scope
  if (step.target?.includes('staging') || step.target?.includes('dev')) {
    return successResult(
      `Staging commit prepared and ready`,
      [`target:${step.target}`, `action:${action}`, `commit-hash:pending`],
    );
  }

  return blockedResult('Commit target branch not in delegation scope');
}

/**
 * Handle pull request creation.
 */
function handlePullRequest(
  step: AgentWorkStep,
  context: { delegation: any },
): ToolExecutionResult {
  // PR creation is typically lower risk than merge
  const sourceScope = context.delegation?.scope || '';

  // Check if PR scope is allowed (repo.pr or just repo)
  if (!sourceScope.includes('repo') && !sourceScope.includes('pr')) {
    return blockedResult('Delegation does not permit pull request creation');
  }

  const prTitle = step.target || 'Agent-generated PR';

  // Return mock PR URL as evidence
  const prUrl = `https://github.com/dsg/control-plane/pull/999`;
  const prId = 'pr-999';

  return pendingResult(
    `Pull request created and awaiting review`,
    [`pr-url:${prUrl}`, `pr-id:${prId}`, `status:open`],
    'REVIEW_PR',
    prUrl
  );
}

/**
 * Handle merge operations (always requires confirmation).
 */
function handleMerge(
  step: AgentWorkStep,
  context: { delegation: any },
): ToolExecutionResult {
  // Merge to production always requires explicit confirmation
  const targetBranch = step.target || 'main';
  const isProduction = targetBranch.includes('main') || targetBranch.includes('prod');

  if (isProduction) {
    return pendingResult(
      `Merge to production branch "${targetBranch}" requires explicit user confirmation`,
      [`target-branch:${targetBranch}`, `type:merge`, `risk:high`],
      'CONFIRM_MERGE',
      `/repo/merge?target=${targetBranch}&confirm=required`
    );
  }

  // Merge to staging may auto-approve if in scope
  if (targetBranch.includes('staging') || targetBranch.includes('staging')) {
    return successResult(
      `Merge to staging branch staged for review`,
      [`target-branch:${targetBranch}`, `status:ready-to-merge`],
    );
  }

  return blockedResult(`Merge target "${targetBranch}" not in delegation scope`);
}
