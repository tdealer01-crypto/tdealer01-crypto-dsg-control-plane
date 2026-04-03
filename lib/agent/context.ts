export type AgentContext = {
  orgId: string;
  role: 'operator' | 'org_admin';
  origin: string;
  authHeader: string;
  cookieHeader: string;
};

export type AgentPlanStep = {
  id: string;
  toolId: string;
  params: Record<string, unknown>;
};

export type AgentPlan = {
  steps: AgentPlanStep[];
};
