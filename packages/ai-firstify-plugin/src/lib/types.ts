export interface AIModel {
  id: string;
  name: string;
  version: string;
  provider: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyRule {
  id: string;
  condition: string;
  action: 'allow' | 'review' | 'block';
  severity: 'warning' | 'critical';
  metadata?: Record<string, any>;
}

export interface GatewayDecision {
  id: string;
  requestId: string;
  decision: 'pass' | 'review' | 'block';
  reason: string;
  policyVersion: string;
  proofReference: string;
  timestamp: Date;
}

export interface AuditLog {
  id: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  action: string;
  userId: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

export interface PluginConfig {
  apiBase: string;
  apiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  redisUrl?: string;
}

export interface GovernanceRequest {
  modelId: string;
  action: string;
  context: Record<string, any>;
  requestMetadata?: Record<string, any>;
}

export interface GovernanceResponse {
  decision: 'pass' | 'review' | 'block' | 'unsupported';
  reason: string;
  policies: string[];
  proofReference?: string;
  metadata?: Record<string, any>;
}
