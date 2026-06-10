/**
 * Deployment Executor with Environment Gate
 *
 * Routes deployment operations with strict environment checks.
 * Preview deployments may auto-approve; production always requires confirmation.
 */

import type { AgentWorkStep } from '../delegation/types';
import { blockedResult, pendingResult, successResult, type ToolExecutionResult } from './types';

/**
 * Execute a deployment step through environment gate.
 *
 * Production deployments always require explicit user confirmation.
 * Preview/staging deployments may auto-approve if in delegation scope.
 */
export async function executeDeployStep(
  step: AgentWorkStep,
  context: {
    delegation: any;
  },
): Promise<ToolExecutionResult> {
  const action = step.action.toLowerCase();

  // Validate delegation permits deployment
  const scope = context.delegation?.scope || '';
  if (!scope.includes('deploy')) {
    return blockedResult('Delegation does not permit deployment operations');
  }

  // Check if deployment is explicitly blocked
  if (context.delegation?.blockedActions?.includes(`deploy.${action}`)) {
    return blockedResult(`Deployment action "${action}" is blocked by delegation contract`);
  }

  // Determine target environment from step
  const environment = parseEnvironment(step.target);

  if (!environment) {
    return blockedResult('Deployment step requires target environment (preview/staging/production)');
  }

  // Route based on environment
  if (environment === 'production') {
    return handleProductionDeploy(step, context);
  }

  if (environment === 'staging' || environment === 'preview') {
    return handlePreviewDeploy(step, context, environment);
  }

  return blockedResult(`Unknown deployment environment: ${environment}`);
}

/**
 * Handle production deployment (always requires confirmation).
 */
function handleProductionDeploy(
  step: AgentWorkStep,
  context: { delegation: any },
): ToolExecutionResult {
  // Production deployments ALWAYS require explicit confirmation
  // regardless of delegation settings
  return pendingResult(
    `Production deployment requires explicit user confirmation`,
    [
      `environment:production`,
      `action:deploy`,
      `risk:critical`,
    ],
    'CONFIRM_PRODUCTION_DEPLOY',
    `/deployments/confirm?env=production&target=${step.target}&confirm=required`
  );
}

/**
 * Handle preview/staging deployment.
 */
function handlePreviewDeploy(
  step: AgentWorkStep,
  context: { delegation: any },
  environment: string,
): ToolExecutionResult {
  // Check if preview deployment requires confirmation per delegation
  if (context.delegation?.requiresUserConfirm?.includes(`deploy.${environment}`)) {
    return pendingResult(
      `Deployment to ${environment} requires user confirmation per delegation`,
      [
        `environment:${environment}`,
        `action:deploy`,
      ],
      'CONFIRM_PREVIEW_DEPLOY',
      `/deployments/confirm?env=${environment}&target=${step.target}`
    );
  }

  // Auto-approve preview deployments if in scope
  const deploymentId = generateDeploymentId();

  return successResult(
    `${environment.charAt(0).toUpperCase() + environment.slice(1)} deployment initiated`,
    [
      `deployment-id:${deploymentId}`,
      `environment:${environment}`,
      `status:deploying`,
    ]
  );
}

/**
 * Parse environment from target.
 * Expected formats: "preview", "staging", "production"
 */
function parseEnvironment(target?: string): string | null {
  if (!target) return null;

  const lower = target.toLowerCase();

  if (lower.includes('production') || lower.includes('prod')) {
    return 'production';
  }

  if (lower.includes('staging') || lower.includes('stage')) {
    return 'staging';
  }

  if (lower.includes('preview') || lower.includes('preview')) {
    return 'preview';
  }

  // Default to provided target if it's a known env
  if (['preview', 'staging', 'production'].includes(lower)) {
    return lower;
  }

  return null;
}

/**
 * Generate a unique deployment ID.
 */
function generateDeploymentId(): string {
  return `deploy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
