import { getSupabaseClient } from './supabase-client';
import type { AIModel, GovernanceRequest, GovernanceResponse } from './types';

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

  async getAIModel(modelId: string, orgId: string): Promise<AIModel | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .eq('id', modelId)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      version: data.version,
      provider: data.provider,
      tags: data.tags || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async listAIModels(orgId: string): Promise<AIModel[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      version: row.version,
      provider: row.provider,
      tags: row.tags || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  async createAIModel(
    orgId: string,
    model: Omit<AIModel, 'createdAt' | 'updatedAt'> & {
      description?: string;
      modelType?: string;
      endpoint?: string;
      createdBy?: string;
    }
  ): Promise<AIModel | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('ai_models')
      .insert({
        org_id: orgId,
        name: model.name,
        version: model.version,
        provider: model.provider,
        tags: model.tags || [],
        description: model.description,
        model_type: model.modelType,
        endpoint_url: model.endpoint,
        created_by: model.createdBy,
        status: 'active',
      })
      .select()
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      version: data.version,
      provider: data.provider,
      tags: data.tags || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
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
