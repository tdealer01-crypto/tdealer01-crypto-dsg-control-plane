export type GatewayRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type GatewayExecutionMode = 'monitor' | 'gateway' | 'critical';

export type GatewayDecision = 'allow' | 'block' | 'review' | 'ask_more_info';

export type GatewayToolProvider = 'zapier' | 'mock' | 'custom_http';

export type GatewayToolRegistryEntry = {
  name: string;
  provider: GatewayToolProvider;
  action: string;
  risk: GatewayRiskLevel;
  executionMode: GatewayExecutionMode;
  requiresApproval: boolean;
  description: string;
  connectorId?: string;
  endpointUrl?: string;
  authHeaders?: Record<string, string>;
};

export type GatewayToolRequest = {
  orgId: string;
  actorId: string;
  actorRole: string;
  orgPlan: string;
  planId?: string;
  toolName: string;
  action: string;
  input: Record<string, unknown>;
  approvalToken?: string;
};

export type GatewayToolProviderResult = {
  ok: boolean;
  provider: string;
  toolName: string;
  action: string;
  target?: string;
  result?: Record<string, unknown>;
  error?: string;
};

export type GatewayToolExecutionResult = {
  ok: boolean;
  decision: GatewayDecision;
  reason?: string;
  registryEntry?: GatewayToolRegistryEntry;
  providerResult?: GatewayToolProviderResult;
  audit: {
    committed: boolean;
    requestHash: string;
    recordHash: string;
  };
};
