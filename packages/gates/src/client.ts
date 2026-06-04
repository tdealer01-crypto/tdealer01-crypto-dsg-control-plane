/**
 * DSG Gates Client - Easy-to-use wrapper for gate evaluation
 */

import { GateRequest, GateResponse, GatePolicyConfig, GateDecision, GateError } from './types';
import { validatePolicy, evaluatePolicy, policyHash } from './policy-utils';
import crypto from 'crypto';

export interface DSGGatesClientConfig {
  /** DSG control plane API base URL */
  baseUrl?: string;

  /** API key for authentication */
  apiKey?: string;

  /** Organization ID */
  orgId?: string;

  /** Agent ID (default: from environment or request) */
  agentId?: string;

  /** Default policy to use if none provided */
  defaultPolicy?: GatePolicyConfig;

  /** Timeout for API requests (ms) */
  timeout?: number;

  /** Whether to validate policies before evaluation */
  validatePolicies?: boolean;
}

/**
 * DSG Gates Client
 */
export class DSGGatesClient {
  private baseUrl: string;
  private apiKey: string;
  private orgId: string;
  private agentId: string;
  private defaultPolicy: GatePolicyConfig | undefined;
  private timeout: number;
  private validatePolicies: boolean;

  constructor(config: DSGGatesClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
    this.apiKey = config.apiKey || process.env.DSG_API_KEY || '';
    this.orgId = config.orgId || process.env.DSG_ORG_ID || '';
    this.agentId = config.agentId || process.env.DSG_AGENT_ID || '';
    this.defaultPolicy = config.defaultPolicy;
    this.timeout = config.timeout || 5000;
    this.validatePolicies = config.validatePolicies !== false;
  }

  /**
   * Evaluate a gate request against a policy
   * Can use remote API or local evaluation (if policy provided)
   */
  async evaluateGate(
    request: GateRequest,
    policy?: GatePolicyConfig,
  ): Promise<GateResponse> {
    // Use provided policy, default policy, or fetch from remote API
    const effectivePolicy = policy || this.defaultPolicy;

    if (effectivePolicy) {
      // Local evaluation
      return this.localEvaluate(request, effectivePolicy);
    } else {
      // Remote API evaluation
      return this.remoteEvaluate(request);
    }
  }

  /**
   * Local evaluation using provided policy
   */
  private localEvaluate(request: GateRequest, policy: GatePolicyConfig): GateResponse {
    // Validate policy if configured
    if (this.validatePolicies) {
      const errors = validatePolicy(policy);
      if (errors.length > 0) {
        throw new GateError('INVALID_POLICY', `Invalid policy: ${errors[0].message}`);
      }
    }

    // Evaluate
    const evaluation = evaluatePolicy(policy, request);

    // Generate proof hashes
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(request))
      .digest('hex');
    const decisionHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(evaluation))
      .digest('hex');

    const policyHashValue = policyHash(policy);

    return {
      decision: evaluation.decision,
      reason: evaluation.reason,
      riskScore: evaluation.riskScore,
      riskLevel: evaluation.riskLevel,
      executionId: request.executionId,
      policyVersion: policy.version,
      policyHash: policyHashValue,
      proof: {
        timestamp: new Date().toISOString(),
        requestHash,
        decisionHash,
      },
    };
  }

  /**
   * Remote evaluation via API
   */
  private async remoteEvaluate(request: GateRequest): Promise<GateResponse> {
    if (!this.apiKey) {
      throw new GateError('VALIDATION_FAILED', 'API key required for remote evaluation');
    }

    const url = `${this.baseUrl}/api/dsg/v1/gates/evaluate`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new GateError(
        'EVALUATION_ERROR',
        `Gate evaluation failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Validate a policy
   */
  validatePolicy(policy: GatePolicyConfig): { valid: boolean; errors: string[] } {
    const errors = validatePolicy(policy);
    return {
      valid: errors.length === 0,
      errors: errors.map((e) => e.message),
    };
  }

  /**
   * Get policy hash for reproducibility
   */
  getPolicyHash(policy: GatePolicyConfig): string {
    return policyHash(policy);
  }

  /**
   * Set default policy
   */
  setDefaultPolicy(policy: GatePolicyConfig): void {
    this.defaultPolicy = policy;
  }

  /**
   * Get current configuration
   */
  getConfig(): DSGGatesClientConfig {
    return {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      orgId: this.orgId,
      agentId: this.agentId,
      defaultPolicy: this.defaultPolicy,
      timeout: this.timeout,
      validatePolicies: this.validatePolicies,
    };
  }
}

/**
 * Create a singleton instance (convenience function)
 */
let _instance: DSGGatesClient;

export function createGatesClient(config?: DSGGatesClientConfig): DSGGatesClient {
  if (!_instance) {
    _instance = new DSGGatesClient(config);
  }
  return _instance;
}

export function getGatesClient(): DSGGatesClient {
  if (!_instance) {
    _instance = new DSGGatesClient();
  }
  return _instance;
}
