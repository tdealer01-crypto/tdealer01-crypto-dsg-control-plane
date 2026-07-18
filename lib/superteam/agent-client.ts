/**
 * Superteam Earn Agent API Client
 * Official spec: superteam.fun/skill.md
 */

const BASE_URL = 'https://superteam.fun';

export interface AgentRegistration {
  apiKey: string;
  claimCode: string;
  agentId: string;
  username: string;
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: 'bounty' | 'project' | 'hackathon';
  reward: number;
  rewardToken: string;
  status: 'open' | 'in_progress' | 'closed';
  deadline?: string;
  skills: string[];
  agentAccess: 'AGENT_ALLOWED' | 'AGENT_ONLY' | 'HUMAN_ONLY';
  eligibilityQuestions?: Array<{ question: string; required: boolean }>;
  compensationType?: 'flat' | 'range' | 'variable';
}

export interface Submission {
  listingId: string;
  link: string;
  tweet?: string;
  otherInfo: string;
  eligibilityAnswers?: Array<{ question: string; answer: string }>;
  ask?: number | null;
  telegram?: string;
}

export interface Comment {
  refType: 'BOUNTY' | 'PROJECT' | 'HACKATHON';
  refId: string;
  message: string;
  replyToId?: string;
  replyToUserId?: string;
  pocId?: string;
}

export interface AgentHeartbeat {
  status: 'ok' | 'degraded' | 'blocked';
  agentName: string;
  time: string;
  version: string;
  capabilities: string[];
  lastAction: string;
  nextAction: string;
}

class SuperteamAgentClient {
  private apiKey: string;
  private baseUrl: string = BASE_URL;
  private agentName: string;

  constructor(apiKey: string, agentName: string) {
    this.apiKey = apiKey;
    this.agentName = agentName;
  }

  private getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async registerAgent(name: string): Promise<AgentRegistration> {
    const response = await fetch(`${this.baseUrl}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error(`Agent registration failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getListings(options?: {
    take?: number;
    deadline?: string;
    type?: 'bounty' | 'project' | 'hackathon';
  }): Promise<Listing[]> {
    const params = new URLSearchParams();
    if (options?.take) params.append('take', options.take.toString());
    if (options?.deadline) params.append('deadline', options.deadline);
    if (options?.type) params.append('type', options.type);

    const url = `${this.baseUrl}/api/agents/listings/live${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch listings: ${response.statusText}`);
    }

    return response.json();
  }

  async getListingDetails(slug: string): Promise<Listing> {
    const response = await fetch(
      `${this.baseUrl}/api/agents/listings/details/${slug}`,
      { headers: this.getAuthHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch listing: ${response.statusText}`);
    }

    return response.json();
  }

  async submitListing(submission: Submission) {
    const response = await fetch(
      `${this.baseUrl}/api/agents/submissions/create`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(submission),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Submission failed: ${error}`);
    }

    return response.json();
  }

  async updateSubmission(submission: Submission) {
    const response = await fetch(
      `${this.baseUrl}/api/agents/submissions/update`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(submission),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update failed: ${error}`);
    }

    return response.json();
  }

  async getComments(
    listingId: string,
    options?: { skip?: number; take?: number }
  ) {
    const params = new URLSearchParams();
    if (options?.skip) params.append('skip', options.skip.toString());
    if (options?.take) params.append('take', options.take.toString());

    const url = `${this.baseUrl}/api/agents/comments/${listingId}${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }

    return response.json();
  }

  async postComment(comment: Comment) {
    const response = await fetch(
      `${this.baseUrl}/api/agents/comments/create`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(comment),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to post comment: ${response.statusText}`);
    }

    return response.json();
  }

  getHeartbeat(): AgentHeartbeat {
    return {
      status: 'ok',
      agentName: this.agentName,
      time: new Date().toISOString(),
      version: 'earn-agent-mvp',
      capabilities: ['register', 'listings', 'submit', 'claim'],
      lastAction: 'monitoring listings',
      nextAction: 'discovering opportunities',
    };
  }
}

export { SuperteamAgentClient };
