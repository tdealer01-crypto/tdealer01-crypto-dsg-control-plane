/**
 * Trinity / DSG ONE API Client
 * Supports the legacy Trinity backend contract and a DSG ONE-native adapter mode.
 */

export type TrinityBackendMode = 'trinity' | 'dsg-one';

export interface TrinityClientConfig {
  apiUrl: string;
  jwtToken?: string;
  backendMode?: TrinityBackendMode;
}

export interface AgentStatusItem {
  id: string;
  name: string;
  role?: string;
  status: 'running' | 'idle' | 'error' | 'stopped';
  uptime?: string;
  reliability?: number;
  jobsProcessed?: number;
  cpuUsage?: number;
  mode?: 'sandbox' | 'live';
}

export interface TaskExecutionResult {
  success: boolean;
  result: string;
  duration: number;
  planHash?: string;
  gateDecision?: string;
  gateDecisionHash?: string;
  violations?: Array<{ message?: string; [key: string]: unknown }>;
  evidence?: Array<{ type: string; id: string; hash: string; timestamp: number }>;
}

export class TrinityClient {
  private apiUrl: string;
  private jwtToken?: string;
  private backendMode: TrinityBackendMode;

  constructor(config: TrinityClientConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.jwtToken = config.jwtToken;
    this.backendMode =
      config.backendMode ?? (process.env.DSG_ONE_API_URL ? 'dsg-one' : 'trinity');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.jwtToken) {
      headers.Authorization = `Bearer ${this.jwtToken}`;
    }

    const response = await fetch(`${this.apiUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Trinity API Error (${response.status}): ${response.statusText} - ${error}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private requireLegacyRoute(feature: string) {
    if (this.backendMode === 'dsg-one') {
      throw new Error(
        `${feature} is not mapped to a verified DSG ONE route yet; refusing to emulate it.`,
      );
    }
  }

  async health() {
    return this.request<{
      status: string;
      uptime: number;
      version: string;
      timestamp: string;
      database?: string;
    }>('/api/health');
  }

  async getAgentStatus(): Promise<{
    agents: AgentStatusItem[];
    total: number;
    healthy: number;
  }> {
    if (this.backendMode === 'dsg-one') {
      const response = await this.request<{
        items: Array<{
          agent_id: string;
          name: string;
          status: string;
          usage_this_month?: number;
        }>;
        pagination?: { total?: number };
      }>('/api/agents?per_page=50');

      const agents: AgentStatusItem[] = response.items.map((agent) => ({
        id: String(agent.agent_id),
        name: agent.name,
        role: 'DSG ONE agent',
        status:
          agent.status === 'disabled'
            ? 'stopped'
            : agent.status === 'error'
              ? 'error'
              : agent.status === 'active'
                ? 'running'
                : 'idle',
        jobsProcessed: agent.usage_this_month,
      }));

      return {
        agents,
        total: response.pagination?.total ?? agents.length,
        healthy: agents.filter((agent) => agent.status === 'running').length,
      };
    }

    return this.request<{
      agents: AgentStatusItem[];
      total: number;
      healthy: number;
    }>('/api/agents/status');
  }

  async setAgentMode(agentId: string, mode: 'sandbox' | 'live') {
    this.requireLegacyRoute('Agent mode switching');
    return this.request<{
      success: boolean;
      previousMode: string;
      newMode: string;
    }>('/api/agents/mode', {
      method: 'POST',
      body: JSON.stringify({ agentId, mode }),
    });
  }

  async executeTask(agentId: string, task: string): Promise<TaskExecutionResult> {
    if (this.backendMode === 'dsg-one') {
      const startedAt = Date.now();
      const response = await this.request<{
        success: boolean;
        planHash: string;
        gateDecision?: string;
        gateDecisionHash?: string;
        violations?: Array<{ message?: string; [key: string]: unknown }>;
        result?: {
          success: boolean;
          executedCommands?: Array<{ command: string; args: string[] }>;
          fileChanges?: Array<{ path: string; operation: string }>;
          evidence?: Array<{ type: string; id: string; hash: string; timestamp: number }>;
        };
        message: string;
      }>('/api/dsg/brain/execute', {
        method: 'POST',
        body: JSON.stringify({ input: task }),
      });

      const evidence = response.result?.evidence ?? [];
      const commandSummary = (response.result?.executedCommands ?? [])
        .map((entry) => [entry.command, ...entry.args].join(' '))
        .join('; ');

      return {
        success: response.success,
        result: commandSummary || response.message,
        duration: Date.now() - startedAt,
        planHash: response.planHash,
        gateDecision: response.gateDecision,
        gateDecisionHash: response.gateDecisionHash,
        violations: response.violations ?? [],
        evidence,
      };
    }

    return this.request<TaskExecutionResult>('/api/agents/execute', {
      method: 'POST',
      body: JSON.stringify({ agentId, task }),
    });
  }

  async chatWithAgent(agentId: string, message: string) {
    this.requireLegacyRoute('Agent chat');
    return this.request<{
      response: string;
      agentId: string;
      timestamp: string;
    }>('/api/agents/chat', {
      method: 'POST',
      body: JSON.stringify({ agentId, message }),
    });
  }

  async getCostTracker(period: '1h' | '24h' | '7d' = '24h') {
    this.requireLegacyRoute('Legacy Trinity cost tracker');
    return this.request<{
      total_usd: number;
      budget: {
        remaining_usd: number;
        used_percent: number;
      };
      by_agent: Array<{
        agent: string;
        cost: number;
      }>;
      period: string;
    }>(`/api/cost/tracker?period=${period}`);
  }

  async getSecurityAudit(limit: number = 10) {
    this.requireLegacyRoute('Legacy Trinity security audit');
    return this.request<{
      entries: Array<{
        id: string;
        timestamp: string;
        event: string;
        status: 'PASS' | 'WARN' | 'FAIL';
        risk_score: number;
        agent: string;
      }>;
      chain_valid: boolean;
    }>(`/api/security/audit?limit=${limit}`);
  }

  async getStateContinuity() {
    this.requireLegacyRoute('Legacy Trinity state continuity');
    return this.request<{
      all_agents_running: boolean;
      context_sharing: number;
      fragmentation_risk: number;
      cost_per_hour: number;
    }>('/api/state/continuity');
  }

  async login(username: string, password: string) {
    this.requireLegacyRoute('Legacy Trinity login');
    return this.request<{
      token: string;
      expiresIn: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  setToken(token: string) {
    this.jwtToken = token;
  }
}
