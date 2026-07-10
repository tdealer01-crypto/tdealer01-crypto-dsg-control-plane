// Central type definitions for DSG Setup (Infrastructure Operating System)

// === Connector Manifest & Capabilities ===

export interface ConnectorPermission {
  permission: string;
  description?: string;
  required: boolean;
}

export interface ConnectorProvides {
  resource: string;
  key: string;
  description?: string;
}

export interface ConnectorRequires {
  resource: string;
  key: string;
  description?: string;
  optional?: boolean;
}

export interface ConnectorManifest {
  id: string;
  name: string;
  kind: 'oauth' | 'api-key' | 'webhook';
  permissions: ConnectorPermission[];
  required_secrets: string[];
  provides: ConnectorProvides[];
  requires: ConnectorRequires[];
  dependencies?: string[];
  health_check?: {
    endpoint: string;
    method: 'GET' | 'POST';
    expected_status: number;
  };
  retry_policy?: {
    max_retries: number;
    backoff_ms: number;
  };
}

export interface ConnectorCapability {
  capability: string;
  resource_type: string;
  description?: string;
}

export interface ConnectorCredential {
  connector_id: string;
  credential_type: 'oauth' | 'api_key' | 'ssh' | 'certificate' | 'service_account';
  encrypted_token: string;
  token_type: 'bearer' | 'api_key' | 'pem' | 'json';
  scope?: string;
  expires_at?: Date;
  refresh_token_encrypted?: string;
  rotation_policy?: {
    auto_rotate: boolean;
    interval_days: number;
  };
  fingerprint: string;
  metadata?: Record<string, unknown>;
}

// === Discovery ===

export interface DetectedService {
  service: string;
  confidence: number;
  source?: 'heuristic' | 'package.json' | 'docker-compose' | 'env' | 'workflow' | 'terraform' | 'dockerfile' | 'ai';
  description?: string;
}

export interface SuggestedProvider {
  capability: string;
  provider: string;
  confidence: number;
  required: boolean;
  alternatives?: string[];
}

export interface DiscoveryAnalysis {
  id: string;
  org_id: string;
  project_name: string;
  github_url?: string;
  scan_mode: 'heuristic' | 'ai' | 'both';
  detected_services: DetectedService[];
  suggested_providers: SuggestedProvider[];
  analysis_timestamp: Date;
  proof_hash: string;
  created_by: string;
  created_at: Date;
}

// === Dependency Graph & Planner ===

export interface DependencyNode {
  id: string;
  provider_id: string;
  action: string;
  params?: Record<string, unknown>;
  provides?: Record<string, unknown>;
  requires?: Record<string, unknown>;
  phase: number;
  estimated_seconds?: number;
}

export interface DependencyEdge {
  from: string;
  to: string;
  requires_output?: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  phases: Phase[];
}

export interface Phase {
  phase: number;
  items: DependencyNode[];
  can_run_parallel: boolean;
}

export interface ProvisionPlan {
  id: string;
  org_id: string;
  discovery_id?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'executing' | 'completed' | 'failed';
  plan_definition: {
    phases: Phase[];
  };
  dependency_graph: DependencyGraph;
  estimated_duration_seconds: number;
  canonical_plan_hash: string;
  approval_id?: string;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// === Execution ===

export interface ProvisionItem {
  id: string;
  provider: string;
  action: string;
  params?: Record<string, unknown>;
  estimated_seconds?: number;
  provides?: Record<string, unknown>;
  requires?: Record<string, unknown>;
}

export interface ExecutedItem {
  id: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
  duration_seconds?: number;
  completed_at?: Date;
}

export interface ProvisionExecution {
  id: string;
  org_id: string;
  plan_id: string;
  approval_id?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'paused' | 'rolled_back';
  current_phase: number;
  checkpoint?: {
    phase: number;
    completed_items: ExecutedItem[];
  };
  items_completed: ExecutedItem[];
  items_failed: ExecutedItem[];
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// === Audit ===

export type AuditEventType =
  | 'plan:created'
  | 'plan:updated'
  | 'plan:approved'
  | 'provision:started'
  | 'item:executing'
  | 'item:completed'
  | 'item:failed'
  | 'phase:completed'
  | 'execution:completed'
  | 'execution:failed'
  | 'credential:stored'
  | 'credential:accessed'
  | 'credential:rotated'
  | 'credential:revoked'
  | 'health:checked'
  | 'health:failed'
  | 'webhook:received';

export interface ProvisionAuditEvent {
  id: string;
  org_id: string;
  execution_id?: string;
  event_type: AuditEventType;
  event_data: Record<string, unknown>;
  previous_event_hash?: string;
  event_hash: string;
  created_at: Date;
}

// === Vault ===

export interface CredentialSummary {
  id: string;
  provider: string;
  type: 'oauth' | 'api_key' | 'ssh' | 'certificate' | 'service_account';
  scope?: string;
  expires_at?: Date;
  fingerprint: string;
  health: 'healthy' | 'unhealthy' | 'expired' | 'unknown';
  last_used?: Date;
  last_health_check?: Date;
  rotated_at?: Date;
}

// === API Responses ===

export interface AnalyzeResponse {
  detected_services: DetectedService[];
  suggested_providers: SuggestedProvider[];
  estimated_setup_time_seconds: number;
  analysis_timestamp: Date;
  proof_hash: string;
}

export interface PlanResponse {
  plan_id: string;
  phases: Phase[];
  total_estimated_seconds: number;
  dependency_graph: DependencyGraph;
  canonical_plan_hash: string;
  requires_approval: boolean;
}

export interface ApprovalResponse {
  approval_id: string;
  approved_at: Date;
  execution_can_start: boolean;
}

export interface ExecuteResponse {
  execution_id: string;
  status: string;
  phase: number;
}

export interface StatusResponse {
  execution_id: string;
  status: 'executing' | 'completed' | 'failed' | 'paused';
  current_phase: number;
  items_completed: ExecutedItem[];
  items_executing: ExecutedItem[];
  items_pending: ExecutedItem[];
  items_failed: ExecutedItem[];
  next_phase_eta?: number;
  can_rollback: boolean;
  events: ProvisionAuditEvent[];
}

export interface ConnectorListResponse {
  connectors: {
    id: string;
    name: string;
    kind: 'oauth' | 'api-key' | 'webhook';
    capabilities: ConnectorCapability[];
    permissions_required: string[];
    sandbox_supported: boolean;
    health?: {
      status: 'healthy' | 'unhealthy' | 'unknown';
      last_checked?: Date;
    };
    icon_url?: string;
    marketplace?: {
      author: string;
      version: string;
      rating?: number;
    };
  }[];
}

export interface VaultSecretsResponse {
  secrets: CredentialSummary[];
}

// === Health & Status ===

export interface HealthCheckResult {
  ok: boolean;
  detail?: string;
  last_checked_at: Date;
}

export interface ProviderHealthStatus {
  id: string;
  name: string;
  status: 'healthy' | 'unhealthy' | 'expired' | 'unknown';
  last_checked_at?: Date;
}

// === Capabilities ===

