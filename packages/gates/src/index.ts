/**
 * DSG Gates - Deterministic Policy Gates for AI Agents
 *
 * @example
 * ```typescript
 * import { DSGGatesClient, GatePolicyConfig } from '@dsg-platform/gates';
 *
 * const policy: GatePolicyConfig = {
 *   id: 'code-review-gate',
 *   version: '1.0.0',
 *   name: 'Code Review Gate',
 *   description: 'Require approval for production code changes',
 *   constraints: [{
 *     id: 'require-approval',
 *     type: 'custom_predicate',
 *     operator: 'custom',
 *     description: 'Must be approved by maintainer',
 *     riskLevel: 'high',
 *     isBlocker: true
 *   }],
 *   defaultDecision: 'REVIEW',
 *   requireApproval: true,
 *   actionPatterns: ['deploy.*', 'merge.*'],
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString()
 * };
 *
 * const client = new DSGGatesClient({ orgId: 'my-org' });
 * const response = await client.evaluateGate({
 *   executionId: 'exec-123',
 *   agentId: 'claude-code',
 *   orgId: 'my-org',
 *   action: 'deploy to production'
 * }, policy);
 *
 * console.log(response.decision); // 'REVIEW'
 * ```
 */

// Types
export {
  GateDecision,
  RiskLevel,
  GateRequest,
  GateResponse,
  PolicyConstraint,
  GatePolicyConfig,
  PolicyEvaluationResult,
  GateError,
  PolicyValidationError,
} from './types';

// Client
export { DSGGatesClient, createGatesClient, getGatesClient } from './client';
export type { DSGGatesClientConfig } from './client';

// Utilities
export { validatePolicy, policyHash, compilePolicyToDecisionTree, evaluatePolicy } from './policy-utils';

// Version
export const VERSION = '1.0.0';
