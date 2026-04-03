import type { RuntimeRole } from '../authz';

export type AgentExecutionContext = {
  orgId: string;
  role: RuntimeRole;
  origin: string;
  authHeaders?: {
    cookie?: string;
    authorization?: string;
  };
};
