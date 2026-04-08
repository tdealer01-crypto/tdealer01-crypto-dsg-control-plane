export type ExecutorDispatchParams = {
  orgId: string;
  agentId: string;
  action: string;
  payload: Record<string, unknown>;
  effectId: string;
};

export type ExecutorDispatchResult = {
  provider: string;
  status: 'accepted' | 'completed';
  externalId?: string;
  callbackMode: 'webhook' | 'sync';
  metadata?: Record<string, unknown>;
};
