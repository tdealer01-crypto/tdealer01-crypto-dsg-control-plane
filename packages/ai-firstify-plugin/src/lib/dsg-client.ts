import type { GovernanceRequest, GovernanceResponse } from './types';

export class DSGClient {
  private apiBase: string;
  private apiKey: string;

  constructor(apiBase: string, apiKey: string) {
    this.apiBase = apiBase;
    this.apiKey = apiKey;
  }

  async evaluateGovernance(
    request: GovernanceRequest
  ): Promise<GovernanceResponse> {
    const response = await fetch(
      `${this.apiBase}/api/dsg/v1/gates/evaluate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-DSG-Plugin': 'ai-firstify',
        },
        body: JSON.stringify({
          planId: `ai-firstify-${request.modelId}`,
          riskLevel: 'high',
          context: {
            modelId: request.modelId,
            action: request.action,
            ...request.context,
            ...request.requestMetadata,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `DSG governance evaluation failed: ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      decision: mapDSGDecision(data.decision),
      reason: data.reason || 'No reason provided',
      policies: data.policies || [],
      proofReference: data.proofReference,
      metadata: data.metadata,
    };
  }

  async getPolicyManifest() {
    const response = await fetch(
      `${this.apiBase}/api/dsg/v1/policies/manifest`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'X-DSG-Plugin': 'ai-firstify',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch policy manifest: ${response.statusText}`);
    }

    return response.json();
  }

  async getHealth() {
    const response = await fetch(`${this.apiBase}/api/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`DSG health check failed: ${response.statusText}`);
    }

    return response.json();
  }
}

function mapDSGDecision(
  dsgDecision: string
): 'pass' | 'review' | 'block' | 'unsupported' {
  const lowerDecision = dsgDecision.toLowerCase();
  if (lowerDecision === 'pass' || lowerDecision === 'allow') {
    return 'pass';
  }
  if (lowerDecision === 'review') {
    return 'review';
  }
  if (lowerDecision === 'block') {
    return 'block';
  }
  return 'unsupported';
}

export function createDSGClient(
  apiBase: string,
  apiKey: string
): DSGClient {
  return new DSGClient(apiBase, apiKey);
}
