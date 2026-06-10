/**
 * Tool Capability Router
 *
 * Routes delegated agent work steps to appropriate tool executors.
 * Each tool (browser, repo, email, calendar, deploy) has its own executor
 * with specialized safety gates and permission checks.
 *
 * Dispatch patterns:
 * - browser -> Safe DOM verification + manifest check
 * - repo -> GitHub permission gate (PR vs merge)
 * - email -> Draft-first requirement
 * - calendar -> Permission-based gate
 * - deploy -> Environment gate (preview auto-approve, production always confirm)
 */

import type { AgentWorkStep, DelegationContract } from './delegation/types';
import type { SafeElementManifest } from './spine/verify-safe-dom-intent';
import { executeBrowserStep } from './tool-executors/browser-safe-dom';
import { executeRepoStep } from './tool-executors/repo-github-gate';
import { executeEmailStep } from './tool-executors/email-draft-first';
import { executeCalendarStep } from './tool-executors/calendar-permission';
import { executeDeployStep } from './tool-executors/deploy-approval';
import { blockedResult, type ToolExecutionResult } from './tool-executors/types';

/**
 * Execution context passed to all tool executors.
 */
export interface ToolExecutionContext {
  /** The delegation contract constraining this execution */
  delegation: DelegationContract;

  /** Optional Safe DOM manifest for browser operations */
  manifest?: SafeElementManifest;

  /** Session ID for stateful operations (browser, etc.) */
  sessionId?: string;

  /** Organization ID for audit and scoping */
  orgId?: string;

  /** Request ID for tracing */
  requestId?: string;

  /** Whether user is actively monitoring */
  userPresent?: boolean;
}

/**
 * Route a delegated work step to the appropriate tool executor.
 *
 * Each tool has specialized gates:
 * - browser: Safe DOM manifest verification
 * - repo: GitHub operation gates (PR, commit, merge)
 * - email: Draft-first gate (never send directly)
 * - calendar: Permission-based gate
 * - deploy: Environment gate (preview auto-approve, production always requires confirm)
 *
 * Returns a standardized ToolExecutionResult with ok status, reason, and evidence.
 * If actionRequired is set, the user must approve before the action proceeds.
 */
export async function routeToToolExecutor(
  step: AgentWorkStep,
  context: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  // Validate step has required fields
  if (!step || !step.tool) {
    return blockedResult('Work step missing required tool field');
  }

  if (!context.delegation) {
    return blockedResult('Execution context missing delegation contract');
  }

  // First, validate tool is known
  const normalizedTool = step.tool.toLowerCase().trim();
  const knownTools = ['browser', 'repo', 'github', 'email', 'calendar', 'deploy', 'deployment'];
  if (!knownTools.includes(normalizedTool)) {
    return blockedResult(`Unknown tool: "${step.tool}". Supported tools: browser, repo, email, calendar, deploy`);
  }

  // Validate step is within delegation scope
  const scope = context.delegation.scope || '';
  if (scope && !scope.includes(step.tool)) {
    return blockedResult(`Tool "${step.tool}" not in delegation scope "${scope}"`);
  }

  // Validate step action is not globally blocked
  const actionKey = `${step.tool}.${step.action}`;
  if (context.delegation.blockedActions?.includes(actionKey)) {
    return blockedResult(`Action "${actionKey}" is blocked by delegation contract`);
  }

  // Dispatch to appropriate executor based on tool
  switch (normalizedTool) {
    case 'browser':
      return executeBrowserStep(step, context as any);

    case 'repo':
    case 'github':
      return executeRepoStep(step, context as any);

    case 'email':
      return executeEmailStep(step, context as any);

    case 'calendar':
      return executeCalendarStep(step, context as any);

    case 'deploy':
    case 'deployment':
      return executeDeployStep(step, context as any);

    default:
      return blockedResult(`Unknown tool: "${step.tool}". Supported tools: browser, repo, email, calendar, deploy`);
  }
}

/**
 * Batch route multiple work steps.
 * Returns array of results in same order as input steps.
 */
export async function routeBatchToExecutors(
  steps: AgentWorkStep[],
  context: ToolExecutionContext,
): Promise<ToolExecutionResult[]> {
  return Promise.all(steps.map((step) => routeToToolExecutor(step, context)));
}

/**
 * Check if a step requires user confirmation before execution.
 * Useful for pre-filtering to show user which steps need approval.
 */
export function stepRequiresConfirmation(step: AgentWorkStep, delegation: DelegationContract): boolean {
  if (step.requiresConfirmation) {
    return true;
  }

  const actionKey = `${step.tool}.${step.action}`;

  // Production-related actions always need confirmation
  if (actionKey.includes('production') || actionKey.includes('prod')) {
    return true;
  }

  // Merge and delete actions always need confirmation
  if (
    actionKey.includes('merge') ||
    actionKey.includes('delete') ||
    actionKey.includes('deploy') ||
    actionKey.includes('send')
  ) {
    return true;
  }

  // Check delegation requiresUserConfirm list
  if (delegation.requiresUserConfirm?.includes(actionKey)) {
    return true;
  }

  return false;
}

/**
 * Get human-readable description of what a step will do.
 */
export function describeStep(step: AgentWorkStep): string {
  const tool = step.tool.charAt(0).toUpperCase() + step.tool.slice(1);
  const action = step.action.charAt(0).toUpperCase() + step.action.slice(1);

  if (step.target) {
    return `${tool}: ${action} on ${step.target}`;
  }

  return `${tool}: ${action}`;
}
