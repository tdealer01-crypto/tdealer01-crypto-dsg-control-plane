export type RemoteActionKind =
  | 'observe'
  | 'navigate'
  | 'pointer.move'
  | 'pointer.click'
  | 'pointer.scroll'
  | 'keyboard.type'
  | 'keyboard.press'
  | 'browser.screenshot';

export interface RemoteAction {
  kind: RemoteActionKind;
  payload?: Record<string, unknown>;
}

export interface RemoteExecutionContext {
  executionId: string;
  planHash: string;
  agentId: string;
}

export interface RemoteActionEnvelope {
  version: 'dsg.remote-action.v1';
  requestId: string;
  sessionId: string;
  execution: RemoteExecutionContext;
  action: RemoteAction;
  issuedAt: string;
}

export interface RemoteEndpointResult {
  ok: boolean;
  state?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  error?: string;
}

export interface RemoteSessionRecord {
  id: string;
  org_id: string;
  user_id: string;
  endpoint_ciphertext: string;
  endpoint_iv: string;
  status: 'ACTIVE' | 'DISABLED' | 'EXPIRED';
  plan_hash: string;
  execution_id: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}
