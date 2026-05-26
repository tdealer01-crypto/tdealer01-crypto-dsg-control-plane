export type GraphNodeType =
  | 'route'
  | 'lib'
  | 'component'
  | 'migration'
  | 'test'
  | 'config'
  | 'doc'
  | 'script'
  | 'other';

export type EdgeType = 'import' | 'link' | 'co-located' | 'references';
export type Confidence = 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS';
export type GateDecision = 'ALLOW' | 'REVIEW' | 'BLOCK';

export interface GraphNode {
  id: string;
  path: string;
  nodeType: GraphNodeType;
  size?: number;
  builtAt: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  edgeType: EdgeType;
  confidence: Confidence;
}

export interface GraphSnapshot {
  builtAt: string;
  nodeCount: number;
  edgeCount: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  warnings: string[];
}

export interface EvidenceItem {
  file: string;
  relation: EdgeType;
  confidence: Confidence;
}

export interface GateResult {
  decision: GateDecision;
  reasons: string[];
  blockedClaims: string[];
}

export interface QueryResult {
  decision: GateDecision;
  answer: string;
  evidence: EvidenceItem[];
  blockedClaims: string[];
}

export interface GraphRow {
  id: string;
  workspace_id: string;
  built_by: string;
  built_at: string;
  node_count: number;
  edge_count: number;
  include_patterns: string[];
  exclude_patterns: string[];
  graph_data: GraphSnapshot;
  warnings: string[];
  created_at: string;
}
