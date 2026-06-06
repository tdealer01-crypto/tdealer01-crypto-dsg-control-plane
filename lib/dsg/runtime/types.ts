export type RuntimeJobStatus =
  | 'QUEUED'
  | 'GOAL_LOCKED'
  | 'INSPECTING'
  | 'PLANNING'
  | 'WAITING_PERMISSION'
  | 'WAITING_APPROVAL'
  | 'RUNNING'
  | 'VERIFYING'
  | 'PASSED'
  | 'BLOCKED'
  | 'FAILED'
  | 'KILLED'
  | 'COMPLETED'
  | 'RESET';

export type GateStatus = 'PASS' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RuntimeTask = {
  id: string;
  title: string;
  dependsOn: string[];
  riskLevel: RiskLevel;
  toolName?: string;
  requiresApproval?: boolean;
  metadata?: Record<string, unknown>;
};

export type RuntimeDependencyEdge = {
  from: string;
  to: string;
};

export type RuntimeWave = {
  id: string;
  index: number;
  taskIds: string[];
  riskLevel: RiskLevel;
  requiresApproval: boolean;
};

export type RuntimePlan = {
  tasks: RuntimeTask[];
  edges: RuntimeDependencyEdge[];
  waves: RuntimeWave[];
  planHash: string;
  waveHash: string;
};

export type EvidenceItem = {
  id: string;
  evidenceType: string;
  contentHash: string;
  summary: string;
  uri?: string;
};
