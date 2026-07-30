import axios, { AxiosInstance } from 'axios';
import { AuthenticationError, ValidationError, QuotaExceededError } from '../utils/errors.js';

export interface SpineConfig {
  baseUrl: string;
  apiKey: string;
}

export class SpineService {
  private client: AxiosInstance;

  constructor(config: SpineConfig) {
    if (!config.baseUrl || !config.apiKey) {
      throw new AuthenticationError('Missing Spine configuration');
    }

    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
  }

  async executeGoverned(
    agentId: string,
    intent: { action: string; parameters: Record<string, any> },
    approve: boolean = false
  ): Promise<{ executionId: string; decision: string; reason: string; proof?: any }> {
    try {
      const { data } = await this.client.post('/api/spine/execute', {
        agent_id: agentId,
        intent,
        approval: approve,
      });

      if (data.error) {
        if (data.error.code === 'QUOTA_EXCEEDED') {
          throw new QuotaExceededError(data.error.message);
        }
        throw new ValidationError(data.error.message);
      }

      return {
        executionId: data.execution_id,
        decision: data.decision,
        reason: data.reason,
        proof: data.proof,
      };
    } catch (error) {
      throw new ValidationError(`Failed to execute governed operation: ${String(error)}`);
    }
  }

  async getExecutionStatus(executionId: string): Promise<{
    id: string;
    status: string;
    decision: string;
    timestamp: Date;
  }> {
    try {
      const { data } = await this.client.get(`/api/executions/${executionId}`);

      return {
        id: data.id,
        status: data.status,
        decision: data.decision,
        timestamp: new Date(data.timestamp),
      };
    } catch (error) {
      throw new ValidationError(`Failed to get execution status: ${String(error)}`);
    }
  }

  async commitEvidence(
    executionId: string,
    evidence: {
      decision: string;
      reason: string;
      proof?: any;
      trace?: any[];
    }
  ): Promise<{ success: boolean; committed: boolean }> {
    try {
      const { data } = await this.client.post(`/api/executions/${executionId}/commit`, evidence);

      return {
        success: !data.error,
        committed: data.committed || false,
      };
    } catch (error) {
      throw new ValidationError(`Failed to commit evidence: ${String(error)}`);
    }
  }

  async checkQuota(agentId: string): Promise<{ available: number; used: number; limit: number; percentUsed: number }> {
    try {
      const { data } = await this.client.get(`/api/usage?agent_id=${agentId}`);

      return {
        available: data.available || 0,
        used: data.used || 0,
        limit: data.limit || 0,
        percentUsed: ((data.used || 0) / (data.limit || 1)) * 100,
      };
    } catch (error) {
      throw new ValidationError(`Failed to check quota: ${String(error)}`);
    }
  }
}
