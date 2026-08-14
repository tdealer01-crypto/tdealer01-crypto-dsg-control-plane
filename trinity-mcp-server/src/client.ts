/**
 * Trinity API Client
 * Handles all communication with Trinity Backend API
 */

export interface TrinityClientConfig {
  apiUrl: string;
  jwtToken?: string;
}

export class TrinityClient {
  private apiUrl: string;
  private jwtToken?: string;

  constructor(config: TrinityClientConfig) {
    this.apiUrl = config.apiUrl;
    this.jwtToken = config.jwtToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`;
    }

    const url = `${this.apiUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Trinity API Error (${response.status}): ${response.statusText} - ${error}`
      );
    }

    return response.json() as Promise<T>;
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

  async getAgentStatus() {
    return this.request<{
      agents: Array<{
        id: string;
        name: string;
        role: string;
        status: 'running' | 'idle' | 'error' | 'stopped';
        uptime: string;
        reliability: number;
        jobsProcessed: number;
        cpuUsage: number;
        mode: 'sandbox' | 'live';
      }>;
      total: number;
      healthy: number;
    }>('/api/agents/status');
  }

  async setAgentMode(agentId: string, mode: 'sandbox' | 'live') {
    return this.request<{
      success: boolean;
      previousMode: string;
      newMode: string;
    }>('/api/agents/mode', {
      method: 'POST',
      body: JSON.stringify({ agentId, mode }),
    });
  }

  async executeTask(agentId: string, task: string) {
    return this.request<{
      success: boolean;
      result: string;
      duration: number;
    }>('/api/agents/execute', {
      method: 'POST',
      body: JSON.stringify({ agentId, task }),
    });
  }

  async chatWithAgent(agentId: string, message: string) {
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
    return this.request<{
      all_agents_running: boolean;
      context_sharing: number;
      fragmentation_risk: number;
      cost_per_hour: number;
    }>('/api/state/continuity');
  }

  async login(username: string, password: string) {
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
