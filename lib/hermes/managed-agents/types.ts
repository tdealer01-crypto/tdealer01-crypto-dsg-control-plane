export interface HermesAgent {
  id: string;
  org_id: string;
  version: number;
  name: string;
  description?: string;
  model: string;
  system?: string;
  tools: Array<{ type: string; name: string; [key: string]: unknown }>;
  skills: string[];
  mcp_servers: Array<{ name: string; url: string; [key: string]: unknown }>;
  multiagent?: { subagents?: string[]; [key: string]: unknown };
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface HermesSession {
  id: string;
  org_id: string;
  agent_id: string;
  agent_version?: number;
  environment_id?: string;
  vault_ids: string[];
  resources: Array<Record<string, unknown>>;
  title?: string;
  status: 'idle' | 'running' | 'rescheduling' | 'terminated' | 'archived';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface HermesSessionEventData {
  type: string;
  [key: string]: unknown;
}

export interface HermesSessionEvent {
  id: string;
  org_id: string;
  session_id: string;
  event: HermesSessionEventData;
  created_at: string;
}

export interface HermesSessionThread {
  id: string;
  org_id: string;
  session_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface HermesMemoryStore {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface HermesMemory {
  id: string;
  org_id: string;
  store_id: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HermesVault {
  id: string;
  org_id: string;
  display_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface HermesSkill {
  id: string;
  org_id: string;
  display_title?: string;
  source: 'custom' | 'anthropic';
  file_ids: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HermesEnvironment {
  id: string;
  org_id: string;
  name: string;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface HermesUserProfile {
  id: string;
  org_id: string;
  external_id: string;
  name?: string;
  relationship?: 'user' | 'admin' | 'org_member';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type WebhookEvent =
  | 'session.status_running'
  | 'session.status_idle'
  | 'session.error'
  | 'agent.message'
  | 'agent.tool_result'
  | 'span.model_request_start'
  | 'span.model_request_end';

export interface HermesWebhook {
  id: string;
  org_id: string;
  url: string;
  events: WebhookEvent[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface UserSentEvent {
  type: 'user.message' | 'user.text';
  content: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface PageCursor<T> {
  data: T[];
  has_more: boolean;
  first_id?: string;
  last_id?: string;
}
