import type { ConnectorManifest, ConnectorCredential, HealthCheckResult } from '../types';

export interface OAuthMetadata {
  client_id?: string;
  authorize_url: string;
  token_url?: string;
  scopes: string[];
  state_required: boolean;
}

export interface ProvisionInput {
  action: string;
  params: Record<string, unknown>;
  requires?: Record<string, unknown>;
}

export interface ProvisionOutput {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  detail?: string;
}

export interface Connector {
  readonly id: string;
  readonly name: string;
  readonly kind: 'oauth' | 'api-key' | 'webhook';
  readonly manifest: ConnectorManifest;

  health(credential: ConnectorCredential): Promise<HealthCheckResult>;

  getOAuthMetadata(mode: 'sandbox' | 'live'): OAuthMetadata | null;

  exchangeCode(code: string, state: string): Promise<ConnectorCredential>;

  validateCredential(credential: ConnectorCredential): Promise<ValidationResult>;

  provision(input: ProvisionInput): Promise<ProvisionOutput>;

  rollback(executionId: string): Promise<void>;
}
