export type ContextGraphEvidenceState = 'EXTRACTED' | 'INFERRED' | 'MISSING' | 'UNSUPPORTED';
export type ContextGraphRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ContextGraphGateStatus = 'PASS' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';

export type ContextGraphFactInput = {
  id?: string;
  label: string;
  kind: 'route' | 'api' | 'component' | 'doc' | 'evidence' | 'workflow' | 'control' | 'claim' | 'unknown';
  source: string;
  summary: string;
  evidenceState?: ContextGraphEvidenceState;
  riskLevel?: ContextGraphRiskLevel;
};

export type ContextGraphEdgeInput = {
  from: string;
  to: string;
  relation: 'uses' | 'blocks' | 'requires' | 'produces' | 'supports' | 'reviews' | 'depends_on' | 'claims' | 'unknown';
  evidenceState?: ContextGraphEvidenceState;
  summary?: string;
};

export type BuildContextGraphInput = {
  mode?: 'supplied_facts' | 'command_center_scaffold';
  goal: string;
  workspaceId?: string;
  actorId?: string;
  facts?: ContextGraphFactInput[];
  edges?: ContextGraphEdgeInput[];
};

export type ContextGraphNode = {
  id: string;
  label: string;
  kind: ContextGraphFactInput['kind'];
  source: string;
  summary: string;
  evidenceState: ContextGraphEvidenceState;
  riskLevel: ContextGraphRiskLevel;
};

export type ContextGraphEdge = Required<ContextGraphEdgeInput>;

export type ContextGraphGate = {
  status: ContextGraphGateStatus;
  reasons: string[];
  blockedSources: string[];
  reviewSources: string[];
};

export type ContextGraphClaimGate = {
  buildable: ContextGraphGateStatus;
  implemented: ContextGraphGateStatus;
  verified: ContextGraphGateStatus;
  deployable: ContextGraphGateStatus;
  production: ContextGraphGateStatus;
  reasons: string[];
};

export type ContextGraphBuildResult = {
  ok: boolean;
  type: 'dsg-context-graph-build';
  generatedAt: string;
  dataMode: 'supplied_facts' | 'command_center_scaffold';
  graphHash: string;
  nodeCount: number;
  edgeCount: number;
  nodes: ContextGraphNode[];
  edges: ContextGraphEdge[];
  privacyGate: ContextGraphGate;
  secretGate: ContextGraphGate;
  claimGate: ContextGraphClaimGate;
  report: string;
  boundary: {
    statement: string;
    productionProof: false;
    externalZ3Invoked: false;
    wormStorageClaim: false;
    thirdPartyAuditClaim: false;
  };
};
