/**
 * Event type definitions for DSG Setup event bus
 */

export type EventType =
  | 'connector:connected'
  | 'discovery:completed'
  | 'plan:generated'
  | 'plan:approved'
  | 'provision:started'
  | 'item:executing'
  | 'item:completed'
  | 'item:failed'
  | 'secret:stored'
  | 'secret:rotated'
  | 'secret:accessed'
  | 'health:checked'
  | 'health:failed'
  | 'webhook:received'
  | 'execution:completed'
  | 'execution:failed'
  | 'execution:paused'
  | 'execution:resumed';

export interface DSGEvent<T = Record<string, unknown>> {
  id: string;
  type: EventType;
  org_id: string;
  user_id?: string;
  execution_id?: string;
  timestamp: Date;
  data: T;
  metadata?: {
    trace_id?: string;
    session_id?: string;
    source?: string;
  };
}

export interface ConnectorConnectedEvent {
  connector_id: string;
  connector_name: string;
  credential_id: string;
  scope: string;
}

export interface DiscoveryCompletedEvent {
  analysis_id: string;
  detected_services: Array<{
    service: string;
    confidence: number;
  }>;
  suggested_providers: Array<{
    capability: string;
    provider: string;
    confidence: number;
  }>;
  analysis_timestamp: Date;
}

export interface PlanGeneratedEvent {
  plan_id: string;
  org_id: string;
  phase_count: number;
  total_estimated_seconds: number;
  canonical_plan_hash: string;
}

export interface PlanApprovedEvent {
  approval_id: string;
  plan_id: string;
  org_id: string;
  approved_by: string;
  approved_at: Date;
  canonical_plan_hash: string;
}

export interface ProvisionStartedEvent {
  execution_id: string;
  plan_id: string;
  org_id: string;
  approval_id: string;
  started_at: Date;
}

export interface ItemExecutingEvent {
  execution_id: string;
  item_id: string;
  provider: string;
  action: string;
  phase: number;
  started_at: Date;
}

export interface ItemCompletedEvent {
  execution_id: string;
  item_id: string;
  provider: string;
  action: string;
  duration_seconds: number;
  result?: Record<string, unknown>;
  completed_at: Date;
}

export interface ItemFailedEvent {
  execution_id: string;
  item_id: string;
  provider: string;
  action: string;
  error: string;
  error_code?: string;
  failed_at: Date;
}

export interface SecretStoredEvent {
  secret_id: string;
  connector_id: string;
  secret_type: 'oauth' | 'api_key' | 'ssh' | 'certificate' | 'service_account';
  scope?: string;
  fingerprint: string;
  created_at: Date;
}

export interface SecretRotatedEvent {
  secret_id: string;
  connector_id: string;
  previous_fingerprint: string;
  new_fingerprint: string;
  rotated_at: Date;
}

export interface SecretAccessedEvent {
  secret_id: string;
  connector_id: string;
  fingerprint: string;
  action: 'read' | 'validate' | 'health_check';
  accessed_at: Date;
}

export interface HealthCheckedEvent {
  connector_id: string;
  status: 'healthy' | 'unhealthy' | 'expired';
  last_checked_at: Date;
  details?: string;
}

export interface HealthFailedEvent {
  connector_id: string;
  error: string;
  error_code?: string;
  failed_at: Date;
}

export interface WebhookReceivedEvent {
  webhook_id: string;
  connector_id: string;
  event_type: string;
  signature_verified: boolean;
  received_at: Date;
}

export interface ExecutionCompletedEvent {
  execution_id: string;
  plan_id: string;
  org_id: string;
  total_duration_seconds: number;
  items_completed: number;
  completed_at: Date;
}

export interface ExecutionFailedEvent {
  execution_id: string;
  plan_id: string;
  org_id: string;
  error: string;
  failed_item_id?: string;
  failed_at: Date;
}

export type AnyEvent = DSGEvent<
  | ConnectorConnectedEvent
  | DiscoveryCompletedEvent
  | PlanGeneratedEvent
  | PlanApprovedEvent
  | ProvisionStartedEvent
  | ItemExecutingEvent
  | ItemCompletedEvent
  | ItemFailedEvent
  | SecretStoredEvent
  | SecretRotatedEvent
  | SecretAccessedEvent
  | HealthCheckedEvent
  | HealthFailedEvent
  | WebhookReceivedEvent
  | ExecutionCompletedEvent
  | ExecutionFailedEvent
>;

export type EventListener<T = Record<string, unknown>> = (event: DSGEvent<T>) => Promise<void>;
