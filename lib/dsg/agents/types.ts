import type { SeedResult } from '@/lib/dsg/seed/seed-engine';
import type { Z3AgentGateResult } from '@/lib/dsg/logic/z3-agent-gate';

export type AgentType =
  | 'orchestrator'
  | 'code-evolution'
  | 'test-coverage'
  | 'deploy-monitor'
  | 'browser-research'
  | 'security-gate';

export type AgentStatus =
  | 'idle'
  | 'seeding'
  | 'z3-verify'
  | 'gate-check'
  | 'running'
  | 'pass'
  | 'blocked'
  | 'failed';

export interface AgentCapability {
  id: string;
  label: string;
  requiresApproval: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentJob {
  jobId: string;
  agentType: AgentType;
  workspaceId: string;
  goal: string;
  seedData: SeedResult[];
  z3Result: Z3AgentGateResult | null;
  gateDecision: 'ALLOW' | 'STABILIZE' | 'BLOCK' | null;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
  resultPayload?: unknown;
  errorMessage?: string;
}

export interface AgentDispatchOrder {
  jobId: string;
  agentType: AgentType;
  workspaceId: string;
  goal: string;
  parentJobId?: string;
}

export interface AgentResult {
  ok: boolean;
  jobId: string;
  agentType: AgentType;
  status: AgentStatus;
  evidenceHash: string;
  payload?: unknown;
  error?: string;
}

export interface AgentRegistration {
  agentType: AgentType;
  label: string;
  description: string;
  capabilities: AgentCapability[];
  skillId: string;
  endpoint: string;
  truthBoundary: string;
}
