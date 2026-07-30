import axios, { AxiosInstance } from 'axios';
import { AuthenticationError, ValidationError, ConformanceError } from '../utils/errors.js';

export interface DSGBrainConfig {
  baseUrl: string;
  apiKey: string;
}

export interface Plan {
  id: string;
  objective: string;
  steps: Array<{ action: string; params: Record<string, any> }>;
  constraints: string[];
  hash: string;
}

export class DSGBrainService {
  private client: AxiosInstance;

  constructor(config: DSGBrainConfig) {
    if (!config.baseUrl || !config.apiKey) {
      throw new AuthenticationError('Missing DSG Brain configuration');
    }

    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
  }

  async proposePlan(
    objective: string,
    context?: Record<string, any>,
    constraints?: string[]
  ): Promise<Plan> {
    try {
      const { data } = await this.client.post('/api/dsg/brain/plan', {
        objective,
        context,
        constraints,
      });

      if (data.error) {
        throw new ValidationError(data.error.message);
      }

      return {
        id: data.plan_id,
        objective: data.objective,
        steps: data.steps || [],
        constraints: data.constraints || [],
        hash: data.plan_hash,
      };
    } catch (error) {
      throw new ValidationError(`Failed to propose plan: ${String(error)}`);
    }
  }

  async brokerCredential(
    secretName: string,
    scope?: string,
    leaseDuration: number = 3600
  ): Promise<{ lease: string; fingerprint: string; expiresAt: Date }> {
    try {
      const { data } = await this.client.post('/api/dsg/brain/credential-broker', {
        secret_name: secretName,
        scope,
        lease_duration: leaseDuration,
      });

      if (data.error) {
        throw new ValidationError(data.error.message);
      }

      return {
        lease: data.lease_token,
        fingerprint: data.fingerprint,
        expiresAt: new Date(data.expires_at),
      };
    } catch (error) {
      throw new ValidationError(`Failed to broker credential: ${String(error)}`);
    }
  }

  async validateConformance(
    executionId: string,
    planHash: string,
    executedCommands: Array<{ command: string; path: string; result: any }>
  ): Promise<{ conformant: boolean; violations?: string[] }> {
    try {
      const { data } = await this.client.post('/api/dsg/brain/conformance', {
        execution_id: executionId,
        plan_hash: planHash,
        executed_commands: executedCommands,
      });

      if (!data.conformant) {
        throw new ConformanceError('Execution does not conform to approved plan', {
          violations: data.violations,
        });
      }

      return {
        conformant: data.conformant,
        violations: data.violations,
      };
    } catch (error) {
      if (error instanceof ConformanceError) {
        throw error;
      }
      throw new ValidationError(`Failed to validate conformance: ${String(error)}`);
    }
  }
}
