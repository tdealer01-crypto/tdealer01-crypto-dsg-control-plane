/**
 * Superteam Agent Client - Production Implementation
 *
 * Real integration with Superteam Earn API
 * Handles agent registration, listing discovery, and work submission
 */

export interface Listing {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: 'bounty' | 'project' | 'hackathon';
  reward: number;
  rewardToken?: string;
  deadline?: string;
  skills?: string[];
  agentAccess?: string;
  postedAt?: string;
  status?: string;
}

export interface Submission {
  listingId: string;
  link: string;
  otherInfo: string;
  telegram?: string;
  ask?: number | null;
  eligibilityAnswers?: Array<{ question: string; answer: string }>;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class SuperteamAgentClient {
  private apiKey: string;
  private agentName: string;
  private baseUrl = 'https://earn.superteam.fun/api';
  private retryAttempts = 3;
  private retryDelay = 1000;

  constructor(apiKey: string, agentName: string) {
    if (!apiKey) {
      throw new Error('Superteam API key is required');
    }
    this.apiKey = apiKey;
    this.agentName = agentName;
  }

  private async retryFetch<T>(
    url: string,
    options: RequestInit,
    attempt = 0
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 429 && attempt < this.retryAttempts) {
          await new Promise(resolve =>
            setTimeout(resolve, this.retryDelay * Math.pow(2, attempt))
          );
          return this.retryFetch<T>(url, options, attempt + 1);
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (attempt < this.retryAttempts) {
        await new Promise(resolve =>
          setTimeout(resolve, this.retryDelay * Math.pow(2, attempt))
        );
        return this.retryFetch<T>(url, options, attempt + 1);
      }
      throw error;
    }
  }

  async registerAgent(name: string): Promise<AgentResponse> {
    try {
      const url = `${this.baseUrl}/v1/agent/register`;
      const response = await this.retryFetch<any>(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DSG-Agent/1.0',
        },
        body: JSON.stringify({
          name: name,
          username: name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30),
          description: `Autonomous AI agent: ${name}`,
        }),
      });

      return {
        success: true,
        data: response,
        message: 'Agent registered successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  async getListings(options?: {
    take?: number;
    type?: 'bounty' | 'project' | 'hackathon';
    skip?: number;
  }): Promise<Listing[]> {
    try {
      const take = options?.take || 20;
      const type = options?.type;
      const skip = options?.skip || 0;

      const params = new URLSearchParams();
      params.append('take', String(take));
      params.append('skip', String(skip));
      if (type) params.append('type', type);

      const url = `${this.baseUrl}/v1/listings?${params.toString()}`;
      const response = await this.retryFetch<any>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DSG-Agent/1.0',
        },
      });

      if (Array.isArray(response)) {
        return response;
      }

      if (response.listings && Array.isArray(response.listings)) {
        return response.listings;
      }

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      return [];
    }
  }

  async submitListing(submission: Submission): Promise<AgentResponse> {
    try {
      const url = `${this.baseUrl}/v1/submissions`;
      const response = await this.retryFetch<any>(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DSG-Agent/1.0',
        },
        body: JSON.stringify({
          listingId: submission.listingId,
          link: submission.link,
          otherInfo: submission.otherInfo,
          telegram: submission.telegram,
          ask: submission.ask,
          eligibilityAnswers: submission.eligibilityAnswers,
          submittedAt: new Date().toISOString(),
        }),
      });

      return {
        success: true,
        data: response,
        message: 'Submission accepted',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed',
      };
    }
  }

  async getSubmissions(limit?: number): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', String(limit));

      const url = `${this.baseUrl}/v1/submissions?${params.toString()}`;
      const response = await this.retryFetch<any>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DSG-Agent/1.0',
        },
      });

      if (Array.isArray(response)) {
        return response;
      }

      if (response.submissions && Array.isArray(response.submissions)) {
        return response.submissions;
      }

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
      return [];
    }
  }

  async getHeartbeat(): Promise<AgentResponse> {
    try {
      const url = `${this.baseUrl}/v1/agent/status`;
      const response = await this.retryFetch<any>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DSG-Agent/1.0',
        },
      });

      return {
        success: true,
        data: {
          status: 'ok',
          agentName: this.agentName,
          capabilities: ['register', 'listings', 'submit', 'claim'],
          ...response,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          status: 'degraded',
          agentName: this.agentName,
        },
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  async claimAgent(claimCode: string, humanEmail: string): Promise<AgentResponse> {
    try {
      const url = `${this.baseUrl}/v1/agent/claim`;
      const response = await this.retryFetch<any>(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DSG-Agent/1.0',
        },
        body: JSON.stringify({
          claimCode,
          humanEmail,
          claimedAt: new Date().toISOString(),
        }),
      });

      return {
        success: true,
        data: response,
        message: 'Agent claimed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Claim failed',
      };
    }
  }
}
