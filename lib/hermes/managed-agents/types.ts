export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;

export type PageCursor<T> = {
  data: T[];
  has_more: boolean;
  first_id?: string;
  last_id?: string;
};

export type WebhookEvent =
  | 'agent.created'
  | 'agent.updated'
  | 'agent.archived'
  | 'session.created'
  | 'session.updated'
  | 'session.archived'
  | 'session.event'
  | 'memory_store.created'
  | 'memory_store.updated'
  | 'memory_store.archived'
  | 'vault.created'
  | 'vault.updated'
  | 'vault.archived'
  | 'skill.created'
  | 'skill.deleted'
  | 'environment.created'
  | 'environment.updated'
  | 'environment.archived'
  | 'user_profile.created'
  | 'user_profile.updated'
  | 'webhook.created'
  | 'webhook.updated'
  | 'webhook.archived';

export type HermesTool = {
  type?: string;
  name?: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  [key: string]: unknown;
};

export type HermesMcpServer = {
  name?: string;
  url?: string;
  transport?: string;
  authorization?: Record<string, unknown>;
  [key: string]: unknown;
};

export type HermesMultiagentConfig = {
  enabled?: boolean;
  agents?: Array<Record<string, unknown>>;
  supervisor?: Record<string, unknown>;
  [key: string]: unknown;
};

export type HermesAgent = {
  id: string;
  org_id: string;
  version: number;
  name: string;
  description?: string | null;
  model: string;
  system?: string | null;
  tools: HermesTool[];
  skills: string[];
  mcp_servers: HermesMcpServer[];
  multiagent?: HermesMultiagentConfig | null;
  metadata: Record<string, unknown>;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type HermesSessionStatus = 'idle' | 'running' | 'requires_action' | 'archived' | 'error';

export type HermesSessionResource = {
  type?: string;
  id?: string;
  uri?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type HermesSession = {
  id: string;
  org_id: string;
  agent_id: string;
  agent_version?: number | null;
  environment_id?: string | null;
  vault_ids: string[];
  resources: HermesSessionResource[];
  title?: string | null;
  status: HermesSessionStatus;
  metadata: Record<string, unknown>;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type UserSentEvent =
  | { type: 'user.message'; message?: string; content?: string; [key: string]: unknown }
  | { type: 'user.interrupt'; reason?: string; [key: string]: unknown }
  | { type: 'user.tool_confirmation'; tool_use_id?: string; approved?: boolean; [key: string]: unknown }
  | { type: 'user.custom_tool_result'; tool_use_id?: string; result?: unknown; [key: string]: unknown }
  | { type: 'user.define_outcome'; outcome?: string; [key: string]: unknown };

export type HermesSessionEventData =
  | UserSentEvent
  | { type: 'agent.message'; content?: string; model?: string; [key: string]: unknown }
  | { type: 'agent.tool_result'; tool_use_id?: string; result?: unknown; [key: string]: unknown }
  | { type: 'span.model_request_start'; span_id?: string; model?: string; [key: string]: unknown }
  | { type: 'span.model_request_end'; span_id?: string; [key: string]: unknown }
  | { type: 'session.status_running'; [key: string]: unknown }
  | { type: 'session.status_idle'; stop_reason?: string; [key: string]: unknown }
  | { type: 'session.error'; error?: string; code?: string; [key: string]: unknown }
  | { type: string; [key: string]: unknown };

export type HermesSessionEvent = {
  id: string;
  org_id: string;
  session_id: string;
  event: HermesSessionEventData;
  created_at: string;
};

export type HermesSessionThread = {
  id: string;
  org_id: string;
  session_id: string;
  status: HermesSessionStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HermesMemoryStore = {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  metadata: Record<string, unknown>;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type HermesMemory = {
  id: string;
  org_id: string;
  store_id: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HermesVault = {
  id: string;
  org_id: string;
  display_name: string;
  metadata: Record<string, unknown>;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type HermesSkill = {
  id: string;
  org_id: string;
  display_title?: string | null;
  source: 'custom' | 'anthropic';
  file_ids: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HermesEnvironment = {
  id: string;
  org_id: string;
  name: string;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type HermesUserProfile = {
  id: string;
  org_id: string;
  external_id: string;
  name?: string | null;
  relationship?: 'owner' | 'member' | 'viewer' | 'external' | string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HermesWebhook = {
  id: string;
  org_id: string;
  url: string;
  events: WebhookEvent[];
  metadata: Record<string, unknown>;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};
